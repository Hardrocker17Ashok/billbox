import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import PageLoader from "../components/PageLoader";
import "./NewBill.css";

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
    mobile: "मोबाइल नंबर",
    mobilePlaceholder: "मोबाइल नंबर दर्ज करें",
    chooseJewellery: "आभूषण चुनें",
    chooseJewelleryDesc: "सोना या चाँदी चुनें",
    gold: "सोना",
    silver: "चाँदी",
    goldJewellery: "सोने के आभूषण",
    silverJewellery: "चाँदी के आभूषण",
    itemType: "आभूषण का प्रकार",
    selectItem: "आभूषण चुनें",
    purity: "सोने की शुद्धता",
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
    choosePurity: "कृपया सोने की शुद्धता (कैरेट) चुनें।",
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
    mobile: "Mobile Number",
    mobilePlaceholder: "Enter mobile number",
    chooseJewellery: "Choose Jewellery",
    chooseJewelleryDesc: "Select gold or silver",
    gold: "Gold",
    silver: "Silver",
    goldJewellery: "Gold Jewellery",
    silverJewellery: "Silver Jewellery",
    itemType: "Jewellery Type",
    selectItem: "Select jewellery",
    purity: "Gold Purity",
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
    choosePurity: "Please select gold purity (carat).",
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
] ;

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
] ;

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

  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");

  const [metal, setMetal] = useState("");
  const [item, setItem] = useState("");
  const [carat, setCarat] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [weight, setWeight] = useState("");
  const [rate, setRate] = useState("");
  const [itemMaking, setItemMaking] = useState("");
  const [itemOtherCharges, setItemOtherCharges] = useState("");
  const [itemGstRate, setItemGstRate] = useState("");
  const [gstDialogOpen, setGstDialogOpen] = useState(false);
  const [gstDialogRate, setGstDialogRate] = useState("3");
  const [gstSaving, setGstSaving] = useState(false);
  const [continuePrintAfterGst, setContinuePrintAfterGst] = useState(false);
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

    return line.metal === "gold"
      ? (itemWeight * itemRate) / 10
      : (itemWeight * itemRate) / 1000;
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

  const matchingRate = items.find(
    (line) => line.rateKey === rateKey
  )?.rate;

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
      setContinuePrintAfterGst(true);
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
    setCarat("");
    setWeight("");
    setQuantity(1);
    setRate("");
    setItemMaking("");
    setItemOtherCharges("");
    setItemGstRate(shopProfile.gstRate === null || shopProfile.gstRate === undefined ? "" : String(shopProfile.gstRate));
    setHsnCode("");
    setSkuCode("");
    setHuid("");
  };

  const handleCaratChange = (value) => {
    setCarat(value);

    const existing = items.find(
      (line) => line.rateKey === `gold-${value}`
    );

    setRate(existing ? String(existing.rate) : "");
  };

  const handleItemChange = (value) => {
    setItem(value);

    if (metal === "silver") {
      const existing = items.find(
        (line) => line.rateKey === `silver-${value}`
      );

      setRate(existing ? String(existing.rate) : "");
    }
  };

  const addItem = () => {
    if (!metal || !item) {
      window.alert(t.chooseMetalItem);
      return;
    }

    if (metal === "gold" && !carat) {
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
      carat: metal === "gold" ? carat : "",
      quantity: Number(quantity),
      weight: Number(weight),
      rate: Number(rate),
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
    setCarat("");
    setQuantity(1);
    setWeight("");
    setRate("");
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

  const handlePrint = async (skipGstSetup = false) => {
    if (!user) {
      window.alert(t.loginRequired);
      return;
    }

    if (!customerName.trim()) {
      window.alert(t.customerRequired);
      return;
    }

    if (!customerMobile.trim()) {
      window.alert(t.mobileRequired);
      return;
    }

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

    if (billType === "tax" && !skipGstSetup && (shopProfile.gstRate === null || shopProfile.gstRate === undefined || shopProfile.gstRate === "")) {
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

    const billItems = items.map((line) => {
      const detail = getLineDetails(line);
      return {
        itemName: line.itemKey
          ? getItemLabel(line.itemKey, line.metal, language)
          : line.itemName,
        itemKey: line.itemKey || "",
        metal: line.metal,
        carat: line.metal === "gold" ? line.carat : "",
        quantity: Number(line.quantity) || 0,
        weight: Number(line.weight) || 0,
        rate: Number(line.rate) || 0,
        // Complete item-wise values are saved so Bill History can reproduce
        // exactly the same row and calculation as the printed invoice.
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

      // Shop snapshot: keeps the shop details used on this invoice.
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

      customerName: customerName.trim(),
      customerMobile: customerMobile.trim(),

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

      // Backward compatibility with existing BillHistory records.
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

      createdAt: serverTimestamp(),
      printedAt: serverTimestamp(),
    };

    try {
      // Save first so a printed invoice is not silently missing from Firestore.
      await addDoc(collection(db, "bills"), billData);

      setBillNumber(generatedBillNumber);
      setPrintDateTime(now);

      // Allow React to render the generated invoice details before printing.
      window.setTimeout(() => {
        window.print();
        setIsPrinting(false);
      }, 150);
    } catch (error) {
      console.error(
        "Bill save error:",
        error?.code,
        error?.message,
        error
      );

      setIsPrinting(false);

      window.alert(
        `${t.saveError} ${error?.code || error?.message || ""}`
      );
    }
  };

  useEffect(() => {
    if (continuePrintAfterGst && shopProfile.gstRate !== null && shopProfile.gstRate !== undefined) {
      setContinuePrintAfterGst(false);
      handlePrint(true);
    }
  }, [continuePrintAfterGst, shopProfile.gstRate]);

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
                onChange={(event) =>
                  setCustomerName(event.target.value)
                }
              />
            </div>

            <div className="field">
              <label>{t.mobile}</label>
              <input
                type="tel"
                inputMode="numeric"
                placeholder={t.mobilePlaceholder}
                value={customerMobile}
                onChange={(event) =>
                  setCustomerMobile(event.target.value)
                }
              />
            </div>
          </div>
        </section>

        {/* JEWELLERY */}

        <section className="section-card">
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
              <div className="field">
                <label>{t.itemType}</label>
                <select
                  value={item}
                  onChange={(event) =>
                    handleItemChange(event.target.value)
                  }
                >
                  <option value="">{t.selectItem}</option>
                  {(metal === "gold" ? GOLD_ITEMS : SILVER_ITEMS).map(
                    (entry) => (
                      <option value={entry.value} key={entry.value}>
                        {entry[language]}
                      </option>
                    )
                  )}
                </select>
              </div>

              {metal === "gold" && (
                <div className="field">
                  <label>{t.purity}</label>
                  <select
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

              <div className="field">
                <label>
                  {t.rate}
                  <small>
                    {" "}
                    ({metal === "gold" ? t.per10Gram : t.perKg})
                  </small>
                </label>
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
                  onChange={(event) =>
                    setRate(event.target.value)
                  }
                />
                {matchingRate && !rate && (
                  <small className="rate-hint">
                    {t.rateAvailable}
                  </small>
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
                              {line.metal === "gold" ? `${t.gold} • ${line.carat}` : t.silver}
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
                        <div><span>{t.rate}</span><strong>₹ {formatMoney(line.rate, 0)}</strong></div>
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
                    <p>{line.metal === "gold" ? `${t.gold}${line.carat ? ` · ${line.carat}` : ""}` : t.silver}</p>
                  </div>
                </div>

                <div className="print-item-cell"><span className="print-cell-label">{t.quantity}</span><strong>{line.quantity}</strong></div>
                <div className="print-item-cell"><span className="print-cell-label">{t.weight}</span><strong>{line.weight}g</strong></div>
                <div className="print-item-cell"><span className="print-cell-label">{t.rate}</span><strong>₹{formatMoney(line.rate, 0)}</strong></div>
                {line.metal === "gold" && <div className="print-item-cell"><span className="print-cell-label">{t.purity}</span><strong>{line.carat}</strong></div>}
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