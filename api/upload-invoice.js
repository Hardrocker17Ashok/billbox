import process from "node:process";
import { Buffer } from "node:buffer";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/* =====================================
   CLOUDFLARE R2 CONFIGURATION
===================================== */

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

/* =====================================
   VERCEL CONFIGURATION
===================================== */

export const config = {
  maxDuration: 60,
};

/* =====================================
   PDF GENERATION + R2 UPLOAD
===================================== */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  let browser;

  try {
    /* =====================================
       RECEIVE INVOICE HTML
    ===================================== */

    const html = req.body?.html;

    if (
      typeof html !== "string" ||
      !html.includes("print-invoice")
    ) {
      return res.status(400).json({
        success: false,
        error: "Invoice HTML is missing or invalid",
      });
    }

    // Maximum HTML payload: 3 MB
    if (Buffer.byteLength(html, "utf8") > 3 * 1024 * 1024) {
      return res.status(413).json({
        success: false,
        error: "Invoice content is too large",
      });
    }

    /* =====================================
       CHECK R2 ENVIRONMENT VARIABLES
    ===================================== */

    if (
      !process.env.R2_ENDPOINT ||
      !process.env.R2_ACCESS_KEY_ID ||
      !process.env.R2_SECRET_ACCESS_KEY ||
      !process.env.R2_BUCKET_NAME
    ) {
      throw new Error("R2 environment variables are missing");
    }

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

    // Apply browser print media CSS
    await page.emulateMediaType("print");

    /* =====================================
       LOAD INVOICE HTML
    ===================================== */

    await page.setContent(html, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    // Wait for fonts and images
    await page.evaluate(async () => {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      await Promise.all(
        Array.from(document.images).map((img) => {
          if (img.complete) {
            return Promise.resolve();
          }

          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );
    });

    /* =====================================
       GENERATE A4 PDF
    ===================================== */

    const pdfData = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
    });

    // Convert Uint8Array into Node.js Buffer
    const pdfBuffer = Buffer.from(pdfData);

    // Validate PDF header
    if (
      !pdfBuffer.length ||
      pdfBuffer.subarray(0, 5).toString("ascii") !== "%PDF-"
    ) {
      throw new Error("Chromium did not generate a valid PDF");
    }

    console.log(
      "PDF generated successfully:",
      pdfBuffer.length,
      "bytes"
    );

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

    console.log("PDF uploaded successfully:", fileName);

    /* =====================================
       GENERATE SIGNED PDF URL
    ===================================== */

    const pdfUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
      }),
      {
        expiresIn: 60 * 60 * 24 * 7,
      }
    );

    /* =====================================
       SUCCESS RESPONSE
    ===================================== */

    return res.status(200).json({
      success: true,
      message: "Invoice PDF generated and uploaded successfully",
      fileName,
      pdfUrl,
    });

  } catch (error) {
    console.error(
      "Invoice PDF render/upload error:",
      error?.message,
      error?.stack
    );

    return res.status(500).json({
      success: false,
      error: "PDF render or upload failed",
      details:
        process.env.NODE_ENV === "development"
          ? error?.message
          : undefined,
    });

  } finally {
    if (browser) {
      await browser.close().catch((error) => {
        console.error("Chromium close error:", error);
      });
    }
  }
}
