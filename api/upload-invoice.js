import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
/* global process, Buffer */
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const chunks = [];

    for await (const chunk of req) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);

    if (!buffer.length || buffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({
        error: "Invalid PDF or file exceeds 10 MB",
      });
    }

    if (buffer.subarray(0, 5).toString() !== "%PDF-") {
      return res.status(400).json({
        error: "Only PDF files are allowed",
      });
    }

    const fileName = `invoices/${Date.now()}.pdf`;

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: "application/pdf",
      })
    );

    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileName,
    });

    const pdfUrl = await getSignedUrl(s3, command, {
      expiresIn: 60 * 60 * 24 * 7,
    });

    return res.status(200).json({
      success: true,
      pdfUrl,
    });
  } catch (error) {
    console.error("R2 Upload Error:", error);

    return res.status(500).json({
      error: "PDF upload failed",
    });
  }
}