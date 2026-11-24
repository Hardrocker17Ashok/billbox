
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/* ================================
   CLOUDFLARE R2 CONFIGURATION
================================ */

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

/* ================================
   VERCEL CONFIGURATION
================================ */

export const config = {
  maxDuration: 60,
};

/* ================================
   PDF GENERATION + R2 UPLOAD
================================ */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  let browser;

  try {
    // Receive invoice HTML from NewBill.jsx
    const html = req.body?.html;

    if (
      typeof html !== "string" ||
      !html.includes("print-invoice")
    ) {
      return res.status(400).json({
        error: "Invoice HTML is missing or invalid",
      });
    }

    // Maximum HTML payload: 3 MB
    if (Buffer.byteLength(html, "utf8") > 3 * 1024 * 1024) {
      return res.status(413).json({
        error: "Invoice content is too large",
      });
    }

    // Check R2 environment variables
    if (
      !process.env.R2_ENDPOINT ||
      !process.env.R2_ACCESS_KEY_ID ||
      !process.env.R2_SECRET_ACCESS_KEY ||
      !process.env.R2_BUCKET_NAME
    ) {
      throw new Error("R2 environment variables are missing");
    }

    /* ================================
       LAUNCH CHROMIUM
    ================================= */

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

    // Apply the same print media rules as browser printing
    await page.emulateMediaType("print");

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

    /* ================================
       GENERATE A4 PDF
    ================================= */

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
    });

    if (
      !pdfBuffer?.length ||
      pdfBuffer.subarray(0, 5).toString() !== "%PDF-"
    ) {
      throw new Error("Chromium did not generate a valid PDF");
    }

    /* ================================
       UPLOAD PDF TO CLOUDFLARE R2
    ================================= */

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

    /* ================================
       GENERATE PDF LINK
    ================================= */

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

    return res.status(200).json({
      success: true,
      pdfUrl,
    });

  } catch (error) {
    console.error("Invoice PDF render/upload error:", error);

    return res.status(500).json({
      error: "PDF render or upload failed",
    });

  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
