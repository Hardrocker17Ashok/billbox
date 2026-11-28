import "./PendingBills.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { flushSync } from "react-dom";
import { onAuthStateChanged } from "firebase/auth";

import {
  arrayUnion, collection, doc, getDoc, getDocs, query, updateDoc, where,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import PageLoader from "../components/PageLoader";

/* =====================================
   INVOICE PDF API RESPONSE HANDLER
   Same PDF generation flow as New Bill.
===================================== */
async function generateInvoicePdf(invoiceHtml) {
  let response;

  try {
    response = await fetch("/api/upload-invoice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ html: invoiceHtml }),
    });
  } catch (error) {
    throw new Error(`API_UNAVAILABLE: ${error?.message || "Network request failed"}`, { cause: error });
  }

  const contentType = response.headers.get("content-type") || "";
  const responseText = await response.text();

  if (contentType.includes("text/html") || response.status === 404) {
    throw new Error(
      `API_ROUTE_NOT_FOUND: Invoice API returned HTTP ${response.status}. ` +
      "Run the project with `npx vercel dev` from the project root, " +
      "or verify that api/upload-invoice.js is in the Vercel project root."
    );
  }

  let result;
  try {
    result = responseText ? JSON.parse(responseText) : null;
  } catch (error) {
    throw new Error(
      `API_INVALID_RESPONSE: Invoice API returned non-JSON data ` +
      `(HTTP ${response.status}, Content-Type: ${contentType || "unknown"}). ` +
      responseText.slice(0, 250),
      { cause: error }
    );
  }

  if (!result || typeof result !== "object") {
    throw new Error(`API_EMPTY_RESPONSE: Invoice API returned an empty response (HTTP ${response.status}).`);
  }

  if (!response.ok || result.success !== true) {
    throw new Error(result.details || result.error || `Invoice API failed with HTTP ${response.status}.`);
  }

  const pdfUrl = result.pdfUrl || result.previewUrl;
  if (typeof pdfUrl !== "string" || !pdfUrl.trim()) {
    throw new Error("Invoice API succeeded but did not return pdfUrl or previewUrl.");
  }

  return pdfUrl;
}

function getInvoiceApiUserMessage(error, language = "en") {
  const message = String(error?.message || "");

  if (
    message.includes("API_ROUTE_NOT_FOUND") ||
    message.includes("API_UNAVAILABLE") ||
    message.includes("API_INVALID_RESPONSE") ||
    message.includes("API_EMPTY_RESPONSE")
  ) {
    return language === "hi"
      ? "Invoice API route nahi mil raha."
      : "The invoice API route is unavailable.";
  }

  if (message.includes("TAX_INVOICE_SAVE_FAILED")) {
    return language === "hi"
      ? "पक्का बिल सेव नहीं हो सका। कृपया दोबारा प्रयास करें।"
      : "Tax invoice could not be saved. Please try again.";
  }

  return language === "hi"
    ? `बिल PDF तैयार नहीं हो सकी। कारण: ${message || "अज्ञात त्रुटि"}`
    : `Unable to prepare the invoice PDF. Reason: ${message || "Unknown error"}`;
}

