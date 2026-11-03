
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

function getFirebaseAdmin() {
  if (getApps().length) return getApps()[0];

  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT
  );

  return initializeApp({
    credential: cert(serviceAccount),
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    if (
      !process.env.FIREBASE_SERVICE_ACCOUNT ||
      !process.env.RESEND_API_KEY ||
      !process.env.BILLBOX_ADMIN_EMAIL
    ) {
      throw new Error("Required environment variables are missing");
    }

    const adminApp = getFirebaseAdmin();
    const adminAuth = getAuth(adminApp);
    const db = getFirestore(adminApp);

    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring(7)
      : "";

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const shopRef = db.collection("shops").doc(uid);
    const shopSnapshot = await shopRef.get();

    if (!shopSnapshot.exists) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    const shop = shopSnapshot.data();

    if (shop.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Shop is not pending",
      });
    }

    if (shop.registrationNotificationSentAt) {
      return res.status(200).json({
        success: true,
        message: "Notification already sent",
      });
    }

    const safe = (value) =>
      String(value || "-").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char]);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "BillBox <onboarding@resend.dev>",
        to: [process.env.BILLBOX_ADMIN_EMAIL],
        subject: "New Shop Registration - BillBox",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;color:#222">
            <h2 style="color:#172554">New Shop Registration</h2>
            <p>A new shop has registered on BillBox and is waiting for verification.</p>
            <table style="border-collapse:collapse;width:100%">
              <tr><td style="padding:10px;border:1px solid #ddd"><b>Shop Name</b></td><td style="padding:10px;border:1px solid #ddd">${safe(shop.shopName)}</td></tr>
              <tr><td style="padding:10px;border:1px solid #ddd"><b>Owner Email</b></td><td style="padding:10px;border:1px solid #ddd">${safe(shop.email)}</td></tr>
              <tr><td style="padding:10px;border:1px solid #ddd"><b>Username</b></td><td style="padding:10px;border:1px solid #ddd">${safe(shop.username)}</td></tr>
              <tr><td style="padding:10px;border:1px solid #ddd"><b>Address</b></td><td style="padding:10px;border:1px solid #ddd">${safe(shop.address)}</td></tr>
              <tr><td style="padding:10px;border:1px solid #ddd"><b>Status</b></td><td style="padding:10px;border:1px solid #ddd">Pending Verification</td></tr>
              <tr><td style="padding:10px;border:1px solid #ddd"><b>Shop UID</b></td><td style="padding:10px;border:1px solid #ddd">${safe(uid)}</td></tr>
            </table>
            <p style="margin-top:24px">Please review this registration and activate the shop when approved.</p>
            <p style="color:#64748b;font-size:12px">BillBox · Powered by TechSez</p>
          </div>
        `,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend error:", emailResult);
      return res.status(502).json({
        success: false,
        message: "Email delivery failed",
        error: emailResult,
      });
    }

    await shopRef.update({
      registrationNotificationSentAt: FieldValue.serverTimestamp(),
    });

    return res.status(200).json({
      success: true,
      message: "Registration notification sent",
    });
  } catch (error) {
    console.error("Registration email error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to send registration notification",
    });
  }
}
