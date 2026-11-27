import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/* =====================================
   VERCEL FUNCTION CONFIGURATION
===================================== */

export const config = {
  maxDuration: 60,
  api: {
    bodyParser: {
      sizeLimit: "4mb",
    },
  },
};

/* =====================================
   RESPONSE HELPERS
===================================== */

function sendJson(res, statusCode, payload) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(statusCode).json(payload);
}

function getMissingR2Variables() {
  return [
    "R2_ENDPOINT",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
  ].filter((name) => !process.env[name]);
}

function createR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

/* =====================================
   PDF GENERATION + CLOUDFLARE R2 UPLOAD
===================================== */

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  // API health check
  if (req.method === "GET") {
    return sendJson(res, 200, {
      success: true,
      message:
        "Invoice API route is available. Send a POST request to generate a PDF.",
      route: "/api/upload-invoice",
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");

    return sendJson(res, 405, {
      success: false,
      error: "Method not allowed",
    });
  }

  let browser = null;
  let s3 = null;

  try {
    /* =====================================
       READ REQUEST BODY
    ===================================== */

    let body = req.body;

    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        return sendJson(res, 400, {
          success: false,
          error: "Request body contains invalid JSON",
        });
      }
    }

    const html = body?.html;

    if (
      typeof html !== "string" ||
      !html.trim() ||
      !html.includes("print-invoice")
    ) {
      return sendJson(res, 400, {
        success: false,
        error: "Invoice HTML is missing or invalid",
      });
    }

    /* =====================================
       VALIDATE HTML SIZE
    ===================================== */

    const htmlSize = Buffer.byteLength(html, "utf8");

    if (htmlSize > 3 * 1024 * 1024) {
      return sendJson(res, 413, {
        success: false,
        error: "Invoice HTML is larger than the allowed 3 MB limit",
      });
    }

    /* =====================================
       VALIDATE R2 ENVIRONMENT
    ===================================== */

    const missingVariables = getMissingR2Variables();

    if (missingVariables.length > 0) {
      throw new Error(
        `Missing Vercel environment variables: ${missingVariables.join(", ")}`
      );
    }

    s3 = createR2Client();

    /* =====================================
       LAUNCH CHROMIUM
    ===================================== */

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: {
        width: 1200,
        height: 1600,
        deviceScaleFactor: 1,
      },
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();

    await page.setViewport({
      width: 1200,
      height: 1600,
      deviceScaleFactor: 1,
    });

    // Apply @media print rules from NewBill.css
    await page.emulateMediaType("print");

    page.setDefaultNavigationTimeout(30000);
    page.setDefaultTimeout(30000);

    /* =====================================
       LOAD INVOICE HTML
    ===================================== */

    await page.setContent(html, {
      waitUntil: "load",
      timeout: 30000,
    });

    /* =====================================
       WAIT FOR FONTS AND IMAGES
    ===================================== */

    await page.evaluate(async () => {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const images = Array.from(document.images);

      await Promise.all(
        images.map((img) => {
          if (img.complete) {
            return Promise.resolve();
          }

          return new Promise((resolve) => {
            const finish = () => resolve();

            img.addEventListener("load", finish, { once: true });
            img.addEventListener("error", finish, { once: true });

            // Broken remote images should not block invoice generation.
            setTimeout(finish, 10000);
          });
        })
      );
    });

    /* =====================================
       VERIFY INVOICE ELEMENT
    ===================================== */

    const invoiceExists = await page.$(".print-invoice");

    if (!invoiceExists) {
      throw new Error(
        "The supplied HTML does not contain a visible .print-invoice element"
      );
    }

    /* =====================================
       GENERATE A4 PDF
    ===================================== */

    const pdfData = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
    });

    const pdfBuffer = Buffer.from(pdfData);

    if (
      !pdfBuffer.length ||
      pdfBuffer.subarray(0, 5).toString("ascii") !== "%PDF-"
    ) {
      throw new Error("Chromium did not generate a valid PDF");
    }

    console.log("Invoice PDF generated:", pdfBuffer.length, "bytes");

    /* =====================================
       UPLOAD PDF TO CLOUDFLARE R2
    ===================================== */

    const fileName = `invoices/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 9)}.pdf`;

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: pdfBuffer,
        ContentType: "application/pdf",
        CacheControl: "private, max-age=0, no-cache",
      })
    );

    console.log("Invoice PDF uploaded to R2:", fileName);

    /* =====================================
       GENERATE SIGNED URL
    ===================================== */

    const pdfUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        ResponseContentType: "application/pdf",
        ResponseContentDisposition: "inline",
      }),
      {
        expiresIn: 60 * 60 * 24 * 7,
      }
    );

    /* =====================================
       SUCCESS RESPONSE
    ===================================== */

    return sendJson(res, 200, {
      success: true,
      message: "Invoice PDF generated and uploaded successfully",
      fileName,
      pdfUrl,
      previewUrl: pdfUrl,
    });

  } catch (error) {
    console.error(
      "Invoice PDF render/upload error:",
      error?.message,
      error?.stack
    );

    return sendJson(res, 500, {
      success: false,
      error: "PDF render or upload failed",
      details: error?.message || "Unknown server error",
    });

  } finally {
    if (browser) {
      try {
        await browser.close();
        console.log("Chromium browser closed");
      } catch (closeError) {
        console.error(
          "Chromium close error:",
          closeError?.message || closeError
        );
      }
    }

    if (s3) {
      s3.destroy();
    }
  }
}