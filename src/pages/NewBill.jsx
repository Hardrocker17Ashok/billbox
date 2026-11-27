import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { flushSync } from "react-dom";
import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import PageLoader from "../components/PageLoader";
import "./NewBill.css";

/* =====================================
   INVOICE PDF API RESPONSE HANDLER
   Works with Vercel API JSON responses
   and reports local Vite/API routing errors.
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
    throw new Error(
      `API_UNAVAILABLE: ${error?.message || "Network request failed"}`
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const responseText = await response.text();

  // Vite's normal dev server does not execute Vercel /api functions.
  // It may return index.html (sometimes with HTTP 200) instead of JSON.
  if (
    contentType.includes("text/html") ||
    response.status === 404
  ) {
    throw new Error(
      `API_ROUTE_NOT_FOUND: Invoice API returned HTTP ${response.status}. ` +
      "Run the project with `npx vercel dev` from the project root, " +
      "or verify that api/upload-invoice.js is in the Vercel project root."
    );
  }

  let result;

  try {
    result = responseText ? JSON.parse(responseText) : null;
  } catch {
    throw new Error(
      `API_INVALID_RESPONSE: Invoice API returned non-JSON data ` +
      `(HTTP ${response.status}, Content-Type: ${contentType || "unknown"}). ` +
      responseText.slice(0, 250)
    );
  }

  if (!result || typeof result !== "object") {
    throw new Error(
      `API_EMPTY_RESPONSE: Invoice API returned an empty response (HTTP ${response.status}).`
    );
  }

  if (!response.ok || result.success !== true) {
    throw new Error(
      result.details ||
      result.error ||
      `Invoice API failed with HTTP ${response.status}.`
    );
  }

  const pdfUrl = result.pdfUrl || result.previewUrl;

  if (typeof pdfUrl !== "string" || !pdfUrl.trim()) {
    throw new Error(
      "Invoice API succeeded but did not return pdfUrl or previewUrl."
    );
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
      ? "Invoice API route nahi mil raha. Localhost par normal `npm run dev` ki jagah project root se `npx vercel dev` chalao aur Vercel ke diye hue localhost URL ko open karo. Production mein `api/upload-invoice.js` file project root ke api folder mein honi chahiye."
      : "The invoice API route is unavailable. For local testing, run `npx vercel dev` from the project root instead of `npm run dev`, then open the localhost URL shown by Vercel. In production, keep `api/upload-invoice.js` inside the project-root api folder.";
  }

  return language === "hi"
    ? `बिल PDF तैयार नहीं हो सकी। कारण: ${message || "अज्ञात त्रुटि"}`
    : `Unable to prepare the invoice PDF. Reason: ${message || "Unknown error"}`;
}

const DEFAULT_PROFILE = {
  shopName: "BillBox",
  ownerName: "",
  phone: "",
  alternatePhone: "",
  address: "",
  gstNumber: "",
  gstRate: null,
  logoUrl: "",
  tagline: "",
  language: "hi",
  theme: "dark",
};

const TEXT = {
  hi: {
    pageTitle: "नया बिल",
    createBill: "बिल बनाएँ",
    dashboard: "डैशबोर्ड",
    collection: "आभूषण बिलिंग",
    date: "तारीख",
    customerInfo: "ग्राहक की जानकारी",
    customerInfoDesc: "ग्राहक की जानकारी दर्ज करें",
    customerName: "ग्राहक का नाम",
    customerNamePlaceholder: "ग्राहक का नाम दर्ज करें",
    mobile: "ग्राहक का WhatsApp नंबर",
    mobilePlaceholder: "ग्राहक का WhatsApp नंबर दर्ज करें",
    chooseJewellery: "आभूषण चुनें",
    chooseJewelleryDesc: "सोना या चाँदी चुनें",
    gold: "सोना",
    silver: "चाँदी",
    goldJewellery: "सोने के आभूषण",
    silverJewellery: "चाँदी के आभूषण",
    itemType: "आभूषण का प्रकार",
    selectItem: "आभूषण चुनें",
    purity: "शुद्धता",
    selectCarat: "कैरेट चुनें",
    quantity: "मात्रा",
    weight: "वजन",
    gram: "ग्राम",
    rate: "दर",
    per10Gram: "प्रति 10 ग्राम",
    perKg: "प्रति किलो",
    enterRate: "दर दर्ज करें",
    previousRate: "पहले से ₹",
    rateAvailable: "इसकी दर पहले से उपलब्ध है।",
    addItem: "आइटम जोड़ें",
    addedItems: "बिल में जोड़े गए आभूषण",
    addedItemsDesc: "एक जैसी कीमत, चार्ज और टैक्स सेटिंग वाले समान आभूषण साथ जुड़ते हैं।",
    pieces: "नग",
    removeItem: "आइटम हटाएँ",
    billingDetails: "बिल की अतिरिक्त जानकारी",
    billingDetailsDesc: "बनाने का शुल्क और छूट पूरे बिल पर एक बार लागू होगी।",
    making: "मेकिंग चार्ज / नग (₹)",
    wholeBill: "पूरे बिल पर",
    offer: "छूट / ऑफर",
    addItemFirst: "पहले कम से कम एक आभूषण बिल में जोड़ें।",
    gst: "GST",
    applyGst: "इस बिल पर GST लगाएँ",
    gstOn: "GST चालू",
    gstOff: "GST बंद",
    allItems: "सभी वस्तुओं की राशि",
    subtotal: "उप-योग",
    total: "कुल राशि",
    print: "बिल प्रिंट करें",
    printing: "प्रिंट हो रहा है...",
    printTitle: "आभूषण का विवरण",
    customerDetails: "ग्राहक का विवरण",
    shopDetails: "दुकान का विवरण",
    name: "नाम",
    number: "नंबर",
    billNumber: "बिल नंबर",
    time: "समय",
    thanks: "हमारे साथ खरीदारी करने के लिए धन्यवाद।",
    thanksDesc: "आपके विश्वास के लिए धन्यवाद। पुनः पधारें।",
    signature: "अधिकृत हस्ताक्षर",
    trust: "विश्वास",
    purityFooter: "शुद्धता",
    beauty: "सुंदरता",
    preparing: "आपका बिलिंग पेज तैयार हो रहा है...",
    loadingProfile: "दुकान की जानकारी लोड हो रही है...",
    loginRequired: "कृपया पहले लॉगिन करें।",
    profileError: "दुकान की जानकारी लोड नहीं हो पाई।",
    customerRequired: "कृपया ग्राहक का नाम दर्ज करें।",
    mobileRequired: "कृपया ग्राहक का मोबाइल नंबर दर्ज करें।",
    itemRequired: "कृपया कम से कम एक आभूषण बिल में जोड़ें।",
    chooseMetalItem: "कृपया आभूषण और उसका प्रकार चुनें।",
    choosePurity: "कृपया शुद्धता (कैरेट) चुनें।",
    weightRequired: "कृपया सही वजन दर्ज करें।",
    rateRequired: "कृपया सही दर दर्ज करें।",
    quantityRequired: "कृपया सही मात्रा दर्ज करें।",
    offerInvalid: "छूट उप-योग से अधिक नहीं हो सकती।",
    saveError: "बिल डेटाबेस में सेव नहीं हो सका।",
    printError: "बिल प्रिंट नहीं हो सका।",
    retry: "दोबारा प्रयास करें",
    item: "आभूषण",
    goldLabel: "सोना",
    silverLabel: "चाँदी",
    noShopName: "दुकान का नाम",
    gstin: "GSTIN",
    billType: "बिल का प्रकार",
    estimateBill: "कच्चा बिल / अनुमान",
    taxInvoice: "पक्का बिल / टैक्स इनवॉइस",
    hsn: "HSN कोड",
    sku: "आइटम कोड / SKU",
    huid: "HUID / हॉलमार्क नंबर",
    makingPlaceholder: "₹ प्रति नग",
    otherCharges: "अन्य चार्ज / नग (₹)",
    otherChargesPlaceholder: "₹ प्रति नग",
    itemBreakup: "आइटम का मूल्य विवरण",
    metalValue: "मेटल वैल्यू",
    discount: "छूट",
    tax: "GST",
    otherTotal: "अन्य चार्ज कुल",
    paid: "जमा राशि",
    paidPlaceholder: "अभी प्राप्त राशि",
    balance: "बाकी राशि",
    paymentSummary: "भुगतान सारांश",
    paymentStatus: "भुगतान स्थिति",
    paidStatus: "भुगतान पूरा",
    partialStatus: "आंशिक भुगतान",
    dueStatus: "भुगतान बाकी",
    invoiceEstimateNote: "अनुमान / टैक्स इनवॉइस नहीं",
    taxInvoiceNote: "टैक्स इनवॉइस",
    hsnOptional: "वैकल्पिक",
    huidOptional: "हॉलमार्क होने पर",
    lineTotal: "आइटम कुल",
    makingTotal: "कुल मेकिंग",
    gstTotal: "कुल GST",
    otherChargesTotal: "कुल अन्य चार्ज",
    amountReceived: "प्राप्त राशि",
    invalidPaid: "जमा राशि कुल बिल से अधिक नहीं हो सकती।",
    taxInvoiceGstinRequired: "पक्का GST टैक्स इनवॉइस बनाने के लिए दुकान का GSTIN आवश्यक है।",
    taxInvoiceHsnRequired: "पक्का टैक्स इनवॉइस बनाने से पहले हर आइटम का HSN कोड दर्ज करें।",
    discountInvalid: "छूट कुल राशि से अधिक नहीं हो सकती।",
  },

  en: {
    pageTitle: "New Bill",
    createBill: "Create Invoice",
    dashboard: "Dashboard",
    collection: "Jewellery Billing",
    date: "Date",
    customerInfo: "Customer Information",
    customerInfoDesc: "Enter customer details",
    customerName: "Customer Name",
    customerNamePlaceholder: "Enter customer name",
    mobile: "Customer WhatsApp Number",
    mobilePlaceholder: "Enter customer's WhatsApp number",
    chooseJewellery: "Choose Jewellery",
    chooseJewelleryDesc: "Select gold or silver",
    gold: "Gold",
    silver: "Silver",
    goldJewellery: "Gold Jewellery",
    silverJewellery: "Silver Jewellery",
    itemType: "Jewellery Type",
    selectItem: "Select jewellery",
    purity: "Purity",
    selectCarat: "Select carat",
    quantity: "Quantity",
    weight: "Weight",
    gram: "gram",
    rate: "Rate",
    per10Gram: "per 10 grams",
    perKg: "per kilogram",
    enterRate: "Enter rate",
    previousRate: "Previous ₹",
    rateAvailable: "A previous rate is available for this selection.",
    addItem: "Add Item",
    addedItems: "Items Added to Bill",
    addedItemsDesc: "Matching items merge only when their price, charges and tax settings are identical.",
    pieces: "pcs",
    removeItem: "Remove item",
    billingDetails: "Additional Billing Details",
    billingDetailsDesc: "Offer is deducted once from the combined bill total. GST is calculated item-wise; making and other charges are fixed rupee amounts.",
    making: "Making Charges / Piece (₹)",
    wholeBill: "Whole bill",
    offer: "Discount / Offer",
    addItemFirst: "Add at least one jewellery item to continue.",
    gst: "GST",
    applyGst: "Apply GST to this bill",
    gstOn: "GST On",
    gstOff: "GST Off",
    allItems: "Items Amount",
    subtotal: "Subtotal",
    total: "Grand Total",
    print: "Print Bill",
    printing: "Printing...",
    printTitle: "Jewellery Details",
    customerDetails: "Customer Details",
    shopDetails: "Shop Details",
    name: "Name",
    number: "Number",
    billNumber: "Bill Number",
    time: "Time",
    thanks: "Thank you for shopping with us.",
    thanksDesc: "We appreciate your trust. Please visit again.",
    signature: "Authorized Signature",
    trust: "Trust",
    purityFooter: "Purity",
    beauty: "Beauty",
    preparing: "Preparing your billing page...",
    loadingProfile: "Loading shop information...",
    loginRequired: "Please login first.",
    profileError: "Unable to load shop information.",
    customerRequired: "Please enter the customer name.",
    mobileRequired: "Please enter the customer mobile number.",
    itemRequired: "Add at least one jewellery item to the bill.",
    chooseMetalItem: "Please select a metal and jewellery type.",
    choosePurity: "Please select purity (carat).",
    weightRequired: "Please enter a valid weight.",
    rateRequired: "Please enter a valid rate.",
    quantityRequired: "Please enter a valid quantity.",
    offerInvalid: "Discount cannot exceed the subtotal.",
    saveError: "Unable to save the bill to the database.",
    printError: "Unable to print the bill.",
    retry: "Try Again",
    item: "Jewellery",
    goldLabel: "Gold",
    silverLabel: "Silver",
    noShopName: "Shop Name",
    gstin: "GSTIN",
    billType: "Bill Type",
    estimateBill: "Kachcha Bill / Estimate",
    taxInvoice: "Pakka Bill / Tax Invoice",
    hsn: "HSN Code",
    sku: "Item Code / SKU",
    huid: "HUID / Hallmark No.",
    makingPlaceholder: "₹ per piece",
    otherCharges: "Other Charges / Piece (₹)",
    otherChargesPlaceholder: "₹ per piece",
    itemBreakup: "Item Price Breakup",
    metalValue: "Metal Value",
    discount: "Discount",
    tax: "GST",
    otherTotal: "Other Charges Total",
    paid: "Amount Paid",
    paidPlaceholder: "Amount received now",
    balance: "Balance Due",
    paymentSummary: "Payment Summary",
    paymentStatus: "Payment Status",
    paidStatus: "Paid",
    partialStatus: "Partially Paid",
    dueStatus: "Payment Due",
    invoiceEstimateNote: "Estimate / Not a Tax Invoice",
    taxInvoiceNote: "Tax Invoice",
    hsnOptional: "Optional",
    huidOptional: "If hallmarked",
    lineTotal: "Item Total",
    makingTotal: "Total Making",
    gstTotal: "Total GST",
    otherChargesTotal: "Total Other Charges",
    amountReceived: "Amount Received",
    invalidPaid: "Amount paid cannot exceed the grand total.",
    taxInvoiceGstinRequired: "Shop GSTIN is required for a GST tax invoice.",
    taxInvoiceHsnRequired: "Enter an HSN code for every item before creating a tax invoice.",
    discountInvalid: "Discount cannot exceed the bill amount.",
  },
};

const GOLD_ITEMS = [
  { value: "gold-01", hi: 'सोने की अंगूठी', en: 'Gold Ring' },
  { value: "gold-02", hi: 'सोने की चेन', en: 'Gold Chain' },
  { value: "gold-03", hi: 'सोने का कंगन', en: 'Gold Bangle' },
  { value: "gold-04", hi: 'सोने का हार', en: 'Gold Necklace' },
  { value: "gold-05", hi: 'सोने की कान की बाली', en: 'Gold Earrings' },
  { value: "gold-06", hi: 'सोने का पेंडेंट', en: 'Gold Pendant' },
  { value: "gold-07", hi: 'सोने की चूड़ी', en: 'Gold Bangle' },
  { value: "gold-08", hi: 'सोने की नाक की पिन', en: 'Gold Nose Pin' },
  { value: "gold-09", hi: 'सोने का माँग टीका', en: 'Gold Maang Tikka' },
  { value: "gold-10", hi: 'सोने का झूमर', en: 'Gold Jhumar' },
  { value: "gold-11", hi: 'सोने का बोरला', en: 'Gold Borla' },
  { value: "gold-12", hi: 'सोने की रखड़ी', en: 'Gold Rakhdi' },
  { value: "gold-13", hi: 'सोने का शीशफूल', en: 'Gold Shishphool' },
  { value: "gold-14", hi: 'सोने के कान के आभूषण', en: 'Gold Ear Jewellery' },
  { value: "gold-15", hi: 'सोने का झुमका', en: 'Gold Jhumka' },
  { value: "gold-16", hi: 'सोने की झुमकी', en: 'Gold Jhumki' },
  { value: "gold-17", hi: 'सोने की बाली', en: 'Gold Bali Earrings' },
  { value: "gold-18", hi: 'सोने के टॉप्स', en: 'Gold Stud Earrings' },
  { value: "gold-19", hi: 'सोने का सूई-धागा', en: 'Gold Sui-Dhaga' },
  { value: "gold-20", hi: 'सोने की कान की चेन', en: 'Gold Ear Chain' },
  { value: "gold-21", hi: 'सोने का कर्णफूल', en: 'Gold Karnphool' },
  { value: "gold-22", hi: 'सोने का कुंडल', en: 'Gold Kundal' },
  { value: "gold-23", hi: 'सोने की मुरकी', en: 'Gold Murki' },
  { value: "gold-24", hi: 'सोने की लटकन', en: 'Gold Hanging Ornament' },
  { value: "gold-25", hi: 'सोने के गले के आभूषण', en: 'Gold Neck Jewellery' },
  { value: "gold-26", hi: 'सोने का हार', en: 'Gold Necklace' },
  { value: "gold-27", hi: 'सोने की नेकलेस', en: 'Gold Necklace' },
  { value: "gold-28", hi: 'सोने का चोकर', en: 'Gold Choker' },
  { value: "gold-29", hi: 'सोने का रानी हार', en: 'Gold Rani Haar' },
  { value: "gold-30", hi: 'सोने का लच्छा', en: 'Gold Lachha' },
  { value: "gold-31", hi: 'सोने की हँसली', en: 'Gold Hansli' },
  { value: "gold-32", hi: 'सोने की कंठी', en: 'Gold Kanthi' },
  { value: "gold-33", hi: 'सोने की तिमणिया', en: 'Gold Timaniya' },
  { value: "gold-34", hi: 'सोने का मंगलसूत्र', en: 'Gold Mangalsutra' },
  { value: "gold-35", hi: 'सोने का चंद्रहार', en: 'Gold Chandrahaar' },
  { value: "gold-36", hi: 'सोने की अंगूठी', en: 'Gold Ring' },
  { value: "gold-37", hi: 'सोने की चूड़ी', en: 'Gold Bangle' },
  { value: "gold-38", hi: 'सोने का कंगन', en: 'Gold Bangle' },
  { value: "gold-39", hi: 'सोने का ब्रेसलेट', en: 'Gold Bracelet' },
  { value: "gold-40", hi: 'सोने का बाजूबंद', en: 'Gold Armlet' },
  { value: "gold-41", hi: 'सोने का हथफूल', en: 'Gold Hathphool' },
  { value: "gold-42", hi: 'सोने की पोंची', en: 'Gold Ponchi' },
  { value: "gold-43", hi: 'सोने की गजरा', en: 'Gold Gajra' },
  { value: "gold-44", hi: 'सोने का कड़ा', en: 'Gold Kada' },
  { value: "gold-45", hi: 'सोने का कमरबंद', en: 'Gold Waist Belt' },
  { value: "gold-46", hi: 'सोने की तगड़ी', en: 'Gold Tagdi' },
  { value: "gold-47", hi: 'सोने की बिछिया', en: 'Gold Toe Ring' },
  { value: "gold-48", hi: 'सोने की चाँट', en: 'Gold ChaanT' },
  { value: "gold-49", hi: 'सोने की पायल', en: 'Gold Payal' },
  { value: "gold-50", hi: 'सोने की पाजेब', en: 'Gold Pajeb' },
  { value: "gold-51", hi: 'सोने की नथ', en: 'Gold Nath' },
  { value: "gold-52", hi: 'सोने की नथिया', en: 'Gold Nathiya' },
  { value: "gold-53", hi: 'सोने की लौंग', en: 'Gold Nose Stud' },
  { value: "gold-54", hi: 'सोने की नथनी', en: 'Gold Nathni' },
  { value: "gold-55", hi: 'सोने की नोज पिन', en: 'Gold Nose Pin' },
  { value: "gold-56", hi: 'सोने की बेसरी', en: 'Gold Besari' },
  { value: "gold-extra-001", hi: "सोने की माला", en: "Gold Mala" },
  { value: "gold-extra-002", hi: "सोने का मंगलसूत्र पेंडेंट", en: "Gold Mangalsutra Pendant" },
  { value: "gold-extra-003", hi: "सोने की मंगलसूत्र चेन", en: "Gold Mangalsutra Chain" },
  { value: "gold-extra-004", hi: "सोने का नेकलेस सेट", en: "Gold Necklace Set" },
  { value: "gold-extra-005", hi: "सोने का पेंडेंट सेट", en: "Gold Pendant Set" },
  { value: "gold-extra-006", hi: "सोने की चांदबाली", en: "Gold Chandbali" },
  { value: "gold-extra-007", hi: "सोने की हूप बाली", en: "Gold Hoop Earrings" },
  { value: "gold-extra-008", hi: "सोने की ईयर कफ", en: "Gold Ear Cuff" },
  { value: "gold-extra-009", hi: "सोने की कान की क्लिप", en: "Gold Ear Clip" },
  { value: "gold-extra-010", hi: "सोने की माथा पट्टी", en: "Gold Matha Patti" },
  { value: "gold-extra-011", hi: "सोने का पासा", en: "Gold Passa" },
  { value: "gold-extra-012", hi: "सोने की कलगी", en: "Gold Kalgi" },
  { value: "gold-extra-013", hi: "सोने का सरपेच", en: "Gold Sarpech" },
  { value: "gold-extra-014", hi: "सोने की मुंदावल्या", en: "Gold Mundavlya" },
  { value: "gold-extra-015", hi: "सोने का अंगूठा छल्ला", en: "Gold Thumb Ring" },
  { value: "gold-extra-016", hi: "सोने की लेयरिंग चेन", en: "Gold Layered Chain" },
  { value: "gold-extra-017", hi: "सोने का चार्म", en: "Gold Charm" },
  { value: "gold-extra-018", hi: "सोने का ब्रोच", en: "Gold Brooch" },
  { value: "gold-extra-019", hi: "सोने की हेयर पिन", en: "Gold Hair Pin" },
  { value: "gold-extra-020", hi: "सोने की साड़ी पिन", en: "Gold Saree Pin" },
  { value: "gold-extra-021", hi: "सोने का कफलिंक", en: "Gold Cufflinks" },
  { value: "gold-extra-022", hi: "सोने का टाई पिन", en: "Gold Tie Pin" },
  { value: "gold-extra-023", hi: "सोने की बच्चों की चूड़ी", en: "Gold Kids Bangles" },
  { value: "gold-extra-024", hi: "सोने का बच्चों का कड़ा", en: "Gold Kids Kada" },
  { value: "gold-extra-025", hi: "सोने की बच्चों की अंगूठी", en: "Gold Kids Ring" },
  { value: "gold-extra-026", hi: "सोने का बच्चों का ब्रेसलेट", en: "Gold Kids Bracelet" },
  { value: "gold-extra-027", hi: "सोने की पुरुषों की चेन", en: "Gold Men's Chain" },
  { value: "gold-extra-028", hi: "सोने का पुरुषों का ब्रेसलेट", en: "Gold Men's Bracelet" },
  { value: "gold-extra-029", hi: "सोने की जोड़ी अंगूठी", en: "Gold Couple Rings" },
  { value: "gold-extra-030", hi: "सोने का हाथ का छल्ला", en: "Gold Hand Ring" },
  { value: "gold-extra-031", hi: "सोने की पायल", en: "Gold Anklet" },
  { value: "gold-extra-032", hi: "सोने का लॉकेट", en: "Gold Locket" },
  { value: "gold-extra-033", hi: "सोने का नवरत्न हार", en: "Gold Navratna Necklace" },
  { value: "gold-extra-034", hi: "सोने का कुंदन हार", en: "Gold Kundan Necklace" },
  { value: "gold-extra-035", hi: "सोने का पोल्की हार", en: "Gold Polki Necklace" },
  { value: "gold-extra-036", hi: "सोने का जड़ाऊ हार", en: "Gold Jadau Necklace" },
  { value: "gold-extra-037", hi: "सोने की मोहर माला", en: "Gold Mohar Mala" },
  { value: "gold-extra-038", hi: "सोने की चेन लॉकेट सेट", en: "Gold Chain Locket Set" },
  { value: "gold-extra-039", hi: "सोने की कमर चेन", en: "Gold Waist Chain" },
  { value: "gold-extra-040", hi: "सोने का हाथकड़ा", en: "Gold Hand Kada" },
  { value: "gold-extra-041", hi: "सोने की पगड़ी सरपेच", en: "Gold Turban Sarpech" }
];

const SILVER_ITEMS = [
  { value: "silver-01", hi: 'चाँदी की पायल', en: 'Silver Payal' },
  { value: "silver-02", hi: 'चाँदी की बिछिया', en: 'Silver Toe Ring' },
  { value: "silver-03", hi: 'चाँदी की पाजेब', en: 'Silver Pajeb' },
  { value: "silver-04", hi: 'चाँदी का कंगन', en: 'Silver Bangle' },
  { value: "silver-05", hi: 'चाँदी का कड़ा', en: 'Silver Kada' },
  { value: "silver-06", hi: 'चाँदी की चूड़ियाँ', en: 'Silver Bangles' },
  { value: "silver-07", hi: 'चाँदी की अंगूठी', en: 'Silver Ring' },
  { value: "silver-08", hi: 'चाँदी का बाजूबंद', en: 'Silver Armlet' },
  { value: "silver-09", hi: 'चाँदी का हथफूल', en: 'Silver Hathphool' },
  { value: "silver-10", hi: 'चाँदी की पोंची', en: 'Silver Ponchi' },
  { value: "silver-11", hi: 'चाँदी का गजरा', en: 'Silver Gajra' },
  { value: "silver-12", hi: 'चाँदी का हार', en: 'Silver Necklace' },
  { value: "silver-13", hi: 'चाँदी की हँसली', en: 'Silver Hansli' },
  { value: "silver-14", hi: 'चाँदी की कंठी', en: 'Silver Kanthi' },
  { value: "silver-15", hi: 'चाँदी की तिमणिया', en: 'Silver Timaniya' },
  { value: "silver-16", hi: 'चाँदी की मटरमाला', en: 'Silver Matar Mala' },
  { value: "silver-17", hi: 'चाँदी का चंदनहार', en: 'Silver Chandan Haar' },
  { value: "silver-18", hi: 'चाँदी का झुमका, झुमकी', en: 'Silver Jhumka / Jhumki' },
  { value: "silver-19", hi: 'चाँदी की चाँद बालियाँ', en: 'Silver Chand Bali Earrings' },
  { value: "silver-20", hi: 'चाँदी का कर्णफूल', en: 'Silver Karnphool' },
  { value: "silver-21", hi: 'चाँदी की बाली', en: 'Silver Earrings' },
  { value: "silver-22", hi: 'चाँदी का कुण्डल', en: 'Silver Kundal' },
  { value: "silver-23", hi: 'चाँदी का कान पासा', en: 'Silver Ear Pasa' },
  { value: "silver-24", hi: 'चाँदी की मुरकी', en: 'Silver Murki' },
  { value: "silver-25", hi: 'चाँदी का मांग टीका', en: 'Silver Maang Tikka' },
  { value: "silver-26", hi: 'चाँदी का टीका', en: 'Silver Tikka' },
  { value: "silver-27", hi: 'चाँदी का बोरला', en: 'Silver Borla' },
  { value: "silver-28", hi: 'चाँदी की रखड़ी', en: 'Silver Rakhdi' },
  { value: "silver-29", hi: 'चाँदी का शीशफूल', en: 'Silver Shishphool' },
  { value: "silver-30", hi: 'चाँदी की नथ', en: 'Silver Nath' },
  { value: "silver-31", hi: 'चाँदी की नथड़ी', en: 'Silver Nathdi' },
  { value: "silver-32", hi: 'चाँदी की नथुनी', en: 'Silver Nathuni' },
  { value: "silver-33", hi: 'चाँदी की नथनी', en: 'Silver Nathni' },
  { value: "silver-34", hi: 'चाँदी की लौंग', en: 'Silver Nose Stud' },
  { value: "silver-35", hi: 'चाँदी की नोज पिन', en: 'Silver Nose Pin' },
  { value: "silver-36", hi: 'चाँदी का कमरबंद', en: 'Silver Waist Belt' },
  { value: "silver-37", hi: 'चाँदी की तगड़ी', en: 'Silver Tagdi' },
  { value: "silver-38", hi: 'चाँदी की करधनी', en: 'Silver Kardhani' },
  { value: "silver-39", hi: 'चाँदी का कंदोरा', en: 'Silver Kandora' },
  { value: "silver-extra-001", hi: "चाँदी की चेन", en: "Silver Chain" },
  { value: "silver-extra-002", hi: "चाँदी का ब्रेसलेट", en: "Silver Bracelet" },
  { value: "silver-extra-003", hi: "चाँदी का पेंडेंट", en: "Silver Pendant" },
  { value: "silver-extra-004", hi: "चाँदी का मंगलसूत्र", en: "Silver Mangalsutra" },
  { value: "silver-extra-005", hi: "चाँदी का नेकलेस सेट", en: "Silver Necklace Set" },
  { value: "silver-extra-006", hi: "चाँदी की चांदबाली", en: "Silver Chandbali" },
  { value: "silver-extra-007", hi: "चाँदी की हूप बाली", en: "Silver Hoop Earrings" },
  { value: "silver-extra-008", hi: "चाँदी की ईयर कफ", en: "Silver Ear Cuff" },
  { value: "silver-extra-009", hi: "चाँदी की ईयर चेन", en: "Silver Ear Chain" },
  { value: "silver-extra-010", hi: "चाँदी की माथा पट्टी", en: "Silver Matha Patti" },
  { value: "silver-extra-011", hi: "चाँदी का पासा", en: "Silver Passa" },
  { value: "silver-extra-012", hi: "चाँदी की कलगी", en: "Silver Kalgi" },
  { value: "silver-extra-013", hi: "चाँदी का सरपेच", en: "Silver Sarpech" },
  { value: "silver-extra-014", hi: "चाँदी का अंगूठा छल्ला", en: "Silver Thumb Ring" },
  { value: "silver-extra-015", hi: "चाँदी की बच्चों की पायल", en: "Silver Kids Anklet" },
  { value: "silver-extra-016", hi: "चाँदी की बच्चों की चूड़ी", en: "Silver Kids Bangles" },
  { value: "silver-extra-017", hi: "चाँदी का बच्चों का कड़ा", en: "Silver Kids Kada" },
  { value: "silver-extra-018", hi: "चाँदी की बच्चों की अंगूठी", en: "Silver Kids Ring" },
  { value: "silver-extra-019", hi: "चाँदी का पुरुषों का कड़ा", en: "Silver Men's Kada" },
  { value: "silver-extra-020", hi: "चाँदी की पुरुषों की चेन", en: "Silver Men's Chain" },
  { value: "silver-extra-021", hi: "चाँदी का पुरुषों का ब्रेसलेट", en: "Silver Men's Bracelet" },
  { value: "silver-extra-022", hi: "चाँदी का ब्रोच", en: "Silver Brooch" },
  { value: "silver-extra-023", hi: "चाँदी की साड़ी पिन", en: "Silver Saree Pin" },
  { value: "silver-extra-024", hi: "चाँदी की हेयर पिन", en: "Silver Hair Pin" },
  { value: "silver-extra-025", hi: "चाँदी का चार्म", en: "Silver Charm" },
  { value: "silver-extra-026", hi: "चाँदी की करधनी चेन", en: "Silver Waist Chain" },
  { value: "silver-extra-027", hi: "चाँदी का लॉकेट", en: "Silver Locket" },
  { value: "silver-extra-028", hi: "चाँदी की चेन पेंडेंट सेट", en: "Silver Chain Pendant Set" },
  { value: "silver-extra-029", hi: "चाँदी की पायल जोड़ी", en: "Silver Anklet Pair" },
  { value: "silver-extra-030", hi: "चाँदी का छल्ला", en: "Silver Band Ring" },
  { value: "silver-extra-031", hi: "चाँदी का कड़ा जोड़ी", en: "Silver Kada Pair" },
  { value: "silver-extra-032", hi: "चाँदी का दीपक", en: "Silver Diya" },
  { value: "silver-extra-033", hi: "चाँदी की पूजा थाली", en: "Silver Pooja Thali" },
  { value: "silver-extra-034", hi: "चाँदी का कलश", en: "Silver Kalash" },
  { value: "silver-extra-035", hi: "चाँदी की अगरबत्ती स्टैंड", en: "Silver Agarbatti Stand" },
  { value: "silver-extra-036", hi: "चाँदी की घंटी", en: "Silver Bell" },
  { value: "silver-extra-037", hi: "चाँदी का आरती सेट", en: "Silver Aarti Set" },
  { value: "silver-extra-038", hi: "चाँदी का सिक्का", en: "Silver Coin" },
  { value: "silver-extra-039", hi: "चाँदी की ईंट", en: "Silver Bar" },
  { value: "silver-extra-040", hi: "चाँदी की गणेश मूर्ति", en: "Silver Ganesh Idol" },
  { value: "silver-extra-041", hi: "चाँदी की लक्ष्मी मूर्ति", en: "Silver Lakshmi Idol" },
  { value: "silver-extra-042", hi: "चाँदी की कृष्ण मूर्ति", en: "Silver Krishna Idol" },
  { value: "silver-extra-043", hi: "चाँदी का फोटो फ्रेम", en: "Silver Photo Frame" },
  { value: "silver-extra-044", hi: "चाँदी का ड्राई फ्रूट बॉक्स", en: "Silver Dry Fruit Box" },
  { value: "silver-extra-045", hi: "चाँदी का पेन स्टैंड", en: "Silver Pen Stand" },
  { value: "silver-extra-046", hi: "चाँदी की ट्रॉफी", en: "Silver Trophy" },
  { value: "silver-extra-047", hi: "चाँदी की डिब्बी", en: "Silver Box" },
  { value: "silver-extra-048", hi: "चाँदी की चाबी का छल्ला", en: "Silver Keychain" },
  { value: "silver-extra-049", hi: "चाँदी का गिलास", en: "Silver Glass" },
  { value: "silver-extra-050", hi: "चाँदी की कटोरी", en: "Silver Bowl" },
  { value: "silver-extra-051", hi: "चाँदी की चम्मच", en: "Silver Spoon" },
  { value: "silver-extra-052", hi: "चाँदी की प्लेट", en: "Silver Plate" },
  { value: "silver-extra-053", hi: "चाँदी की कटोरी सेट", en: "Silver Bowl Set" },
  { value: "silver-extra-054", hi: "चाँदी का डिनर सेट", en: "Silver Dinner Set" },
  { value: "silver-extra-055", hi: "चाँदी का पानदान", en: "Silver Pandaan" },
  { value: "silver-extra-056", hi: "चाँदी की सुपारी डिब्बी", en: "Silver Betel Nut Box" },
  { value: "silver-extra-057", hi: "चाँदी का सिंदूरदान", en: "Silver Sindoor Box" },
  { value: "silver-extra-058", hi: "चाँदी का कछुआ", en: "Silver Turtle" },
  { value: "silver-extra-059", hi: "चाँदी का हाथी", en: "Silver Elephant" },
  { value: "silver-extra-060", hi: "चाँदी की पायल घुंघरू", en: "Silver Ghungroo Anklet" },
  { value: "silver-extra-061", hi: "चाँदी की बिछिया जोड़ी", en: "Silver Toe Ring Pair" },
  { value: "silver-extra-062", hi: "चाँदी का कमर कंदोरा", en: "Silver Waist Kandora" }
];

const normalizeLanguage = (value) =>
  value === "en" ? "en" : "hi";

const normalizeTheme = (value) =>
  value === "light" ? "light" : "dark";

const formatMoney = (value, maximumFractionDigits = 2) =>
  (Number(value) || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  });

const toAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

const makeBillNumber = () => {
  const now = new Date();

  return `BILL-${now.getFullYear()}${String(
    now.getMonth() + 1
  ).padStart(2, "0")}${String(now.getDate()).padStart(
    2,
    "0"
  )}-${String(now.getHours()).padStart(
    2,
    "0"
  )}${String(now.getMinutes()).padStart(
    2,
    "0"
  )}${String(now.getSeconds()).padStart(
    2,
    "0"
  )}${String(now.getMilliseconds()).padStart(3, "0")}`;
};

const getRateUnitLabel = (unit, metal, language) => {
  const resolvedUnit = unit || (metal === "gold" ? "10g" : "1kg");
  const labels = language === "hi"
    ? { "1g": "प्रति 1 ग्राम", "10g": "प्रति 10 ग्राम", "1kg": "प्रति 1 किलो" }
    : { "1g": "Per 1 Gram", "10g": "Per 10 Grams", "1kg": "Per 1 KG" };
  return labels[resolvedUnit] || labels[metal === "gold" ? "10g" : "1kg"];
};

function NewBill() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [shopProfile, setShopProfile] = useState(DEFAULT_PROFILE);

  const [authReady, setAuthReady] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");

  const [billNumber, setBillNumber] = useState("INV-0000");
  const [printDateTime, setPrintDateTime] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [pendingPrintConfirmation, setPendingPrintConfirmation] = useState(false);
  const [pendingBillData, setPendingBillData] = useState(null);
  const [pendingBillDocId, setPendingBillDocId] = useState(null);
  const [isSavingBill, setIsSavingBill] = useState(false);
  const saveLockRef = useRef(false);
  const [whatsAppConfirmOpen, setWhatsAppConfirmOpen] = useState(false);
  const [whatsAppMobile, setWhatsAppMobile] = useState("");
  const [isOpeningWhatsApp, setIsOpeningWhatsApp] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [customerErrors, setCustomerErrors] = useState({ name: "", mobile: "" });

  const [metal, setMetal] = useState("");
  const [item, setItem] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [itemDropdownOpen, setItemDropdownOpen] = useState(false);
  const itemPickerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (itemPickerRef.current && !itemPickerRef.current.contains(event.target)) {
        setItemDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);
  const [carat, setCarat] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [weight, setWeight] = useState("");
  const [rate, setRate] = useState("");
  const [rateUnit, setRateUnit] = useState("10g");
  const [itemMaking, setItemMaking] = useState("");
  const [itemOtherCharges, setItemOtherCharges] = useState("");
  const [itemGstRate, setItemGstRate] = useState("");
  const [gstDialogOpen, setGstDialogOpen] = useState(false);
  const [gstDialogRate, setGstDialogRate] = useState("3");
  const [gstSaving, setGstSaving] = useState(false);
  const [gstPrintRequest, setGstPrintRequest] = useState(0);
  const handlePrintRef = useRef(null);
  const [hsnCode, setHsnCode] = useState("");
  const [skuCode, setSkuCode] = useState("");
  const [huid, setHuid] = useState("");
  const [items, setItems] = useState([]);

  const [offer, setOffer] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [billType, setBillType] = useState("estimate");

  const language = normalizeLanguage(shopProfile.language);
  const theme = normalizeTheme(shopProfile.theme);
  const t = TEXT[language];

  // Stable item keys keep rates and bill records independent of the UI language.
  const getItemLabel = (itemKey, currentMetal = metal, currentLanguage = language) => {
    const source = currentMetal === "gold" ? GOLD_ITEMS : SILVER_ITEMS;
    const selected = source.find((entry) => entry.value === itemKey);
    return selected ? selected[currentLanguage] : itemKey || "";
  };

  // ============================================
  // AUTH + SHOP PROFILE
  // ============================================

  useEffect(() => {
    let mounted = true;
    let requestId = 0;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      const currentRequest = ++requestId;
      const isCurrent = () =>
        mounted && currentRequest === requestId;

      if (!isCurrent()) return;

      setAuthReady(true);
      setUser(currentUser);
      setProfileError("");

      if (!currentUser) {
        setShopProfile(DEFAULT_PROFILE);
        setProfileLoading(false);
        setProfileError("login");
        return;
      }

      setProfileLoading(true);

      try {
        const shopRef = doc(db, "shops", currentUser.uid);
        const shopSnapshot = await getDoc(shopRef);

        if (!isCurrent()) return;

        if (!shopSnapshot.exists()) {
          setShopProfile(DEFAULT_PROFILE);
          setItemGstRate("");
          setProfileError("missing");
          return;
        }

        const data = shopSnapshot.data();
        const savedGstRate = data.gstRate === null || data.gstRate === undefined || data.gstRate === ""
          ? null
          : Number(data.gstRate);

        setShopProfile({
          ...DEFAULT_PROFILE,
          gstRate: Number.isFinite(savedGstRate) ? savedGstRate : null,
          shopName: data.shopName || DEFAULT_PROFILE.shopName,
          ownerName: data.ownerName || "",
          phone: data.phone || "",
          alternatePhone:
            data.alternatePhone || data.phone2 || "",
          address: data.address || "",
          gstNumber: data.gstNumber || "",
          logoUrl: data.logoUrl || "",
          tagline: data.tagline || "",
          language: normalizeLanguage(data.language),
          theme: normalizeTheme(data.theme),
        });
        setItemGstRate(Number.isFinite(savedGstRate) ? String(savedGstRate) : "");
      } catch (error) {
        console.error("Shop profile fetch error:", error);
        if (isCurrent()) setProfileError("fetch");
      } finally {
        if (isCurrent()) setProfileLoading(false);
      }
    });

    return () => {
      mounted = false;
      requestId += 1;
      unsubscribe();
    };
  }, []);

  // ============================================
  // DASHBOARD PREFERENCE SYNC
  // ============================================

  useEffect(() => {
    const handlePreferenceChange = (event) => {
      const savedLanguage = event.detail?.language;
      const savedTheme = event.detail?.theme;

      setShopProfile((current) => ({
        ...current,
        language: ["hi", "en"].includes(savedLanguage)
          ? savedLanguage
          : current.language,
        theme: ["dark", "light"].includes(savedTheme)
          ? savedTheme
          : current.theme,
      }));
    };

    window.addEventListener(
      "billbox-preferences-change",
      handlePreferenceChange
    );

    return () => {
      window.removeEventListener(
        "billbox-preferences-change",
        handlePreferenceChange
      );
    };
  }, []);

  // ============================================
  // APPLY THEME + LANGUAGE
  // ============================================

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-language", language);
    document.body.setAttribute("data-theme", theme);
    document.body.setAttribute("data-language", language);

    document.documentElement.classList.toggle(
      "dark-theme",
      theme === "dark"
    );

    document.documentElement.classList.toggle(
      "light-theme",
      theme === "light"
    );

    try {
      localStorage.setItem("billbox-theme", theme);
      localStorage.setItem("billbox-language", language);
    } catch (error) {
      console.warn("Preference storage unavailable:", error);
    }
  }, [theme, language]);

  // ============================================
  // ITEM AMOUNT + ITEM-WISE TAX + BILL TOTALS
  // ============================================

  const getItemAmount = useCallback((line) => {
    const itemWeight = Number(line.weight) || 0;
    const itemRate = Number(line.rate) || 0;

    // Backward compatibility: old Gold bills used per 10g and old Silver bills per 1kg.
    const selectedUnit = line.rateUnit || (line.metal === "gold" ? "10g" : "1kg");
    const divisor = selectedUnit === "1g" ? 1 : selectedUnit === "1kg" ? 1000 : 10;

    return (itemWeight * itemRate) / divisor;
  }, []);

  const makingAmount = useMemo(
    () => items.reduce((sum, line) => sum + toAmount(line.makingCharges) * (Number(line.quantity) || 0), 0),
    [items]
  );

  const otherChargesAmount = useMemo(
    () => items.reduce((sum, line) => sum + toAmount(line.otherCharges) * (Number(line.quantity) || 0), 0),
    [items]
  );

  const baseAmount = useMemo(
    () => items.reduce((sum, line) => sum + getItemAmount(line), 0),
    [items, getItemAmount]
  );

  const preDiscountTotal = baseAmount + makingAmount + otherChargesAmount;
  // Offer is deducted once from the combined bill amount; it is never allocated to individual items.
  const offerAmount = Math.min(toAmount(offer), preDiscountTotal);
  const subtotal = Math.max(0, preDiscountTotal - offerAmount);

  const lineDetails = useMemo(() => items.map((line) => {
    const metalValue = getItemAmount(line);
    const itemQuantity = Number(line.quantity) || 0;
    const makingValue = toAmount(line.makingCharges) * itemQuantity;
    const otherValue = toAmount(line.otherCharges) * itemQuantity;
    const beforeTax = metalValue + makingValue + otherValue;
    const lineGstRate = line.gstRate === null || line.gstRate === undefined || line.gstRate === ""
      ? (shopProfile.gstRate === null || shopProfile.gstRate === undefined ? 0 : toAmount(shopProfile.gstRate))
      : toAmount(line.gstRate);
    const lineGstAmount = beforeTax * (lineGstRate / 100);
    return {
      id: line.id,
      metalValue,
      makingValue,
      otherValue,
      beforeTax,
      gstRate: lineGstRate,
      gstAmount: lineGstAmount,
      total: beforeTax + lineGstAmount,
    };
  }), [items, getItemAmount, shopProfile.gstRate]);

  // GST is calculated separately for each item using that item's selected GST rate.
  const gstRate = shopProfile.gstRate === null || shopProfile.gstRate === undefined
    ? 0
    : toAmount(shopProfile.gstRate);
  const gstAmount = lineDetails.reduce((sum, detail) => sum + detail.gstAmount, 0);
  const grandTotal = Math.max(0, subtotal + gstAmount);
  const gstEnabled = gstAmount > 0;

  const getLineDetails = (line) =>
    lineDetails.find((detail) => detail.id === line.id) || {
      metalValue: getItemAmount(line),
      makingValue: toAmount(line.makingCharges) * (Number(line.quantity) || 0),
      otherValue: toAmount(line.otherCharges) * (Number(line.quantity) || 0),
      gstRate: toAmount(line.gstRate || shopProfile.gstRate || 0),
      gstAmount: 0,
      beforeTax: getItemAmount(line) + toAmount(line.makingCharges) * (Number(line.quantity) || 0) + toAmount(line.otherCharges) * (Number(line.quantity) || 0),
      total: getItemAmount(line) + toAmount(line.makingCharges) * (Number(line.quantity) || 0) + toAmount(line.otherCharges) * (Number(line.quantity) || 0),
    };

  const receivedAmount = Math.min(toAmount(paidAmount), grandTotal);
  const balanceAmount = Math.max(0, grandTotal - receivedAmount);
  const paymentStatus =
    balanceAmount <= 0 && grandTotal > 0
      ? "paid"
      : receivedAmount > 0
        ? "partial"
        : "due";

  const rateKey =
    metal === "gold"
      ? `gold-${carat}`
      : `silver-${item}`;

  const matchingRateLine = items.find(
    (line) => line.rateKey === rateKey
  );
  const matchingRate = matchingRateLine?.rate;

  const saveGstRateAndContinue = async () => {
    if (!user) return;
    const selectedRate = Number(gstDialogRate);
    if (gstDialogRate === "" || !Number.isFinite(selectedRate) || selectedRate < 0 || selectedRate > 100) {
      window.alert(language === "hi" ? "कृपया सही GST दर चुनें।" : "Please select a valid GST rate.");
      return;
    }

    setGstSaving(true);
    try {
      await updateDoc(doc(db, "shops", user.uid), {
        gstRate: selectedRate,
        gstRateUpdatedAt: serverTimestamp(),
      });
      setShopProfile((current) => ({ ...current, gstRate: selectedRate }));
      setItems((current) => current.map((line) => (line.gstRate === "" || line.gstRate === null || line.gstRate === undefined ? { ...line, gstRate: selectedRate } : line)));
      setItemGstRate(String(selectedRate));
      setGstDialogOpen(false);
      setGstPrintRequest((request) => request + 1);
    } catch (error) {
      console.error("Unable to save shop GST rate:", error);
      window.alert(language === "hi" ? "GST दर दुकान के डेटाबेस में सेव नहीं हो सकी। कृपया दोबारा प्रयास करें।" : "GST rate could not be saved to the shop database. Please try again.");
    } finally {
      setGstSaving(false);
    }
  };

  // ============================================
  // ITEM HANDLERS
  // ============================================

  const handleMetalChange = (value) => {
    setMetal(value);
    setItem("");
    setItemSearch("");
    setItemDropdownOpen(false);
    setCarat("");
    setWeight("");
    setQuantity(1);
    setRate("");
    setRateUnit(value === "gold" ? "10g" : "1kg");
    setItemMaking("");
    setItemOtherCharges("");
    setItemGstRate(shopProfile.gstRate === null || shopProfile.gstRate === undefined ? "" : String(shopProfile.gstRate));
    setHsnCode("");
    setSkuCode("");
    setHuid("");
  };

  const handleCaratChange = (value) => {
    setCarat(value);

    // Keep the existing metal/item rate lookup unchanged. Gold rates are
    // purity-based; silver rates remain item-based as before.
    const selectedRateKey = metal === "gold" ? `gold-${value}` : `silver-${item}`;
    const existing = items.find((line) => line.rateKey === selectedRateKey);
    if (metal === "gold") {
      setRate(existing ? String(existing.rate) : "");
      setRateUnit(existing?.rateUnit || "10g");
    }
  };

  const handleItemChange = (value) => {
    setItem(value);
    const selectedEntry = (metal === "gold" ? GOLD_ITEMS : SILVER_ITEMS).find((entry) => entry.value === value);
    setItemSearch(selectedEntry ? selectedEntry[language] : value);
    setItemDropdownOpen(false);

    if (metal === "silver") {
      const existing = items.find(
        (line) => line.rateKey === `silver-${value}`
      );

      setRate(existing ? String(existing.rate) : "");
      setRateUnit(existing?.rateUnit || "1kg");
    }
  };

  const itemCatalogue = metal === "gold" ? GOLD_ITEMS : SILVER_ITEMS;
  const selectedCatalogueEntry = itemCatalogue.find((entry) => entry.value === item);
  // Show the selected catalogue name in the shop's active language.
  // Custom names remain exactly as entered by the shop user.
  const itemInputValue = !itemDropdownOpen && selectedCatalogueEntry
    ? selectedCatalogueEntry[language]
    : itemSearch;
  const filteredItemCatalogue = itemCatalogue.filter((entry) => {
    const query = itemSearch.trim().toLocaleLowerCase();
    return !query || entry.hi.toLocaleLowerCase().includes(query) || entry.en.toLocaleLowerCase().includes(query);
  });
  const exactItemMatch = itemCatalogue.some((entry) =>
    entry.hi.trim().toLocaleLowerCase() === itemSearch.trim().toLocaleLowerCase() ||
    entry.en.trim().toLocaleLowerCase() === itemSearch.trim().toLocaleLowerCase()
  );
  const chooseCatalogueItem = (entry) => {
    handleItemChange(entry.value);
    setItemDropdownOpen(false);
  };
  const applyCustomItemName = () => {
    const customName = itemSearch.trim();
    if (!customName) return;
    handleItemChange(customName);
    setItemDropdownOpen(false);
  };

  const addItem = () => {
    if (!metal || !item) {
      window.alert(t.chooseMetalItem);
      return;
    }

    if (!carat) {
      window.alert(t.choosePurity);
      return;
    }

    if (!Number.isFinite(Number(weight)) || Number(weight) <= 0) {
      window.alert(t.weightRequired);
      return;
    }

    if (!Number.isFinite(Number(rate)) || Number(rate) <= 0) {
      window.alert(t.rateRequired);
      return;
    }

    if (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0) {
      window.alert(t.quantityRequired);
      return;
    }

    const selectedRateKey =
      metal === "gold"
        ? `gold-${carat}`
        : `silver-${item}`;

    const newLine = {
      itemKey: item,
      itemName: getItemLabel(item, metal, language),
      metal,
      carat,
      quantity: Number(quantity),
      weight: Number(weight),
      rate: Number(rate),
      rateUnit,
      rateKey: selectedRateKey,
      makingCharges: toAmount(itemMaking),
      otherCharges: toAmount(itemOtherCharges),
      gstRate: itemGstRate === "" ? (shopProfile.gstRate ?? null) : toAmount(itemGstRate),
      hsnCode: hsnCode.trim(),
      skuCode: skuCode.trim(),
      huid: huid.trim(),
    };

    setItems((previous) => {
      // Keep the historical auto-merge behaviour only when every pricing,
      // tax and identification field is identical. Distinct HUIDs never merge.
      const existingIndex = previous.findIndex((line) =>
        line.itemKey === newLine.itemKey &&
        line.metal === newLine.metal &&
        line.carat === newLine.carat &&
        Number(line.rate) === newLine.rate &&
        (line.rateUnit || (line.metal === "gold" ? "10g" : "1kg")) === newLine.rateUnit &&
        Number(line.makingCharges || 0) === newLine.makingCharges &&
        Number(line.otherCharges || 0) === newLine.otherCharges &&
        Number(line.gstRate ?? shopProfile.gstRate ?? 0) === Number(newLine.gstRate) &&
        String(line.hsnCode || "") === newLine.hsnCode &&
        String(line.skuCode || "") === newLine.skuCode &&
        String(line.huid || "") === newLine.huid
      );

      if (existingIndex !== -1) {
        return previous.map((line, index) =>
          index === existingIndex
            ? {
              ...line,
              quantity: Number(line.quantity) + newLine.quantity,
              weight: Number(line.weight) + newLine.weight,
              rate: newLine.rate,
              rateUnit: newLine.rateUnit,
              rateKey: selectedRateKey,
            }
            : line
        );
      }

      return [
        ...previous,
        {
          ...newLine,
          id: `${Date.now()}-${Math.random()}`,
        },
      ];
    });

    setMetal("");
    setItem("");
    setItemSearch("");
    setItemDropdownOpen(false);
    setCarat("");
    setQuantity(1);
    setWeight("");
    setRate("");
    setRateUnit(metal === "gold" ? "10g" : "1kg");
    setItemMaking("");
    setItemOtherCharges("");
    setItemGstRate(shopProfile.gstRate === null || shopProfile.gstRate === undefined ? "" : String(shopProfile.gstRate));
    setHsnCode("");
    setSkuCode("");
    setHuid("");
  };

  const removeItem = (id) => {
    setItems((previous) =>
      previous.filter((line) => line.id !== id)
    );
  };

  // ============================================
  // PRINT + SAVE BILL
  // ============================================

  const validateCustomerDetails = () => {
    const cleanName = customerName.trim().replace(/\s+/g, " ");
    const digits = customerMobile.replace(/\D/g, "");
    const normalizedMobile = digits.startsWith("91") && digits.length === 12
      ? digits.slice(2)
      : digits.startsWith("0") && digits.length === 11
        ? digits.slice(1)
        : digits;
    const nameValid = cleanName.length >= 2 && cleanName.length <= 60 && /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u.test(cleanName);
    const mobileValid = /^[6-9]\d{9}$/.test(normalizedMobile);
    const errors = {
      name: nameValid ? "" : (language === "hi"
        ? "ग्राहक का नाम 2–60 अक्षरों का होना चाहिए। केवल अक्षर, स्पेस, डॉट, हाइफन और apostrophe मान्य हैं।"
        : "Enter a valid name (2–60 characters). Numbers and special symbols are not allowed."),
      mobile: mobileValid ? "" : (language === "hi"
        ? "मान्य भारतीय मोबाइल नंबर दर्ज करें (10 अंक, 6–9 से शुरू)। +91 या 0 prefix भी स्वीकार है।"
        : "Enter a valid Indian mobile number: 10 digits starting with 6–9. +91 or leading 0 is also accepted."),
    };
    setCustomerErrors(errors);
    return { valid: !errors.name && !errors.mobile, normalizedMobile };
  };


  const createInvoiceHtmlDocument = () => {
    const invoice = document.querySelector(".print-invoice");

    if (!invoice) {
      throw new Error("Invoice element not found");
    }

    const clone = invoice.cloneNode(true);
    clone.style.display = "flex";

    const stylesheetLinks = Array.from(
      document.querySelectorAll('link[rel="stylesheet"]')
    )
      .map((link) => link.href)
      .filter(Boolean);

    const inlineStyles = Array.from(document.querySelectorAll("style"))
      .map((style) => style.innerHTML)
      .join("\n");

    return `<!doctype html>
<html lang="${language === "hi" ? "hi" : "en"}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<base href="${window.location.origin}/" />

${stylesheetLinks.map((href) =>
      `<link rel="stylesheet" href="${href}">`
    ).join("\n")}

<style>
${inlineStyles}

html, body {
  margin: 0 !important;
  padding: 0 !important;
  width: 100%;
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

  const handlePrint = useCallback(async (skipGstSetup = false) => {
    if (!user) {
      window.alert(t.loginRequired);
      return;
    }

    const customerValidation = validateCustomerDetails();
    if (!customerValidation.valid) return;

    if (items.length === 0) {
      window.alert(t.itemRequired);
      return;
    }

    if (billType === "tax" && !String(shopProfile.gstNumber || "").trim()) {
      window.alert(t.taxInvoiceGstinRequired);
      return;
    }

    if (billType === "tax" && items.some((line) => !String(line.hsnCode || "").trim())) {
      window.alert(t.taxInvoiceHsnRequired);
      return;
    }

    if (
      billType === "tax" &&
      !skipGstSetup &&
      (shopProfile.gstRate === null ||
        shopProfile.gstRate === undefined ||
        shopProfile.gstRate === "")
    ) {
      setGstDialogRate("3");
      setGstDialogOpen(true);
      return;
    }

    if (toAmount(offer) > preDiscountTotal) {
      window.alert(t.discountInvalid);
      return;
    }

    if (toAmount(paidAmount) > grandTotal) {
      window.alert(t.invalidPaid);
      return;
    }

    if (isPrinting) return;

    setIsPrinting(true);

    const now = new Date();
    const generatedBillNumber = makeBillNumber();

    // Allocate one stable Firestore document ID for this pending invoice.
    const billDocumentRef = doc(collection(db, "bills"));

    const billItems = items.map((line) => {
      const detail = getLineDetails(line);

      return {
        itemName: line.itemKey
          ? getItemLabel(line.itemKey, line.metal, language)
          : line.itemName,
        itemKey: line.itemKey || "",
        metal: line.metal,
        carat: line.carat || "",
        quantity: Number(line.quantity) || 0,
        weight: Number(line.weight) || 0,
        rate: Number(line.rate) || 0,
        rateUnit: line.rateUnit || (line.metal === "gold" ? "10g" : "1kg"),
        amount: detail.metalValue,
        makingCharges: detail.makingValue,
        makingChargesPerPiece: toAmount(line.makingCharges),
        otherCharges: detail.otherValue,
        otherChargesPerPiece: toAmount(line.otherCharges),
        chargesBreakdown: {
          metalValue: detail.metalValue,
          makingPerPiece: toAmount(line.makingCharges),
          makingTotal: detail.makingValue,
          otherPerPiece: toAmount(line.otherCharges),
          otherTotal: detail.otherValue,
        },
        hsnCode: line.hsnCode || "",
        skuCode: line.skuCode || "",
        huid: line.huid || "",
        gstRate: detail.gstRate,
        gstAmount: detail.gstAmount,
        discountShare: 0,
        offerAllocatedToItem: false,
        taxableAmount: detail.beforeTax,
        totalAmount: detail.total,
        lineTotal: detail.total,
      };
    });

    const billData = {
      ownerId: user.uid,

      shopName: shopProfile.shopName,
      shopOwnerName: shopProfile.ownerName,
      shopPhone: shopProfile.phone,
      shopAlternatePhone: shopProfile.alternatePhone,
      shopAddress: shopProfile.address,
      shopGstNumber: shopProfile.gstNumber,
      shopGstRate: gstRate,
      shopLogoUrl: shopProfile.logoUrl,
      shopTagline: shopProfile.tagline || "",

      billNumber: generatedBillNumber,
      invoiceNo: generatedBillNumber,

      customerName: customerName.trim().replace(/\s+/g, " "),
      customerMobile: customerValidation.normalizedMobile,

      items: billItems,
      billType,
      billTypeLabel: billType === "tax" ? t.taxInvoice : t.estimateBill,

      payment: {
        total: grandTotal,
        paid: receivedAmount,
        balance: balanceAmount,
        status: paymentStatus,
      },

      paidAmount: receivedAmount,
      balanceDue: balanceAmount,
      paymentStatus,

      itemName: billItems[0]?.itemName || "",
      metal: billItems[0]?.metal || "",
      carat: billItems[0]?.carat || "",
      quantity: billItems[0]?.quantity || 0,
      weight: billItems[0]?.weight || 0,
      rate: billItems[0]?.rate || 0,

      makingCharges: makingAmount,
      otherCharges: otherChargesAmount,
      offer: offerAmount,
      discount: offerAmount,
      discountAppliedAtBillLevel: true,
      preDiscountTotal,
      gstEnabled,
      gstRate,
      gstMode: "item-wise",
      gstAmount,
      subtotal,
      grandTotal,
      totalAmount: grandTotal,
      amountPaid: receivedAmount,
      balanceAmount,
    };
    let printWindow = null;

    try {
      // Open a new tab immediately during the user's click.
      // This avoids iOS Chrome popup restrictions.
      printWindow = window.open("about:blank", "_blank");

      if (!printWindow) {
        throw new Error("POPUP_BLOCKED");
      }

      printWindow.document.open();
      printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>BillBox</title>
      </head>
      <body style="font-family:Arial,sans-serif;padding:30px;text-align:center">
        <h3>Preparing your invoice...</h3>
        <p>Please wait.</p>
      </body>
    </html>
  `);
      printWindow.document.close();

      // Force React to render invoice data before creating HTML.
      flushSync(() => {
        setBillNumber(generatedBillNumber);
        setPrintDateTime(now);
        setPendingBillData(billData);
        setPendingBillDocId(billDocumentRef.id);
      });

      // Use the existing invoice HTML generator.
      const invoiceHtml = createInvoiceHtmlDocument();

      // Generate the PDF using your existing API.
      const pdfUrl = await generateInvoicePdf(invoiceHtml);

      // Open the generated PDF in the new tab.
      printWindow.location.replace(pdfUrl);

      // Show existing save confirmation in the original tab.
      setPendingPrintConfirmation(true);

    } catch (error) {
      console.error("Unable to open invoice:", error);

      if (printWindow && !printWindow.closed) {
        printWindow.close();
      }

      setPendingPrintConfirmation(false);
      setPendingBillData(null);
      setPendingBillDocId(null);

      const message =
        error.message === "POPUP_BLOCKED"
          ? (
            language === "hi"
              ? "कृपया Chrome में इस वेबसाइट के Pop-ups allow करें और दोबारा प्रयास करें।"
              : "Please allow pop-ups for this website in Chrome and try again."
          )
          : getInvoiceApiUserMessage(error, language);

      window.alert(message);

    } finally {
      setIsPrinting(false);
    }
  }, [
    user,
    t,
    customerName,
    getItemLabel,
    theme,
    validateCustomerDetails,
    items,
    billType,
    shopProfile,
    language,
    offer,
    preDiscountTotal,
    paidAmount,
    grandTotal,
    isPrinting,
    receivedAmount,
    balanceAmount,
    paymentStatus,
    makingAmount,
    otherChargesAmount,
    offerAmount,
    gstEnabled,
    gstRate,
    gstAmount,
    subtotal,
    getLineDetails,
  ]);


  useEffect(() => {
    const handleAfterPrint = () => {
      setIsPrinting(false);
      if (
        pendingBillData &&
        pendingBillDocId &&
        !pendingPrintConfirmation
      ) {
        setPendingPrintConfirmation(true);
      }
    };

    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, [pendingBillData, pendingBillDocId, pendingPrintConfirmation]);

  const cancelPrintConfirmation = () => {
    // Cancel only discards the local pending invoice. No Firestore write.
    setPendingPrintConfirmation(false);
    setPendingBillData(null);
    setPendingBillDocId(null);
    setBillNumber("INV-0000");
    setPrintDateTime(null);
  };

  const confirmPrintedAndSave = async () => {
    if (!pendingBillData || !pendingBillDocId || saveLockRef.current) return;

    saveLockRef.current = true;
    setIsSavingBill(true);

    try {
      // Keep the existing idempotent Firestore save workflow unchanged.
      const billRef = doc(db, "bills", pendingBillDocId);
      await setDoc(billRef, {
        ...pendingBillData,
        createdAt: serverTimestamp(),
        printedAt: serverTimestamp(),
      });

      setPendingPrintConfirmation(false);
      setWhatsAppMobile(pendingBillData.customerMobile || "");
      setWhatsAppConfirmOpen(true);
    } catch (error) {
      console.error("Bill save error:", error?.code, error?.message, error);
      window.alert(`${t.saveError} ${error?.code || error?.message || ""}`);
    } finally {
      saveLockRef.current = false;
      setIsSavingBill(false);
    }
  };

  const closeWhatsAppConfirmation = () => {
    setWhatsAppConfirmOpen(false);
    setPendingBillData(null);
    setPendingBillDocId(null);
    setBillNumber("INV-0000");
    setPrintDateTime(null);
  };


  const confirmWhatsAppAndOpen = async () => {
    if (!pendingBillData || !pendingBillDocId || isOpeningWhatsApp) return;

    const digits = String(whatsAppMobile || "").replace(/\D/g, "");
    const normalizedMobile =
      digits.startsWith("91") && digits.length === 12
        ? digits.slice(2)
        : digits.startsWith("0") && digits.length === 11
          ? digits.slice(1)
          : digits;

    if (!/^[6-9]\d{9}$/.test(normalizedMobile)) {
      window.alert(language === "hi"
        ? "कृपया मान्य 10 अंकों का WhatsApp नंबर दर्ज करें।"
        : "Please enter a valid 10-digit Indian WhatsApp number.");
      return;
    }

    // Open synchronously from the click to avoid browser popup blocking.
    const whatsappWindow = window.open("about:blank", "_blank");
    if (!whatsappWindow) {
      window.alert(language === "hi"
        ? "WhatsApp खोलने के लिए कृपया इस साइट के pop-ups allow करें।"
        : "Please allow pop-ups for this site to open WhatsApp.");
      return;
    }

    setIsOpeningWhatsApp(true);

    // Replace the temporary blank tab with a small branded preparation screen.
    whatsappWindow.document.open();
    whatsappWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BillBox</title><style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#101114;color:#f7f3ea;font-family:Arial,sans-serif}.card{text-align:center;padding:36px 28px;max-width:360px}.logo{font-size:13px;letter-spacing:4px;color:#c6a15b;font-weight:800}.spinner{width:42px;height:42px;border:3px solid #39352c;border-top-color:#c6a15b;border-radius:50%;margin:28px auto;animation:spin .8s linear infinite}h2{font-size:20px;margin:0 0 10px}p{color:#aaa49a;font-size:14px;line-height:1.6;margin:0}@keyframes spin{to{transform:rotate(360deg)}}</style></head><body><main class="card"><div class="logo">BILLBOX</div><div class="spinner"></div><h2>Preparing your invoice</h2><p>Please wait while we create your PDF and open WhatsApp.</p></main></body></html>`);
    whatsappWindow.document.close();

    try {
      const invoiceHtml = createInvoiceHtmlDocument();

      const pdfUrl = await generateInvoicePdf(invoiceHtml);
      const billRef = doc(db, "bills", pendingBillDocId);

      // If the shopkeeper corrected the number, update the saved bill too.
      if (normalizedMobile !== pendingBillData.customerMobile) {
        await updateDoc(billRef, { customerMobile: normalizedMobile });
      }

      const amountPaid = Number(
        pendingBillData.amountPaid ?? pendingBillData.paidAmount ?? pendingBillData.payment?.paid ?? 0
      );
      const balanceAmount = Number(
        pendingBillData.balanceAmount ?? pendingBillData.balanceDue ?? pendingBillData.payment?.balance ?? 0
      );
      const totalAmount = Number(
        pendingBillData.grandTotal ?? pendingBillData.totalAmount ?? pendingBillData.payment?.total ?? 0
      );

      const message = language === "hi"
        ? [
          `नमस्ते ${pendingBillData.customerName || ""},`,
          `आपका बिल ${pendingBillData.billNumber || pendingBillData.invoiceNo || ""} ${pendingBillData.shopName ? `(${pendingBillData.shopName})` : ""} तैयार है।`,
          `कुल राशि: ₹${formatMoney(totalAmount)}`,
          `जमा राशि: ₹${formatMoney(amountPaid)}`,
          `बाकी राशि: ₹${formatMoney(balanceAmount)}`,
          "हमारे साथ खरीदारी करने के लिए धन्यवाद।",
          `बिल PDF: ${pdfUrl}`,
        ].join("\n")
        : [
          `Hello ${pendingBillData.customerName || ""},`,
          `Your invoice ${pendingBillData.billNumber || pendingBillData.invoiceNo || ""} ${pendingBillData.shopName ? `from ${pendingBillData.shopName}` : ""} is ready.`,
          `Total: ₹${formatMoney(totalAmount)}`,
          `Paid: ₹${formatMoney(amountPaid)}`,
          `Balance due: ₹${formatMoney(balanceAmount)}`,
          "Thank you for shopping with us.",
          `Invoice PDF: ${pdfUrl}`,
        ].join("\n");

      whatsappWindow.location.href =
        `https://wa.me/91${normalizedMobile}?text=${encodeURIComponent(message)}`;

      closeWhatsAppConfirmation();
    } catch (error) {
      console.error("PDF upload or WhatsApp preparation failed:", error);
      whatsappWindow.close();
      window.alert(getInvoiceApiUserMessage(error, language));
    } finally {
      setIsOpeningWhatsApp(false);
    }
  };

  // Keep the latest print handler available to the GST-save effect without
  // making that effect depend on a new function created on every render.
  useEffect(() => {
    handlePrintRef.current = handlePrint;
  }, [handlePrint]);

  useEffect(() => {
    if (gstPrintRequest > 0) {
      window.alert(
        language === "hi"
          ? "GST दर सेव हो गई है। अब बिल बनाने के लिए 'बिल प्रिंट करें' पर दोबारा क्लिक करें।"
          : "GST rate saved. Click 'Print Bill' again to generate the invoice."
      );
    }
  }, [gstPrintRequest, language]);

  // ============================================
  // LOADER
  // ============================================

  if (!authReady || profileLoading) {
    return (
      <PageLoader
        loading={true}
        message={t.preparing}
        fullScreen={true}
      />
    );
  }

  if (profileError) {
    const message =
      profileError === "login"
        ? t.loginRequired
        : t.profileError;

    return (
      <div className={`new-bill-page bill-theme-${theme}`}>
        <div className="bill-profile-error">
          <h2>{message}</h2>
          <button
            type="button"
            className="print-bill"
            onClick={() =>
              profileError === "login"
                ? navigate("/login")
                : window.location.reload()
            }
          >
            {profileError === "login" ? t.loginRequired : t.retry}
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // MAIN PAGE
  // ============================================

  return (
    <div
      className={`new-bill-page bill-theme-${theme}`}
      data-theme={theme}
      data-language={language}
    >
      {/* HEADER */}

      <header className="sales-header">
        <div className="sales-brand">
          {shopProfile.logoUrl ? (
            <img
              src={shopProfile.logoUrl}
              alt={shopProfile.shopName}
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="sales-brand-fallback">
              {String(shopProfile.shopName || "B")
                .trim()
                .charAt(0)
                .toUpperCase()}
            </div>
          )}

          <div>
            <span>{shopProfile.shopName}</span>
            <strong>{t.collection}</strong>
          </div>
        </div>

        <button
          type="button"
          className="sales-back"
          onClick={() => navigate("/dashboard")}
        >
          ← {t.dashboard}
        </button>
      </header>

      <main className="bill-container">
        {/* PAGE HEADING */}

        <div className="page-heading">
          <div>
            <span>{t.pageTitle}</span>
            <h2>{t.createBill}</h2>
          </div>

          <div className="bill-date">
            <span>{t.date}</span>
            <strong>
              {new Date().toLocaleDateString(
                language === "hi" ? "hi-IN" : "en-IN"
              )}
            </strong>
          </div>
        </div>

        {/* CUSTOMER */}

        <section className="section-card">
          <div className="section-heading">
            <span>01</span>
            <div>
              <h3>{t.customerInfo}</h3>
              <p>{t.customerInfoDesc}</p>
            </div>
          </div>

          <div className="two-fields">
            <div className="field">
              <label>{t.customerName}</label>
              <input
                type="text"
                placeholder={t.customerNamePlaceholder}
                value={customerName}
                maxLength={60}
                autoComplete="name"
                aria-invalid={Boolean(customerErrors.name)}
                onChange={(event) => {
                  setCustomerName(event.target.value);
                  if (customerErrors.name) setCustomerErrors((prev) => ({ ...prev, name: "" }));
                }}
              />
              {customerErrors.name && <small className="billbox-customer-error">{customerErrors.name}</small>}
            </div>

            <div className="field">
              <label>{t.mobile}</label>
              <input
                type="tel"
                inputMode="numeric"
                placeholder={t.mobilePlaceholder}
                value={customerMobile}
                maxLength={16}
                autoComplete="tel"
                aria-invalid={Boolean(customerErrors.mobile)}
                onChange={(event) => {
                  const nextValue = event.target.value.replace(/[^0-9+\s()-]/g, "").slice(0, 16);
                  setCustomerMobile(nextValue);
                  if (customerErrors.mobile) setCustomerErrors((prev) => ({ ...prev, mobile: "" }));
                }}
              />
              <small className="billbox-whatsapp-hint">
                {language === "hi"
                  ? "यह नंबर ग्राहक का WhatsApp नंबर होना चाहिए। बिल इसी नंबर पर साझा होगा।"
                  : "Enter the customer's WhatsApp number. The bill will be shared to this number."}
              </small>
              {customerErrors.mobile && <small className="billbox-customer-error">{customerErrors.mobile}</small>}
            </div>
          </div>
        </section>

        {/* JEWELLERY */}

        <section className="section-card jewellery-section-card">
          <div className="section-heading">
            <span>02</span>
            <div>
              <h3>{t.chooseJewellery}</h3>
              <p>{t.chooseJewelleryDesc}</p>
            </div>
          </div>

          <div className="metal-selection">
            <button
              type="button"
              className={`metal-card ${metal === "gold" ? "active" : ""}`}
              onClick={() => handleMetalChange("gold")}
            >
              <div className="metal-symbol gold-symbol">Au</div>
              <div>
                <strong>{t.gold}</strong>
                <span>{t.goldJewellery}</span>
              </div>
              <b>{metal === "gold" ? "✓" : "→"}</b>
            </button>

            <button
              type="button"
              className={`metal-card ${metal === "silver" ? "active" : ""}`}
              onClick={() => handleMetalChange("silver")}
            >
              <div className="metal-symbol silver-symbol">Ag</div>
              <div>
                <strong>{t.silver}</strong>
                <span>{t.silverJewellery}</span>
              </div>
              <b>{metal === "silver" ? "✓" : "→"}</b>
            </button>
          </div>

          {metal && (
            <div className="selection-area">
              <div className="field item-search-field" ref={itemPickerRef}>
                <label>{t.itemType}</label>
                <div className="item-search-control">
                  <input
                    type="search"
                    value={itemInputValue}
                    placeholder={language === "hi" ? "आभूषण का नाम खोजें या नया नाम लिखें..." : "Search jewellery or type a new item name..."}
                    onFocus={() => {
                      if (selectedCatalogueEntry) setItemSearch("");
                      setItemDropdownOpen(true);
                    }}
                    onClick={() => {
                      if (selectedCatalogueEntry) setItemSearch("");
                      setItemDropdownOpen(true);
                    }}
                    onChange={(event) => {
                      setItemSearch(event.target.value);
                      setItem("");
                      setItemDropdownOpen(true);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setItemDropdownOpen(false);
                      if (event.key === "Enter" && itemSearch.trim() && !exactItemMatch) {
                        event.preventDefault();
                        applyCustomItemName();
                      }
                    }}
                    autoComplete="off"
                    aria-expanded={itemDropdownOpen}
                    aria-controls="jewellery-item-options"
                  />
                  <span className={`item-search-chevron ${itemDropdownOpen ? "open" : ""}`}>⌄</span>
                </div>
                {itemDropdownOpen && (
                  <div className="item-search-results" id="jewellery-item-options" role="listbox">
                    <div className="item-search-results-heading">
                      {itemSearch.trim() ? (language === "hi" ? "मिलते-जुलते आइटम" : "Matching items") : (language === "hi" ? "सभी उपलब्ध आइटम" : "All available items")}
                      <span>{filteredItemCatalogue.length}</span>
                    </div>
                    {filteredItemCatalogue.length > 0 ? filteredItemCatalogue.map((entry) => (
                      <button type="button" key={entry.value} role="option" aria-selected={item === entry.value} className={`item-search-option ${item === entry.value ? "selected" : ""}`} onClick={() => chooseCatalogueItem(entry)}>
                        <span>{entry[language]}</span>
                      </button>
                    )) : (
                      <div className="item-search-empty">{language === "hi" ? "कोई मिलता-जुलता आइटम नहीं मिला।" : "No matching item found."}</div>
                    )}
                    {itemSearch.trim() && !exactItemMatch && (
                      <button type="button" className="item-search-custom" onClick={applyCustomItemName}>
                        <span>＋</span> {language === "hi" ? `“${itemSearch.trim()}” को नए आइटम के रूप में जोड़ें` : `Add “${itemSearch.trim()}” as a custom item`}
                      </button>
                    )}
                  </div>
                )}
                {item && (
                  <small className="item-selected-note">
                    {language === "hi" ? "चयनित आइटम:" : "Selected item:"} {getItemLabel(item, metal, language)}
                  </small>
                )}
              </div>

              {(metal === "gold" || metal === "silver") && (
                <div className="field">
                  <label>{t.purity}</label>
                  <select
                    className="purity-select"
                    value={carat}
                    onChange={(event) =>
                      handleCaratChange(event.target.value)
                    }
                  >
                    <option value="">{t.selectCarat}</option>
                    {["24K", "22K", "20K", "18K", "16K", "14K"].map(
                      (value) => (
                        <option value={value} key={value}>
                          {value.replace("K", "")} {language === "hi" ? "कैरेट" : "Carat"}
                        </option>
                      )
                    )}
                  </select>
                </div>
              )}
            </div>
          )}

          {metal && item && (
            <div className="billing-fields">
              <div className="field">
                <label>{t.quantity}</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(event.target.value)
                  }
                />
              </div>

              <div className="field">
                <label>
                  {t.weight}
                  <small> ({t.gram})</small>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={weight}
                  onChange={(event) =>
                    setWeight(event.target.value)
                  }
                />
              </div>

              <div className="field rate-entry-field">
                <label>{t.rate}</label>
                <select
                  className="rate-unit-select"
                  value={rateUnit}
                  onChange={(event) => setRateUnit(event.target.value)}
                  aria-label={language === "hi" ? "दर की इकाई" : "Rate unit"}
                >
                  <option value="1g">{language === "hi" ? "प्रति 1 ग्राम" : "Per 1 Gram"}</option>
                  <option value="10g">{language === "hi" ? "प्रति 10 ग्राम" : "Per 10 Grams"}</option>
                  <option value="1kg">{language === "hi" ? "प्रति 1 किलो" : "Per 1 KG"}</option>
                </select>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={
                    matchingRate
                      ? `${t.previousRate}${formatMoney(matchingRate)}`
                      : t.enterRate
                  }
                  value={rate}
                  onChange={(event) => setRate(event.target.value)}
                />
                {matchingRate && !rate && (
                  <small className="rate-hint">{t.rateAvailable}</small>
                )}
              </div>

              <div className="field">
                <label>{t.making}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={t.makingPlaceholder}
                  value={itemMaking}
                  onChange={(event) => setItemMaking(event.target.value)}
                />
              </div>

              <div className="field">
                <label>{t.otherCharges}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={t.otherChargesPlaceholder}
                  value={itemOtherCharges}
                  onChange={(event) => setItemOtherCharges(event.target.value)}
                />
              </div>

              <div className="field">
                <label>{language === "hi" ? "इस आइटम पर GST (%)" : "GST on this item (%)"}</label>
                <select value={itemGstRate} onChange={(event) => setItemGstRate(event.target.value)}>
                  <option value="">{language === "hi" ? "दुकान की डिफॉल्ट दर" : "Shop default rate"}</option>
                  {Array.from({ length: 101 }, (_, index) => index).map((value) => (
                    <option value={value} key={value}>{value}%</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>{t.hsn} <small>({t.hsnOptional})</small></label>
                <input
                  type="text"
                  maxLength="8"
                  placeholder="HSN"
                  value={hsnCode}
                  onChange={(event) => setHsnCode(event.target.value)}
                />
              </div>

              <div className="field">
                <label>{t.sku} <small>({t.hsnOptional})</small></label>
                <input
                  type="text"
                  maxLength="40"
                  placeholder="SKU / Item Code"
                  value={skuCode}
                  onChange={(event) => setSkuCode(event.target.value)}
                />
              </div>

              <div className="field">
                <label>{t.huid} <small>({t.huidOptional})</small></label>
                <input
                  type="text"
                  maxLength="20"
                  placeholder="HUID"
                  value={huid}
                  onChange={(event) => setHuid(event.target.value.toUpperCase())}
                />
              </div>

              <button
                type="button"
                className="print-bill add-item-button"
                onClick={addItem}
              >
                {t.addItem} <span>+</span>
              </button>
            </div>
          )}

          {/* ADDED ITEMS */}

          {items.length > 0 && (
            <div className="added-items">
              <div className="section-heading">
                <span>03</span>
                <div>
                  <h3>{t.addedItems}</h3>
                  <p>{t.addedItemsDesc}</p>
                </div>
              </div>

              <div className="added-items-list">
                {items.map((line, index) => {
                  const detail = getLineDetails(line);
                  return (
                    <article className="added-item-card" key={line.id}>
                      <div className="added-item-card-head">
                        <div className="added-item-title">
                          <span className="added-item-index">{String(index + 1).padStart(2, "0")}</span>
                          <div>
                            <strong>{line.itemKey ? getItemLabel(line.itemKey, line.metal, language) : line.itemName}</strong>
                            <small>
                              {line.metal === "gold" ? t.gold : t.silver}
                              {line.carat ? ` • ${line.carat}` : ""}
                              {" • "}{line.quantity} {t.pieces}
                              {" • "}{line.weight} {t.gram}
                            </small>
                          </div>
                        </div>
                        <div className="added-item-total">
                          <span>{t.lineTotal}</span>
                          <strong>₹ {formatMoney(detail.total)}</strong>
                        </div>
                        <button
                          type="button"
                          className="remove-item-button"
                          onClick={() => removeItem(line.id)}
                          aria-label={t.removeItem}
                          title={t.removeItem}
                        >
                          ×
                        </button>
                      </div>

                      <div className="added-item-breakup">
                        <div><span>{t.metalValue}</span><strong>₹ {formatMoney(detail.metalValue)}</strong></div>
                        <div><span>{t.making}</span><strong>₹ {formatMoney(detail.makingValue)}</strong></div>
                        <div><span>{t.otherCharges}</span><strong>₹ {formatMoney(detail.otherValue)}</strong></div>
                        {detail.gstRate > 0 && <div><span>{t.gst} ({detail.gstRate}%)</span><strong>₹ {formatMoney(detail.gstAmount)}</strong></div>}
                        <div><span>{t.rate} ({getRateUnitLabel(line.rateUnit, line.metal, language)})</span><strong>₹ {formatMoney(line.rate, 0)}</strong></div>
                      </div>

                      {(line.hsnCode || line.skuCode || line.huid) && (
                        <div className="added-item-codes">
                          {line.hsnCode && <span>{t.hsn}: <b>{line.hsnCode}</b></span>}
                          {line.skuCode && <span>{t.sku}: <b>{line.skuCode}</b></span>}
                          {line.huid && <span>{t.huid}: <b>{line.huid}</b></span>}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* BILLING DETAILS + PAYMENT */}

        <section className="section-card">
          <div className="section-heading">
            <span>04</span>
            <div>
              <h3>{t.billingDetails}</h3>
              <p>{language === "hi"
                ? "ऑफर पूरे बिल से एक बार घटेगा। GST हर आइटम की चुनी हुई दर से लगेगा; मेकिंग और अन्य चार्ज रुपये में हैं।"
                : "Offer is deducted once from the combined bill total. GST is calculated item-wise; making and other charges are fixed rupee amounts."}</p>
            </div>
          </div>

          <div className="billing-fields billing-extra-fields">
            <div className="field">
              <label>{t.offer} <em>{t.wholeBill}</em></label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="₹ 0"
                value={offer}
                onChange={(event) => setOffer(event.target.value)}
              />
            </div>
            <div className="field">
              <label>{t.paid}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder={t.paidPlaceholder}
                value={paidAmount}
                onChange={(event) => setPaidAmount(event.target.value)}
              />
            </div>
            <div className="field">
              <label>{t.billType}</label>
              <select value={billType} onChange={(event) => setBillType(event.target.value)}>
                <option value="estimate">{t.estimateBill}</option>
                <option value="tax">{t.taxInvoice}</option>
              </select>
            </div>
          </div>
        </section>

        {/* TOTAL */}

        <section className="total-card">
          <div className="total-left">
            <div>
              <span>{t.allItems}</span>
              <strong>₹ {formatMoney(baseAmount)}</strong>
            </div>
            {makingAmount > 0 && (
              <div><span>{t.makingTotal}</span><strong>₹ {formatMoney(makingAmount)}</strong></div>
            )}
            {otherChargesAmount > 0 && (
              <div><span>{t.otherChargesTotal}</span><strong>₹ {formatMoney(otherChargesAmount)}</strong></div>
            )}
            {offerAmount > 0 && (
              <div><span>{t.offer}</span><strong className="discount">− ₹ {formatMoney(offerAmount)}</strong></div>
            )}
            <div><span>{t.subtotal}</span><strong>₹ {formatMoney(subtotal)}</strong></div>
            {gstAmount > 0 && (
              <div><span>{t.gst} ({language === "hi" ? "आइटम अनुसार" : "Item-wise"})</span><strong>₹ {formatMoney(gstAmount)}</strong></div>
            )}
          </div>

          <div className="total-right">
            <div className="final-total">
              <span>{t.total}</span>
              <strong>₹ {formatMoney(grandTotal)}</strong>
            </div>
            <div className="payment-summary">
              <div><span>{t.paid}</span><strong>₹ {formatMoney(receivedAmount)}</strong></div>
              <div className="balance-row"><span>{t.balance}</span><strong>₹ {formatMoney(balanceAmount)}</strong></div>
              <small>{t.paymentStatus}: {paymentStatus === "paid" ? t.paidStatus : paymentStatus === "partial" ? t.partialStatus : t.dueStatus}</small>
            </div>
          </div>

          <button
            type="button"
            className="print-bill"
            onClick={handlePrint}
            disabled={isPrinting || items.length === 0}
          >
            {isPrinting ? t.printing : t.print}
            <span>→</span>
          </button>
        </section>
      </main>

      {/* PRINT INVOICE */}

      <div className="print-invoice">
        <div className="print-header">
          <div className="print-shop">
            {shopProfile.logoUrl && (
              <img
                src={shopProfile.logoUrl}
                alt={shopProfile.shopName}
              />
            )}

            <div>
              <h1>{shopProfile.shopName}</h1>
              <p>{language === "hi" ? "ज्वेलर्स" : "JEWELLERS"}</p>
              <span>
                {t.trust} • {t.purityFooter} • {t.beauty}
              </span>
            </div>
          </div>

          <div className="print-bill-info">
            <div>
              <span>{t.billNumber}</span>
              <strong>{billNumber}</strong>
              <small>{billType === "tax" ? t.taxInvoiceNote : t.invoiceEstimateNote}</small>
            </div>

            <div>
              <span>{t.date}</span>
              <strong>
                {(printDateTime || new Date()).toLocaleDateString(
                  language === "hi" ? "hi-IN" : "en-IN"
                )}
              </strong>

              {printDateTime && (
                <small>
                  {t.time}:{" "}
                  {printDateTime.toLocaleTimeString(
                    language === "hi" ? "hi-IN" : "en-IN",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </small>
              )}
            </div>
          </div>
        </div>

        <div className="print-line" />

        {/* CUSTOMER + SHOP DETAILS */}

        <div className="print-info-grid">
          <div className="print-info-box">
            <h3>{t.customerDetails}</h3>

            <p className="customer-detail">
              <strong>{t.name}</strong>
              <span>-</span>
              <b>{customerName || "-"}</b>
            </p>

            <p className="customer-detail">
              <strong>{t.number}</strong>
              <span>-</span>
              <b>{customerMobile || "-"}</b>
            </p>
          </div>

          <div className="print-info-box shop-details">
            <h3>{t.shopDetails}</h3>
            <strong>{shopProfile.shopName}</strong>

            {shopProfile.phone && (
              <p>
                {shopProfile.phone}
                {shopProfile.alternatePhone
                  ? `, ${shopProfile.alternatePhone}`
                  : ""}
              </p>
            )}

            {shopProfile.gstNumber && (
              <p className="shop-gstin">
                {t.gstin}: <span>{shopProfile.gstNumber}</span>
              </p>
            )}
          </div>
        </div>

        {/* ITEMS */}

        <div className="print-section-title">
          {t.printTitle}
        </div>

        <div className="print-items-list">
          {items.map((line, index) => {
            const detail = getLineDetails(line);
            const itemName = (line.itemKey
              ? getItemLabel(line.itemKey, line.metal, language)
              : line.itemName) || t.item;
            const codeParts = [
              line.hsnCode ? `HSN ${line.hsnCode}` : "",
              line.skuCode ? `SKU ${line.skuCode}` : "",
              line.huid ? `HUID ${line.huid}` : "",
            ].filter(Boolean);

            return (
              <div className="print-item-box" key={line.id}>
                <div className="print-item-main print-item-cell" title={itemName}>
                  <span className="print-cell-label">{t.item}</span>
                  <div className="print-item-name-wrap">
                    <h3>{String(index + 1).padStart(2, "0")} · {itemName}</h3>
                    <p>{line.metal === "gold" ? t.gold : t.silver}{line.carat ? ` · ${line.carat}` : ""}</p>
                  </div>
                </div>

                <div className="print-item-cell"><span className="print-cell-label">{t.quantity}</span><strong>{line.quantity}</strong></div>
                <div className="print-item-cell"><span className="print-cell-label">{t.weight}</span><strong>{line.weight}g</strong></div>
                <div className="print-item-cell"><span className="print-cell-label">{t.rate} ({getRateUnitLabel(line.rateUnit, line.metal, language)})</span><strong>₹{formatMoney(line.rate, 0)}</strong></div>
                {line.carat && <div className="print-item-cell"><span className="print-cell-label">{t.purity}</span><strong>{line.carat}</strong></div>}
                <div className="print-item-cell"><span className="print-cell-label">{t.metalValue}</span><strong>₹{formatMoney(detail.metalValue)}</strong></div>
                {detail.makingValue > 0 && <div className="print-item-cell"><span className="print-cell-label">{t.making}</span><strong>₹{formatMoney(detail.makingValue)}</strong></div>}
                {detail.otherValue > 0 && <div className="print-item-cell"><span className="print-cell-label">{t.otherCharges}</span><strong>₹{formatMoney(detail.otherValue)}</strong></div>}
                {detail.gstRate > 0 && <div className="print-item-cell print-item-gst"><span className="print-cell-label">{t.gst} ({detail.gstRate}%)</span><strong>₹{formatMoney(detail.gstAmount)}</strong></div>}
                {codeParts.length > 0 && <div className="print-item-cell print-item-codes" title={codeParts.join(" · ")}><span className="print-cell-label">{t.hsn} / SKU / HUID</span><strong>{codeParts.join(" · ")}</strong></div>}
                <div className="print-item-line-total print-item-cell"><span className="print-cell-label">{t.lineTotal}</span><strong>₹{formatMoney(detail.total)}</strong></div>
              </div>
            );
          })}
        </div>

        {/* AMOUNT + PAYMENT SUMMARY */}

        <div className="print-summary-wrap">
          <div className="print-charge-strip">
            <div><span>{t.makingTotal}</span><strong>₹ {formatMoney(makingAmount)}</strong></div>
            <div><span>{t.otherChargesTotal}</span><strong>₹ {formatMoney(otherChargesAmount)}</strong></div>
            <div><span>{t.discount}</span><strong>− ₹ {formatMoney(offerAmount)}</strong></div>
            {gstAmount > 0 && <div><span>{t.gstTotal}</span><strong>₹ {formatMoney(gstAmount)}</strong></div>}
          </div>

          <div className="print-amount-section">
            <div className="print-amount-row">
              <span>{t.allItems}</span>
              <strong>₹ {formatMoney(baseAmount)}</strong>
            </div>
            <div className="print-subtotal">
              <span>{t.subtotal}</span>
              <strong>₹ {formatMoney(subtotal)}</strong>
            </div>
            {gstAmount > 0 && (
              <div className="print-amount-row">
                <span>{t.gst} ({language === "hi" ? "आइटम अनुसार" : "Item-wise"})</span>
                <strong>₹ {formatMoney(gstAmount)}</strong>
              </div>
            )}
            <div className="print-grand-total">
              <span>{t.total}</span>
              <strong>₹ {formatMoney(grandTotal)}</strong>
            </div>
            <div className="print-payment-box">
              <div><span>{t.paid}</span><strong>₹ {formatMoney(receivedAmount)}</strong></div>
              <div><span>{t.balance}</span><strong>₹ {formatMoney(balanceAmount)}</strong></div>
            </div>
          </div>
        </div>
        {/* FOOTER */}

        <div className="print-footer">
          <div>
            <strong>{t.thanks}</strong>
            <p>{t.thanksDesc}</p>
          </div>

          <div className="print-signature">
            <div />
            <span>{t.signature}</span>
          </div>
        </div>

        <div className="print-bottom">
          <strong>{shopProfile.shopName}</strong>

          {shopProfile.tagline && (
            <span>{shopProfile.tagline}</span>
          )}

          {shopProfile.address && (
            <span>{shopProfile.address}</span>
          )}

          {shopProfile.phone && (
            <span>{shopProfile.phone}</span>
          )}

          {shopProfile.gstNumber && (
            <span>
              {t.gstin}: {shopProfile.gstNumber}
            </span>
          )}
        </div>
      </div>

      {pendingPrintConfirmation && (
        <div className="billbox-share-backdrop" role="presentation">
          <section className={`billbox-share-dialog billbox-save-dialog bill-theme-${theme}`} role="dialog" aria-modal="true" aria-labelledby="billbox-print-confirm-title">
            <div className="billbox-share-success-icon">✓</div>
            <span className="billbox-share-eyebrow">BILLBOX <span aria-hidden="true">·</span> INVOICE</span>
            <h2 id="billbox-print-confirm-title">
              {language === "hi" ? "बिल सेव करके WhatsApp पर साझा करें?" : "Save the bill and share it on WhatsApp?"}
            </h2>
            <p>
              {language === "hi"
                ? "आपका बिल PDF नए टैब में खुल गया है। आगे बढ़ने पर बिल डेटाबेस में सेव होगा और फिर ग्राहक का WhatsApp नंबर कन्फर्म करने का विकल्प आएगा।"
                : "Your invoice PDF has opened in a new tab. Continue to save this bill in the database, then confirm the customer's WhatsApp number before opening the chat."}
            </p>
            <div className="billbox-share-summary">
              <span>{language === "hi" ? "बिल नंबर" : "Invoice number"}</span>
              <strong>{billNumber}</strong>
              <span>{language === "hi" ? "ग्राहक का नाम" : "Customer name"}</span>
              <strong>{customerName}</strong>
              <span>{language === "hi" ? "कुल देय राशि" : "Total amount"}</span>
              <strong>₹ {formatMoney(grandTotal)}</strong>
            </div>
            <div className="billbox-share-actions billbox-invoice-actions">
              <button type="button" className="billbox-share-cancel" onClick={cancelPrintConfirmation} disabled={isSavingBill}>
                {language === "hi" ? "नहीं, अभी नहीं" : "No, cancel"}
              </button>
              <button type="button" className="billbox-share-primary" onClick={confirmPrintedAndSave} disabled={isSavingBill}>
                {isSavingBill
                  ? (language === "hi" ? "सेव हो रहा है..." : "Saving...")
                  : (language === "hi" ? "सेव करें और WhatsApp पर भेजें" : "Save & Send on WhatsApp")}
              </button>
            </div>
          </section>
        </div>
      )}

      {whatsAppConfirmOpen && pendingBillData && (
        <div className="billbox-share-backdrop" role="presentation">
          <section
            className={`billbox-share-dialog billbox-save-dialog bill-theme-${theme}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="billbox-whatsapp-confirm-title"
          >
            <div className="billbox-share-success-icon">✓</div>
            <span className="billbox-share-eyebrow">BILLBOX <span aria-hidden="true">·</span> WHATSAPP</span>
            <h2 id="billbox-whatsapp-confirm-title">
              {language === "hi"
                ? "क्या यह ग्राहक का WhatsApp नंबर है?"
                : "Is this the customer's WhatsApp number?"}
            </h2>
            <p>
              {language === "hi"
                ? "बिल डेटाबेस में सेव हो चुका है। नंबर सही है तो पुष्टि करें। गलत है तो यहीं बदलें; नया नंबर बिल के रिकॉर्ड में भी अपडेट होगा।"
                : "The bill is saved in the database. Confirm this number, or edit it here. An edited number will also be updated in the saved bill record."}
            </p>

            <div className="billbox-whatsapp-number-field">
              <label htmlFor="billbox-whatsapp-number">
                {language === "hi" ? "ग्राहक का WhatsApp नंबर" : "Customer WhatsApp number"}
              </label>
              <div className="billbox-whatsapp-number-input">
                <span>+91</span>
                <input
                  id="billbox-whatsapp-number"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={14}
                  value={whatsAppMobile}
                  onChange={(event) => setWhatsAppMobile(
                    event.target.value.replace(/[^0-9+\s()-]/g, "").slice(0, 16)
                  )}
                  placeholder={language === "hi" ? "10 अंकों का नंबर" : "10-digit mobile number"}
                />
              </div>
              <small>
                {language === "hi"
                  ? "नंबर बदलने पर Firestore में भी customerMobile अपडेट होगा।"
                  : "If changed, customerMobile will also be updated in Firestore."}
              </small>
            </div>

            <div className="billbox-share-summary">
              <span>{language === "hi" ? "बिल नंबर" : "Invoice number"}</span>
              <strong>{pendingBillData.billNumber}</strong>
              <span>{language === "hi" ? "कुल राशि" : "Total amount"}</span>
              <strong>₹ {formatMoney(pendingBillData.grandTotal)}</strong>
            </div>

            <div className="billbox-share-actions billbox-invoice-actions">
              <button
                type="button"
                className="billbox-share-cancel"
                onClick={closeWhatsAppConfirmation}
                disabled={isOpeningWhatsApp}
              >
                {language === "hi" ? "अभी नहीं" : "Not now"}
              </button>
              <button
                type="button"
                className="billbox-share-primary"
                onClick={confirmWhatsAppAndOpen}
                disabled={isOpeningWhatsApp}
              >
                {isOpeningWhatsApp
                  ? (language === "hi" ? "खोल रहा है..." : "Opening...")
                  : (language === "hi" ? "पुष्टि करें और WhatsApp खोलें" : "Confirm & Open WhatsApp")}
              </button>
            </div>
          </section>
        </div>
      )}

      {gstDialogOpen && (
        <div className="gst-setup-backdrop" role="presentation">
          <div className="gst-setup-dialog" role="dialog" aria-modal="true" aria-labelledby="gst-setup-title">
            <div className="gst-setup-icon">%</div>
            <h2 id="gst-setup-title">{language === "hi" ? "दुकान की GST दर सेट करें" : "Set Shop GST Rate"}</h2>
            <p>{language === "hi"
              ? "इस दुकान में GST दर सेव नहीं है। पक्का बिल बनाने से पहले GST दर चुनें। यह दर दुकान के डेटाबेस में सेव होगी और अगले बिलों में अपने आप उपयोग होगी।"
              : "No GST rate is saved for this shop. Select a rate before creating the tax invoice. It will be saved to the shop database and reused automatically for future bills."}</p>
            <label htmlFor="bill-gst-rate">{language === "hi" ? "GST दर चुनें" : "Select GST Rate"}</label>
            <select id="bill-gst-rate" value={gstDialogRate} onChange={(event) => setGstDialogRate(event.target.value)}>
              {Array.from({ length: 101 }, (_, index) => index).map((value) => (
                <option value={value} key={value}>{value}%</option>
              ))}
            </select>
            <div className="gst-setup-actions">
              <button type="button" className="gst-setup-cancel" onClick={() => setGstDialogOpen(false)} disabled={gstSaving}>
                {language === "hi" ? "रद्द करें" : "Cancel"}
              </button>
              <button type="button" className="gst-setup-save" onClick={saveGstRateAndContinue} disabled={gstSaving}>
                {gstSaving
                  ? (language === "hi" ? "सेव हो रहा है..." : "Saving...")
                  : (language === "hi" ? "सेव करें और बिल प्रिंट करें" : "Save & Print Invoice")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN FOOTER */}

      <footer className="shop-footer">
        <strong>{shopProfile.shopName}</strong>

        {shopProfile.tagline && (
          <span>{shopProfile.tagline}</span>
        )}

        {shopProfile.address && (
          <span>{shopProfile.address}</span>
        )}

        {shopProfile.phone && (
          <span>{shopProfile.phone}</span>
        )}
      </footer>
    </div>
  );
}

export default NewBill;