const DEFAULT_PROFILE = {
  shopName: "BillBox", ownerName: "", phone: "", alternatePhone: "",
  address: "", gstNumber: "", gstRate: null, logoUrl: "", tagline: "", language: "hi", theme: "dark",
};
const TEXT = {
  hi: {
    page: "बकाया बिल", heading: "जमा राशि प्राप्त करें", dashboard: "डैशबोर्ड",
    subtitle: "जिन बिलों की राशि बाकी है, उन्हें यहाँ देखें और भुगतान प्राप्त करें।",
    search: "ग्राहक, मोबाइल या बिल नंबर खोजें", bill: "बिल नंबर", customer: "ग्राहक",
    date: "तारीख", total: "कुल राशि", paid: "पहले जमा", balance: "बाकी राशि",
    action: "बिल खोलें", empty: "कोई बकाया बिल नहीं मिला।", receive: "जमा राशि प्राप्त करें",
    method: "भुगतान का तरीका", cash: "नकद", upi: "UPI", bank: "बैंक ट्रांसफर",
    cheque: "चेक", note: "नोट / UPI रेफरेंस (वैकल्पिक)", collect: "पूरी बाकी राशि जमा करें",
    cancel: "रद्द करें", items: "आभूषण का विवरण", quantity: "मात्रा", weight: "वजन",
    rate: "दर", amount: "राशि", previously: "पहले जमा राशि", now: "आज जमा राशि",
    totalPaid: "कुल जमा राशि", due: "बाकी राशि", status: "भुगतान स्थिति",
    paidStatus: "भुगतान पूरा", print: "अपडेटेड बिल प्रिंट करें", saving: "सेव हो रहा है...",
    success: "भुगतान सफलतापूर्वक सेव हो गया।", fail: "भुगतान सेव नहीं हुआ। कृपया दोबारा प्रयास करें।",
    noLogin: "कृपया पहले लॉगिन करें।", refresh: "रिफ्रेश", outstanding: "कुल बकाया",
    count: "बिल", received: "प्राप्त राशि", noPopup: "पॉप-अप ब्लॉक है। कृपया पॉप-अप allow करें।",
    billTitle: "आभूषण का विवरण", customerDetails: "ग्राहक का विवरण", shopDetails: "दुकान का विवरण",
    name: "नाम", number: "नंबर", jewellers: "ज्वेलर्स", trust: "विश्वास", purity: "शुद्धता",
    beauty: "सुंदरता", making: "मेकिंग चार्ज", makingTotal: "कुल मेकिंग", other: "अन्य चार्ज",
    otherTotal: "कुल अन्य चार्ज", discount: "छूट", gst: "GST", gstTotal: "कुल GST",
    allItems: "सभी वस्तुओं की राशि", subtotal: "उप-योग", grand: "कुल राशि",
    thanks: "हमारे साथ खरीदारी करने के लिए धन्यवाद।", thanksDesc: "आपके विश्वास के लिए धन्यवाद। पुनः पधारें।",
    signature: "अधिकृत हस्ताक्षर", gstin: "GSTIN", billType: "बिल का प्रकार",
    estimate: "अनुमान / टैक्स इनवॉइस नहीं", taxInvoice: "टैक्स इनवॉइस", time: "समय",
    item: "आभूषण", hsn: "HSN", sku: "SKU", huid: "HUID", receivedNow: "अभी प्राप्त",
    gstinRequired: "पक्का बिल बनाने के लिए दुकान का GSTIN आवश्यक है। कृपया Profile → Shop Settings में जाकर GST Number अपडेट करें, फिर दोबारा पक्का बिल बनाएँ।",
  },
  en: {
    page: "Pending Bills", heading: "Receive Payment", dashboard: "Dashboard",
    subtitle: "Review outstanding invoices and collect the remaining payment here.",
    search: "Search customer, mobile or bill number", bill: "Bill number", customer: "Customer",
    date: "Date", total: "Grand total", paid: "Previously paid", balance: "Balance due",
    action: "Open bill", empty: "No pending bills found.", receive: "Receive Payment",
    method: "Payment method", cash: "Cash", upi: "UPI", bank: "Bank transfer",
    cheque: "Cheque", note: "Note / UPI reference (optional)", collect: "Collect full outstanding amount",
    cancel: "Cancel", items: "Jewellery Details", quantity: "Quantity", weight: "Weight",
    rate: "Rate", amount: "Amount", previously: "Previously paid", now: "Received now",
    totalPaid: "Total paid", due: "Balance due", status: "Payment status",
    paidStatus: "Paid", print: "Print updated bill", saving: "Saving...",
    success: "Payment saved successfully.", fail: "Payment could not be saved. Please try again.",
    noLogin: "Please log in first.", refresh: "Refresh", outstanding: "Total outstanding",
    count: "bills", received: "Received", noPopup: "Pop-up blocked. Please allow pop-ups.",
    billTitle: "Jewellery Details", customerDetails: "Customer Details", shopDetails: "Shop Details",
    name: "Name", number: "Number", jewellers: "JEWELLERS", trust: "Trust", purity: "Purity",
    beauty: "Beauty", making: "Making charges", makingTotal: "Total Making", other: "Other charges",
    otherTotal: "Total Other Charges", discount: "Discount", gst: "GST", gstTotal: "Total GST",
    allItems: "Items Amount", subtotal: "Subtotal", grand: "Grand Total",
    thanks: "Thank you for shopping with us.", thanksDesc: "We appreciate your trust. Please visit again.",
    signature: "Authorized Signature", gstin: "GSTIN", billType: "Bill Type",
    estimate: "Estimate / Not a Tax Invoice", taxInvoice: "Tax Invoice", time: "Time",
    item: "Jewellery", hsn: "HSN", sku: "SKU", huid: "HUID", receivedNow: "Received now",
    gstinRequired: "Shop GSTIN is required to create a Pakka Bill. Please go to Profile → Shop Settings, update the GST Number, and then create the Pakka Bill again.",
  },
};
const money = (value, digits = 2) => (Number(value) || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: digits });
const toDate = (value) => {
  if (!value) return null;
  const date = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const dateText = (value, language) => toDate(value)?.toLocaleDateString(language === "hi" ? "hi-IN" : "en-IN") || "-";
const totalOf = (b) => Number(b.grandTotal ?? b.totalAmount ?? b.payment?.total ?? 0) || 0;
const paidOf = (b) => Number(b.paidAmount ?? b.amountPaid ?? b.payment?.paid ?? 0) || 0;
const balanceOf = (b) => Math.max(0, Number(b.balanceDue ?? b.balanceAmount ?? b.payment?.balance ?? (totalOf(b) - paidOf(b))) || 0);

function PendingBills() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [method, setMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [printTarget, setPrintTarget] = useState(null);
  const [afterPrintBill, setAfterPrintBill] = useState(null);
  const [billTypeChoiceOpen, setBillTypeChoiceOpen] = useState(false);
  const [whatsAppBill, setWhatsAppBill] = useState(null);
  const [whatsAppMobile, setWhatsAppMobile] = useState("");
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const whatsAppWindowRef = useRef(null);
  const language = profile.language === "en" ? "en" : "hi";
  const theme = profile.theme === "light" ? "light" : "dark";
  const t = TEXT[language];

  const loadBills = useCallback(async (currentUser = user) => {
    if (!currentUser?.uid) { setLoading(false); return; }
    setLoading(true);
    try {
      const [billSnap, shopSnap] = await Promise.all([
        getDocs(query(collection(db, "bills"), where("ownerId", "==", currentUser.uid))),
        getDoc(doc(db, "shops", currentUser.uid)),
      ]);
      const rows = billSnap.docs.map(s => ({ id: s.id, ...s.data() }))
        .filter(b => balanceOf(b) > 0.009)
        .sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0));
      setBills(rows);
      if (shopSnap.exists()) setProfile({ ...DEFAULT_PROFILE, ...shopSnap.data() });
    } catch (error) {
      console.error("Pending bills load failed:", error);
      setMessage(language === "hi" ? "बकाया बिल लोड नहीं हो सके।" : "Unable to load pending bills.");
    } finally { setLoading(false); }
  }, [user, language]);

  useEffect(() => onAuthStateChanged(auth, async current => {
    setUser(current); setAuthReady(true);
    if (current) await loadBills(current);
    else setLoading(false);
  }), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bills;
    return bills.filter(b => [b.billNumber, b.invoiceNo, b.customerName, b.customerMobile]
      .some(v => String(v || "").toLowerCase().includes(q)));
  }, [bills, search]);
  const outstanding = bills.reduce((sum, b) => sum + balanceOf(b), 0);

  const receivePayment = async () => {
    if (!selected || saving || !user) return;
    const due = balanceOf(selected);
    if (due <= 0.009) return;
    setSaving(true); setMessage("");
    const previousPaid = paidOf(selected);
    const newPaid = previousPaid + due;
    const newBalance = Math.max(0, totalOf(selected) - newPaid);
    const paymentEntry = {
      amount: due, method, note: note.trim(),
      receivedAt: new Date().toISOString(),
      receivedBy: user.uid,
    };
    try {
      await updateDoc(doc(db, "bills", selected.id), {
        paidAmount: newPaid, amountPaid: newPaid,
        balanceDue: newBalance, balanceAmount: newBalance,
        paymentStatus: "paid",
        "payment.total": totalOf(selected),
        "payment.paid": newPaid, "payment.balance": newBalance, "payment.status": "paid",
        paymentEntries: arrayUnion(paymentEntry),
        lastPaymentReceived: due, lastPaymentMethod: method, lastPaymentNote: note.trim(),
        lastPaymentAt: new Date().toISOString(),
      });
      const updated = {
        ...selected, paidAmount: newPaid, amountPaid: newPaid,
        balanceDue: newBalance, balanceAmount: newBalance, paymentStatus: "paid",
        payment: { ...(selected.payment || {}), total: totalOf(selected), paid: newPaid, balance: newBalance, status: "paid" },
        paymentEntries: [...(selected.paymentEntries || []), paymentEntry],
        lastPaymentReceived: due, lastPaymentMethod: method, lastPaymentNote: note.trim(),
        previousPaidBeforeLastPayment: previousPaid,
      };
      setSelected(updated);
      setBills(old => old.filter(b => b.id !== selected.id));
      setMessage(t.success);
    } catch (error) {
      console.error("Pending bill payment save failed:", error);
      setMessage(t.fail);
    } finally { setSaving(false); }
  };

  const printBill = async (bill, requestedType = "estimate") => {
    // Open the tab synchronously from the user's tap/click. This is required
    // for iPhone/iPad Chrome and Safari popup policies.
    let pdfWindow = null;

    try {
      pdfWindow = window.open("about:blank", "_blank");
      if (!pdfWindow) throw new Error("POPUP_BLOCKED");

      pdfWindow.document.open();
      pdfWindow.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>BillBox</title>
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#111;color:#f5f0e6;font-family:Arial,sans-serif;text-align:center}
.card{padding:30px}.spinner{width:38px;height:38px;margin:22px auto;border:3px solid #494237;border-top-color:#c6a15b;border-radius:50%;animation:spin .8s linear infinite}
p{color:#aaa49a;font-size:14px}@keyframes spin{to{transform:rotate(360deg)}}
</style></head><body><main class="card"><strong>BILLBOX</strong><div class="spinner"></div><p>${language === "hi" ? "आपका बिल PDF तैयार हो रहा है..." : "Preparing your invoice PDF..."}</p></main></body></html>`);
      pdfWindow.document.close();

      let invoice = { ...bill, billType: requestedType };

    if (requestedType === "tax") {
      // Only the GSTIN saved in Profile > Shop Settings is accepted.
      // Do not prompt for or save GSTIN from this Pending Bills screen.
      const gstin = String(profile.gstNumber || "").trim().toUpperCase();
      if (!gstin) {
        if (pdfWindow && !pdfWindow.closed) pdfWindow.close();
        window.alert(t.gstinRequired);
        return;
      }

      // GST rate is optional here. Preserve an existing rate when available;
      // otherwise use 0 and allow the invoice to be generated.
      const savedGstRate = profile.gstRate ?? bill.gstRate ?? bill.shopGstRate;
      const gstRate = savedGstRate === null || savedGstRate === undefined || savedGstRate === ""
        ? 0
        : Number(savedGstRate);

      if (!Number.isFinite(gstRate) || gstRate < 0 || gstRate > 100) {
        if (pdfWindow && !pdfWindow.closed) pdfWindow.close();
        window.alert(language === "hi" ? "दुकान की GST दर सही नहीं है। कृपया Profile → Shop Settings में जाँचें।" : "The shop GST rate is invalid. Please check Profile → Shop Settings.");
        return;
      }

      const sourceItems = Array.isArray(bill.items) && bill.items.length
        ? bill.items
        : [{
          itemName: bill.itemName || "-",
          metal: bill.metal || "",
          carat: bill.carat || "",
          quantity: bill.quantity || 1,
          weight: bill.weight || 0,
          rate: bill.rate || 0,
          amount: bill.amount || bill.itemAmount || 0,
          totalAmount: bill.amount || bill.itemAmount || 0,
          hsnCode: bill.hsnCode || "",
        }];

      const taxItems = [];
      for (let index = 0; index < sourceItems.length; index += 1) {
        const item = sourceItems[index];
        // HSN is optional for Pakka Bill. Preserve it when already available,
        // but never prompt for it or block invoice generation when it is blank.
        const hsnCode = String(item.hsnCode || "").trim();

        const metalValue = Number(item.chargesBreakdown?.metalValue ?? item.amount ?? item.itemAmount ?? 0);
        const makingValue = Number(item.chargesBreakdown?.makingTotal ?? item.makingCharges ?? 0);
        const otherValue = Number(item.chargesBreakdown?.otherTotal ?? item.otherCharges ?? 0);
        const taxableAmount = metalValue + makingValue + otherValue;
        const itemGstRate = Number(item.gstRate) > 0 ? Number(item.gstRate) : gstRate;
        const itemGstAmount = taxableAmount * (itemGstRate / 100);
        const lineTotal = taxableAmount + itemGstAmount;

        taxItems.push({
          ...item,
          hsnCode,
          gstRate: itemGstRate,
          gstAmount: itemGstAmount,
          taxableAmount,
          totalAmount: lineTotal,
          lineTotal,
        });
      }

      const discount = Number(bill.offer ?? bill.discount ?? 0);
      const taxableSubtotal = taxItems.reduce((sum, item) => sum + Number(item.taxableAmount || 0), 0);
      const subtotal = Math.max(0, taxableSubtotal - discount);
      const gstAmount = taxItems.reduce((sum, item) => sum + Number(item.gstAmount || 0), 0);
      const grandTotal = subtotal + gstAmount;
      const paid = paidOf(bill);
      const balance = Math.max(0, grandTotal - paid);
      const paymentStatus = balance <= 0.009 ? "paid" : paid > 0 ? "partial" : "due";

      invoice = {
        ...bill,
        items: taxItems,
        billType: "tax",
        billTypeLabel: language === "hi" ? "टैक्स इनवॉइस" : "Tax Invoice",
        shopGstNumber: gstin,
        shopGstRate: gstRate,
        gstRate,
        gstEnabled: gstAmount > 0,
        gstAmount,
        subtotal,
        grandTotal,
        totalAmount: grandTotal,
        paidAmount: paid,
        amountPaid: paid,
        balanceDue: balance,
        balanceAmount: balance,
        paymentStatus,
        payment: {
          ...(bill.payment || {}),
          total: grandTotal,
          paid,
          balance,
          status: paymentStatus,
        },
      };

      try {
        // Update only this bill. Shop GST settings are managed from Profile > Shop Settings.
        const invoiceData = { ...invoice };
        delete invoiceData.id;
        await updateDoc(doc(db, "bills", bill.id), {
          ...invoiceData,
          taxInvoiceCreatedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Tax invoice update failed:", error);
        throw new Error("TAX_INVOICE_SAVE_FAILED", { cause: error });
      }

      if (balance > 0.009) {
        setBills((current) => current.some((row) => row.id === invoice.id) ? current : [invoice, ...current]);
      }
    } else {
      invoice = {
        ...bill,
        billType: "estimate",
        billTypeLabel: language === "hi" ? "अनुमान / टैक्स इनवॉइस नहीं" : "Estimate / Not a Tax Invoice",
      };
    }

      // Render the existing invoice component before capturing its HTML.
      setSelected(invoice);
      flushSync(() => setPrintTarget(invoice));

      const invoiceHtml = createInvoiceHtmlDocument();
      const pdfUrl = await generateInvoicePdf(invoiceHtml);

      // Show the hosted PDF in the tab opened directly from the user action.
      pdfWindow.location.replace(pdfUrl);

      // Preserve the existing WhatsApp follow-up, without depending on
      // window.print()/afterprint (which does not work consistently on iOS).
      setAfterPrintBill(null);
      setWhatsAppBill(invoice);
      setWhatsAppMobile(invoice.customerMobile || "");
    } catch (error) {
      console.error("Pending bill PDF generation failed:", error);
      if (pdfWindow && !pdfWindow.closed) pdfWindow.close();
      setPrintTarget(null);
      setAfterPrintBill(null);

      if (error?.message === "POPUP_BLOCKED") {
        window.alert(t.noPopup);
      } else {
        window.alert(getInvoiceApiUserMessage(error, language));
      }
    }
  };

  useEffect(() => {
    const afterPrint = () => {
      if (afterPrintBill) {
        setWhatsAppBill(afterPrintBill);
        setWhatsAppMobile(afterPrintBill.customerMobile || "");
      }
    };
    window.addEventListener("afterprint", afterPrint);
    return () => window.removeEventListener("afterprint", afterPrint);
  }, [afterPrintBill]);


  const createInvoiceHtmlDocument = () => {
    const invoice = document.querySelector(".print-invoice");

    if (!invoice) {
      throw new Error("Invoice element not found");
    }

    const clone = invoice.cloneNode(true);
    clone.style.display = "flex";

    // Load the original CSS files instead of copying cssRules.
    const stylesheetLinks = Array.from(
      document.querySelectorAll('link[rel="stylesheet"]')
    )
      .map((link) => link.href)
      .filter(Boolean);

    // Also preserve dynamically injected inline styles.
    const inlineStyles = Array.from(document.querySelectorAll("style"))
      .map((style) => style.innerHTML)
      .join("\n");

    return `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<base href="${window.location.origin}/" />

${stylesheetLinks
        .map((href) => `<link rel="stylesheet" href="${href}">`)
        .join("\n")}

<style>
${inlineStyles}

html, body {
  margin: 0 !important;
  padding: 0 !important;
  width: 100% !important;
  background: #fff !important;
}

body {
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

.new-bill-page {
  width: 100% !important;
  min-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  background: #fff !important;
}

.new-bill-page .print-invoice {
  display: flex !important;
  width: 194mm !important;
  max-width: 194mm !important;
  margin: 0 auto !important;
  background: #fff !important;
  color: #181716 !important;
}

@page {
  size: A4 portrait;
  margin: 8mm;
}
</style>
</head>
<body>
<div class="new-bill-page bill-theme-${theme}">
${clone.outerHTML}
</div>
</body>
</html>`;
  };


  const closeWhatsAppPrompt = () => {
    setWhatsAppBill(null);
    setPrintTarget(null);
    setAfterPrintBill(null);
    if (whatsAppWindowRef.current && !whatsAppWindowRef.current.closed) {
      whatsAppWindowRef.current.close();
    }
    whatsAppWindowRef.current = null;
  };

  const sendBillOnWhatsApp = async () => {
    if (!whatsAppBill || sendingWhatsApp) return;
    const digits = String(whatsAppMobile || "").replace(/\D/g, "");
    const normalizedMobile =
      digits.startsWith("91") && digits.length === 12 ? digits.slice(2) :
        digits.startsWith("0") && digits.length === 11 ? digits.slice(1) : digits;

    if (!/^[6-9]\d{9}$/.test(normalizedMobile)) {
      window.alert(language === "hi" ? "कृपया मान्य 10 अंकों का WhatsApp नंबर दर्ज करें।" : "Please enter a valid 10-digit Indian WhatsApp number.");
      return;
    }

    const whatsappWindow = window.open("about:blank", "_blank");
    if (!whatsappWindow) {
      window.alert(language === "hi" ? "WhatsApp खोलने के लिए pop-ups allow करें।" : "Please allow pop-ups to open WhatsApp.");
      return;
    }
    whatsAppWindowRef.current = whatsappWindow;
    setSendingWhatsApp(true);

    try {
      whatsappWindow.document.open();
      whatsappWindow.document.write(`<!doctype html><html><head><title>BillBox</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#101114;color:#f7f3ea;font-family:Arial,sans-serif}.card{text-align:center;padding:36px 28px}.spinner{width:42px;height:42px;border:3px solid #39352c;border-top-color:#c6a15b;border-radius:50%;margin:28px auto;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}</style></head><body><main class="card"><b>BILLBOX</b><div class="spinner"></div><p>${language === "hi" ? "आपका PDF तैयार हो रहा है..." : "Preparing your invoice PDF..."}</p></main></body></html>`);
      whatsappWindow.document.close();

      const uploadResponse = await fetch("/api/upload-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: createInvoiceHtmlDocument() }),
      });
      const uploadResult = await uploadResponse.json();

      if (!uploadResponse.ok || !uploadResult.success || !uploadResult.pdfUrl) {
        throw new Error(
          uploadResult.error ||
          uploadResult.details ||
          "PDF upload failed"
        );
      }

      if (normalizedMobile !== whatsAppBill.customerMobile) {
        updateDoc(doc(db, "bills", whatsAppBill.id), { customerMobile: normalizedMobile })
          .catch((error) => console.error("Customer mobile update failed:", error));
      }

      const total = totalOf(whatsAppBill);
      const paid = paidOf(whatsAppBill);
      const balance = balanceOf(whatsAppBill);
      const previewUrl = uploadResult.pdfUrl;
      const messageText = language === "hi"
        ? [
          `नमस्ते ${whatsAppBill.customerName || ""} जी 🙏`,
          `आपका ${whatsAppBill.billType === "tax" ? "पक्का टैक्स बिल" : "कच्चा बिल"} ${whatsAppBill.billNumber || whatsAppBill.invoiceNo || ""} तैयार है।`,
          "",
          `कुल राशि: ₹${money(total)}`,
          `जमा राशि: ₹${money(paid)}`,
          `बाकी राशि: ₹${money(balance)}`,
          "",
          `बिल देखें:\n${previewUrl}`,
          "",
          `धन्यवाद!\n${whatsAppBill.shopName || profile.shopName}`,
        ].join("\n")
        : [
          `Hello ${whatsAppBill.customerName || ""},`,
          `Your ${whatsAppBill.billType === "tax" ? "tax invoice" : "estimate"} ${whatsAppBill.billNumber || whatsAppBill.invoiceNo || ""} is ready.`,
          "",
          `Total: ₹${money(total)}`,
          `Paid: ₹${money(paid)}`,
          `Balance: ₹${money(balance)}`,
          "",
          `View bill:\n${previewUrl}`,

          "",
          `Regards,\n${whatsAppBill.shopName || profile.shopName}`,
        ].join("\n");

      whatsappWindow.location.replace(`https://wa.me/91${normalizedMobile}?text=${encodeURIComponent(messageText)}`);
      setWhatsAppBill(null);
      setPrintTarget(null);
      setAfterPrintBill(null);
      whatsAppWindowRef.current = null;
    } catch (error) {
      console.error("Pending bill WhatsApp send failed:", error);
      if (!whatsappWindow.closed) whatsappWindow.close();
      whatsAppWindowRef.current = null;
      window.alert(language === "hi" ? "PDF अपलोड या WhatsApp तैयार नहीं हो सका। कृपया दोबारा प्रयास करें।" : "Could not prepare the PDF or WhatsApp. Please try again.");
    } finally {
      setSendingWhatsApp(false);
    }
  };


  if (!authReady || loading) return <PageLoader loading={true} message={language === "hi" ? "बकाया बिल लोड हो रहे हैं..." : "Loading pending bills..."} fullScreen={true} />;
  if (!user) return <div className={`new-bill-page bill-theme-${theme}`}><div className="bill-profile-error"><h2>{t.noLogin}</h2><button className="print-bill" onClick={() => navigate("/login")}>{t.noLogin}</button></div></div>;

  return <div className={`new-bill-page bill-theme-${theme}`} data-theme={theme} data-language={language}>
    <header className="sales-header">
      <div className="sales-brand">
        {profile.logoUrl ? <img src={profile.logoUrl} alt={profile.shopName} onError={e => { e.currentTarget.style.display = "none"; }} /> : <div className="sales-brand-fallback">{String(profile.shopName || "B").trim().charAt(0).toUpperCase()}</div>}
        <div><span>{profile.shopName}</span><strong>{language === "hi" ? "आभूषण बिलिंग" : "JEWELLERY BILLING"}</strong></div>
      </div>
      <button type="button" className="sales-back" onClick={() => navigate("/dashboard")}>← {t.dashboard}</button>
    </header>

    <main className="bill-container">
      <div className="page-heading"><div><span>{t.page}</span><h2>{t.heading}</h2></div><div className="bill-date"><span>{t.date}</span><strong>{new Date().toLocaleDateString(language === "hi" ? "hi-IN" : "en-IN")}</strong></div></div>
      <section className="section-card pending-list-card">
        <div className="section-heading"><span>01</span><div><h3>{t.page}</h3><p>{t.subtitle}</p></div></div>
        <div className="pending-toolbar"><input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search} /><button type="button" onClick={() => loadBills(user)}>↻ {t.refresh}</button></div>
        <div className="pending-summary"><div><span>{t.outstanding}</span><strong>₹ {money(outstanding)}</strong></div><div><span>{t.count}</span><strong>{bills.length}</strong></div></div>
        {message && <div className="pending-message" role="status">{message}</div>}
        {filtered.length === 0 ? <div className="message">{t.empty}</div> : <div className="pending-table-wrap"><table className="pending-table"><thead><tr><th>{t.bill}</th><th>{t.customer}</th><th>{t.date}</th><th>{t.total}</th><th>{t.paid}</th><th>{t.balance}</th><th></th></tr></thead><tbody>
          {filtered.map(b => <tr key={b.id}><td><strong>{b.billNumber || b.invoiceNo || b.id}</strong></td><td><strong>{b.customerName || "-"}</strong><small>{b.customerMobile || ""}</small></td><td>{dateText(b.createdAt, language)}</td><td>₹ {money(totalOf(b))}</td><td>₹ {money(paidOf(b))}</td><td className="pending-due">₹ {money(balanceOf(b))}</td><td><button className="pending-open" onClick={() => { setSelected(b); setMethod("cash"); setNote(""); setMessage(""); }}>{t.action} →</button></td></tr>)}
        </tbody></table></div>}
      </section>
    </main>

    {printTarget && (() => {
      const bill = printTarget;
      const rows = Array.isArray(bill.items) ? bill.items : [{
        itemName: bill.itemName || "-", metal: bill.metal || "", carat: bill.carat || "",
        quantity: bill.quantity || 1, weight: bill.weight || 0, rate: bill.rate || 0,
        amount: bill.amount || 0, totalAmount: bill.amount || 0,
      }];
      const currentReceived = Number(bill.lastPaymentReceived || 0);
      const previouslyPaid = Math.max(0, paidOf(bill) - currentReceived);
      const baseAmount = rows.reduce((sum, line) => sum + Number(line.chargesBreakdown?.metalValue ?? line.amount ?? 0), 0);
      const makingAmount = Number(bill.makingCharges || 0);
      const otherAmount = Number(bill.otherCharges || 0);
      const discountAmount = Number(bill.offer ?? bill.discount ?? 0);
      const gstAmount = Number(bill.gstAmount || 0);
      return <div className="print-invoice">
        <div className="print-header">
          <div className="print-shop">
            {(bill.shopLogoUrl || profile.logoUrl) && <img src={bill.shopLogoUrl || profile.logoUrl} alt={bill.shopName || profile.shopName} />}
            <div><h1>{bill.shopName || profile.shopName}</h1><p>{language === "hi" ? "ज्वेलर्स" : "JEWELLERS"}</p><span>{t.trust} • {t.purity} • {t.beauty}</span></div>
          </div>
          <div className="print-bill-info">
            <div><span>{t.bill}</span><strong>{bill.billNumber || bill.invoiceNo || bill.id}</strong><small>{bill.billType === "tax" ? t.taxInvoice : t.estimate}</small></div>
            <div><span>{t.date}</span><strong>{dateText(bill.createdAt, language)}</strong><small>{t.time}: {new Date().toLocaleTimeString(language === "hi" ? "hi-IN" : "en-IN", { hour: "2-digit", minute: "2-digit" })}</small></div>
          </div>
        </div>
        <div className="print-line" />
        <div className="print-info-grid">
          <div className="print-info-box"><h3>{t.customerDetails}</h3>
            <p className="customer-detail"><strong>{t.name}</strong><span>-</span><b>{bill.customerName || "-"}</b></p>
            <p className="customer-detail"><strong>{t.number}</strong><span>-</span><b>{bill.customerMobile || "-"}</b></p>
          </div>
          <div className="print-info-box shop-details"><h3>{t.shopDetails}</h3><strong>{bill.shopName || profile.shopName}</strong>
            {(bill.shopPhone || profile.phone) && <p>{bill.shopPhone || profile.phone}{(bill.shopAlternatePhone || profile.alternatePhone) ? `, ${bill.shopAlternatePhone || profile.alternatePhone}` : ""}</p>}
            {(bill.shopGstNumber || profile.gstNumber) && <p className="shop-gstin">{t.gstin}: <span>{bill.shopGstNumber || profile.gstNumber}</span></p>}
          </div>
        </div>
        <div className="print-section-title">{t.billTitle}</div>
        <div className="print-items-list">
          {rows.map((line, index) => {
            const detail = {
              metalValue: Number(line.chargesBreakdown?.metalValue ?? line.amount ?? 0),
              makingValue: Number(line.chargesBreakdown?.makingTotal ?? line.makingCharges ?? 0),
              otherValue: Number(line.chargesBreakdown?.otherTotal ?? line.otherCharges ?? 0),
              gstRate: Number(line.gstRate || bill.gstRate || 0),
              gstAmount: Number(line.gstAmount || 0),
              total: Number(line.totalAmount ?? line.lineTotal ?? 0),
            };
            const codes = [line.hsnCode ? `HSN ${line.hsnCode}` : "", line.skuCode ? `SKU ${line.skuCode}` : "", line.huid ? `HUID ${line.huid}` : ""].filter(Boolean);
            return <div className="print-item-box" key={index}>
              <div className="print-item-main print-item-cell"><span className="print-cell-label">{t.item}</span><div className="print-item-name-wrap"><h3>{String(index + 1).padStart(2, "0")} · {line.itemName || "-"}</h3><p>{line.metal === "gold" ? `Gold${line.carat ? ` · ${line.carat}` : ""}` : line.metal === "silver" ? "Silver" : ""}</p></div></div>
              <div className="print-item-cell"><span className="print-cell-label">{t.quantity}</span><strong>{line.quantity}</strong></div>
              <div className="print-item-cell"><span className="print-cell-label">{t.weight}</span><strong>{line.weight}g</strong></div>
              <div className="print-item-cell"><span className="print-cell-label">{t.rate}</span><strong>₹{money(line.rate, 0)}</strong></div>
              {line.metal === "gold" && <div className="print-item-cell"><span className="print-cell-label">{t.purity}</span><strong>{line.carat}</strong></div>}
              <div className="print-item-cell"><span className="print-cell-label">{t.allItems}</span><strong>₹{money(detail.metalValue)}</strong></div>
              {detail.makingValue > 0 && <div className="print-item-cell"><span className="print-cell-label">{t.making}</span><strong>₹{money(detail.makingValue)}</strong></div>}
              {detail.otherValue > 0 && <div className="print-item-cell"><span className="print-cell-label">{t.other}</span><strong>₹{money(detail.otherValue)}</strong></div>}
              {detail.gstAmount > 0 && <div className="print-item-cell print-item-gst"><span className="print-cell-label">{t.gst} ({detail.gstRate}%)</span><strong>₹{money(detail.gstAmount)}</strong></div>}
              {codes.length > 0 && <div className="print-item-cell print-item-codes"><span className="print-cell-label">HSN / SKU / HUID</span><strong>{codes.join(" · ")}</strong></div>}
              <div className="print-item-line-total print-item-cell"><span className="print-cell-label">{t.grand}</span><strong>₹{money(detail.total)}</strong></div>
            </div>;
          })}
        </div>
        <div className="print-summary-wrap">
          <div className="print-charge-strip">
            <div><span>{t.makingTotal}</span><strong>₹ {money(makingAmount)}</strong></div>
            <div><span>{t.otherTotal}</span><strong>₹ {money(otherAmount)}</strong></div>
            <div><span>{t.discount}</span><strong>− ₹ {money(discountAmount)}</strong></div>
            {gstAmount > 0 && <div><span>{t.gstTotal}</span><strong>₹ {money(gstAmount)}</strong></div>}
          </div>
          <div className="print-amount-section">
            <div className="print-amount-row"><span>{t.allItems}</span><strong>₹ {money(baseAmount)}</strong></div>
            <div className="print-subtotal"><span>{t.subtotal}</span><strong>₹ {money(Number(bill.subtotal ?? (totalOf(bill) - gstAmount)))}</strong></div>
            {gstAmount > 0 && <div className="print-amount-row"><span>{t.gst}</span><strong>₹ {money(gstAmount)}</strong></div>}
            <div className="print-grand-total"><span>{t.grand}</span><strong>₹ {money(totalOf(bill))}</strong></div>
            <div className="print-payment-box">
              <div><span>{t.previously}</span><strong>₹ {money(previouslyPaid)}</strong></div>
              <div><span>{t.receivedNow}</span><strong>₹ {money(currentReceived)}</strong></div>
              <div><span>{t.totalPaid}</span><strong>₹ {money(paidOf(bill))}</strong></div>
              <div><span>{t.due}</span><strong>₹ {money(balanceOf(bill))}</strong></div>
            </div>
          </div>
        </div>
        <div className="print-footer"><div><strong>{t.thanks}</strong><p>{t.thanksDesc}</p></div><div className="print-signature"><div /><span>{t.signature}</span></div></div>
        <div className="print-bottom"><strong>{bill.shopName || profile.shopName}</strong>
          {(bill.shopTagline || profile.tagline) && <span>{bill.shopTagline || profile.tagline}</span>}
          {(bill.shopAddress || profile.address) && <span>{bill.shopAddress || profile.address}</span>}
          {(bill.shopPhone || profile.phone) && <span>{bill.shopPhone || profile.phone}</span>}
          {(bill.shopGstNumber || profile.gstNumber) && <span>{t.gstin}: {bill.shopGstNumber || profile.gstNumber}</span>}
        </div>
      </div>;
    })()}

    {selected && <div className="pending-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
      <section className="pending-modal section-card" role="dialog" aria-modal="true">
        <div className="pending-modal-head"><div><span>{t.bill}</span><h2>{selected.billNumber || selected.invoiceNo || selected.id}</h2></div><button onClick={() => setSelected(null)}>×</button></div>
        <div className="pending-customer-row"><div><small>{t.customer}</small><strong>{selected.customerName || "-"}</strong><span>{selected.customerMobile || "-"}</span></div><div><small>{t.date}</small><strong>{dateText(selected.createdAt, language)}</strong></div></div>
        <h3 className="pending-subheading">{t.items}</h3>
        <div className="pending-item-list">{(selected.items || [{ itemName: selected.itemName || "-", quantity: selected.quantity || 1, weight: selected.weight || 0, rate: selected.rate || 0, totalAmount: selected.amount || 0 }]).map((line, i) => <div className="pending-item-row" key={i}><div><strong>{line.itemName || "-"}</strong><small>{line.metal || ""} {line.carat || ""}</small></div><span>{t.quantity}: {line.quantity ?? 1}</span><span>{t.weight}: {line.weight ?? "-"}g</span><strong>₹ {money(line.totalAmount ?? line.lineTotal ?? line.amount ?? 0)}</strong></div>)}</div>
        <div className="pending-payment-breakup"><div><span>{t.total}</span><strong>₹ {money(totalOf(selected))}</strong></div><div><span>{t.previously}</span><strong>₹ {money(paidOf(selected))}</strong></div><div className="pending-balance-row"><span>{t.balance}</span><strong>₹ {money(balanceOf(selected))}</strong></div></div>
        {balanceOf(selected) > 0.009 ? <div className="pending-collect-box"><div className="pending-collect-heading"><div><small>{t.receive}</small><strong>₹ {money(balanceOf(selected))}</strong></div><span>{t.status}: {paidOf(selected) > 0 ? (language === "hi" ? "आंशिक भुगतान" : "Partially paid") : (language === "hi" ? "बकाया" : "Due")}</span></div>
          <div className="pending-form-grid"><label>{t.method}<select value={method} onChange={e => setMethod(e.target.value)}><option value="cash">{t.cash}</option><option value="upi">{t.upi}</option><option value="bank">{t.bank}</option><option value="cheque">{t.cheque}</option></select></label><label>{t.note}<input value={note} onChange={e => setNote(e.target.value)} placeholder={language === "hi" ? "रेफरेंस नंबर या नोट" : "Reference number or note"} /></label></div>
          <div className="pending-modal-actions"><button className="pending-cancel" onClick={() => setSelected(null)}>{t.cancel}</button><button className="print-bill" disabled={saving} onClick={receivePayment}>{saving ? t.saving : `₹ ${money(balanceOf(selected))} · ${t.collect}`}</button></div>
        </div> : <div className="pending-paid-note">✓ {t.paidStatus}<button className="print-bill" onClick={() => setBillTypeChoiceOpen(true)}>{t.print} →</button></div>}
        {message && <div className="pending-message">{message}</div>}
      </section>
    </div>}
    {billTypeChoiceOpen && selected && <div className="pending-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setBillTypeChoiceOpen(false); }}>
      <section className="pending-modal section-card pending-choice-modal" role="dialog" aria-modal="true">
        <div className="pending-modal-head"><div><span>{t.billType}</span><h2>{language === "hi" ? "बिल का प्रकार चुनें" : "Choose bill type"}</h2></div><button type="button" onClick={() => setBillTypeChoiceOpen(false)}>×</button></div>
        <p className="pending-choice-description">{language === "hi" ? "कच्चा बिल अनुमान के रूप में बनेगा। पक्का बिल बनाने के लिए केवल दुकान का GSTIN अनिवार्य है, जो Profile → Shop Settings में अपडेट किया जा सकता है। GST दर उपलब्ध न होने पर भी बिल बनेगा। HSN वैकल्पिक है।" : "The estimate is created as a non-tax invoice. Only the shop GSTIN is required for a Pakka Bill; update it under Profile → Shop Settings. The bill can still be created if no GST rate is saved. HSN is optional."}</p>
        <div className="pending-modal-actions pending-choice-actions">
          <button type="button" className="pending-cancel" onClick={() => { setBillTypeChoiceOpen(false); printBill(selected, "estimate"); }}>{language === "hi" ? "कच्चा बिल" : "Kaccha Bill"}</button>
          <button type="button" className="print-bill" onClick={() => { setBillTypeChoiceOpen(false); printBill(selected, "tax"); }}>{language === "hi" ? "पक्का बिल (GST)" : "Pakka Bill (GST)"}</button>
        </div>
      </section>
    </div>}

    {whatsAppBill && <div className="pending-modal-backdrop" onClick={e => { if (e.target === e.currentTarget && !sendingWhatsApp) closeWhatsAppPrompt(); }}>
      <section className="pending-modal section-card pending-whatsapp-modal" role="dialog" aria-modal="true">
        <div className="pending-modal-head"><div><span>WHATSAPP</span><h2>{language === "hi" ? "बिल WhatsApp पर भेजें" : "Send bill on WhatsApp"}</h2></div><button type="button" disabled={sendingWhatsApp} onClick={closeWhatsAppPrompt}>×</button></div>
        <p className="pending-choice-description">{language === "hi" ? "बिल प्रिंट या PDF सेव करने के बाद ग्राहक को WhatsApp पर भेजें।" : "Your bill is ready. Send the PDF links to the customer on WhatsApp."}</p>
        <label className="pending-whatsapp-label">{language === "hi" ? "ग्राहक का WhatsApp नंबर" : "Customer WhatsApp number"}
          <div className="pending-whatsapp-input"><span>+91</span><input value={whatsAppMobile} onChange={e => setWhatsAppMobile(e.target.value)} inputMode="numeric" placeholder="10 digit mobile number" maxLength={14} /></div>
        </label>
        <div className="pending-modal-actions">
          <button type="button" className="pending-cancel" disabled={sendingWhatsApp} onClick={closeWhatsAppPrompt}>{language === "hi" ? "अभी नहीं" : "Not now"}</button>
          <button type="button" className="print-bill" disabled={sendingWhatsApp} onClick={sendBillOnWhatsApp}>{sendingWhatsApp ? (language === "hi" ? "भेजने की तैयारी..." : "Preparing...") : (language === "hi" ? "WhatsApp पर भेजें" : "Send on WhatsApp")}</button>
        </div>
      </section>
    </div>}

    <footer className="shop-footer"><strong>{profile.shopName}</strong>{profile.tagline && <span>{profile.tagline}</span>}{profile.address && <span>{profile.address}</span>}{profile.phone && <span>{profile.phone}</span>}</footer>
  </div>;
}
export default PendingBills;
