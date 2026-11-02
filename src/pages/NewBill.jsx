import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
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
  logoUrl: "",
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
    addedItemsDesc: "समान आभूषण और समान कैरेट अपने आप एक साथ जुड़ते हैं।",
    pieces: "नग",
    removeItem: "आइटम हटाएँ",
    billingDetails: "बिल की अतिरिक्त जानकारी",
    billingDetailsDesc: "बनाने का शुल्क और छूट पूरे बिल पर एक बार लागू होगी।",
    making: "बनाने का शुल्क",
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
    addedItemsDesc: "Same jewellery and same carat are combined automatically.",
    pieces: "pcs",
    removeItem: "Remove item",
    billingDetails: "Additional Billing Details",
    billingDetailsDesc: "Making charges and discount are applied once to the entire bill.",
    making: "Making Charges",
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
  },
};

const GOLD_ITEMS = [
  "सोने की अंगूठी",
  "सोने की चेन",
  "सोने का कंगन",
  "सोने का हार",
  "सोने की कान की बाली",
  "सोने का पेंडेंट",
  "सोने की चूड़ी",
  "सोने की नाक की पिन",
  "सोने का माँग टीका",
  "सोने का झूमर",
  "सोने का बोरला",
  "सोने की रखड़ी",
  "सोने का शीशफूल",
  "सोने के कान के आभूषण",
  "सोने का झुमका",
  "सोने की झुमकी",
  "सोने की बाली",
  "सोने के टॉप्स",
  "सोने का सूई-धागा",
  "सोने की कान की चेन",
  "सोने का कर्णफूल",
  "सोने का कुंडल",
  "सोने की मुरकी",
  "सोने की लटकन",
  "सोने के गले के आभूषण",
  "सोने का हार",
  "सोने की नेकलेस",
  "सोने का चोकर",
  "सोने का रानी हार",
  "सोने का लच्छा",
  "सोने की हँसली",
  "सोने की कंठी",
  "सोने की तिमणिया",
  "सोने का मंगलसूत्र",
  "सोने का चंद्रहार",
  "सोने की अंगूठी",
  "सोने की चूड़ी",
  "सोने का कंगन",
  "सोने का ब्रेसलेट",
  "सोने का बाजूबंद",
  "सोने का हथफूल",
  "सोने की पोंची",
  "सोने की गजरा",
  "सोने का कड़ा",
  "सोने का कमरबंद",
  "सोने की तगड़ी",
  "सोने की बिछिया",
  "सोने की चाँट",
  "सोने की पायल",
  "सोने की पाजेब",
  "सोने की नथ",
  "सोने की नथिया",
  "सोने की लौंग",
  "सोने की नथनी",
  "सोने की नोज पिन",
  "सोने की बेसरी",
];

const SILVER_ITEMS = [
  "चाँदी की पायल",
  "चाँदी की बिछिया",
  "चाँदी की पाजेब",
  "चाँदी का कंगन",
  "चाँदी का कड़ा",
  "चाँदी की चूड़ियाँ",
  "चाँदी की अंगूठी",
  "चाँदी का बाजूबंद",
  "चाँदी का हथफूल",
  "चाँदी की पोंची",
  "चाँदी का गजरा",
  "चाँदी का हार",
  "चाँदी की हँसली",
  "चाँदी की कंठी",
  "चाँदी की तिमणिया",
  "चाँदी की मटरमाला",
  "चाँदी का चंदनहार",
  "चाँदी का झुमका, झुमकी",
  "चाँदी की चाँद बालियाँ",
  "चाँदी का कर्णफूल",
  "चाँदी की बाली",
  "चाँदी का कुण्डल",
  "चाँदी का कान पासा",
  "चाँदी की मुरकी",
  "चाँदी का मांग टीका",
  "चाँदी का टीका",
  "चाँदी का बोरला",
  "चाँदी की रखड़ी",
  "चाँदी का शीशफूल",
  "चाँदी की नथ",
  "चाँदी की नथड़ी",
  "चाँदी की नथुनी",
  "चाँदी की नथनी",
  "चाँदी की लौंग",
  "चाँदी की नोज पिन",
  "चाँदी का कमरबंद",
  "चाँदी की तगड़ी",
  "चाँदी की करधनी",
  "चाँदी का कंदोरा",
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
  const [items, setItems] = useState([]);

  const [making, setMaking] = useState("");
  const [offer, setOffer] = useState("");

  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstRate, setGstRate] = useState(3);

  const language = normalizeLanguage(shopProfile.language);
  const theme = normalizeTheme(shopProfile.theme);
  const t = TEXT[language];

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
          setProfileError("missing");
          return;
        }

        const data = shopSnapshot.data();

        setShopProfile({
          ...DEFAULT_PROFILE,
          shopName: data.shopName || DEFAULT_PROFILE.shopName,
          ownerName: data.ownerName || "",
          phone: data.phone || "",
          alternatePhone:
            data.alternatePhone || data.phone2 || "",
          address: data.address || "",
          gstNumber: data.gstNumber || "",
          logoUrl: data.logoUrl || "",
          language: normalizeLanguage(data.language),
          theme: normalizeTheme(data.theme),
        });
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
  // ITEM AMOUNT + BILL TOTALS
  // ============================================

  const getItemAmount = useCallback((line) => {
    const itemWeight = Number(line.weight) || 0;
    const itemRate = Number(line.rate) || 0;

    return line.metal === "gold"
      ? (itemWeight * itemRate) / 10
      : (itemWeight * itemRate) / 1000;
  }, []);

  const baseAmount = useMemo(
    () =>
      items.reduce(
        (total, line) => total + getItemAmount(line),
        0
      ),
    [items, getItemAmount]
  );

  const makingAmount = Math.max(0, Number(making) || 0);
  const offerAmount = Math.max(0, Number(offer) || 0);

  const subtotal = baseAmount + makingAmount - offerAmount;

  const gstAmount = gstEnabled
    ? (Math.max(0, subtotal) * (Number(gstRate) || 0)) / 100
    : 0;

  const grandTotal = Math.max(0, subtotal) + gstAmount;

  const rateKey =
    metal === "gold"
      ? `gold-${carat}`
      : `silver-${item}`;

  const matchingRate = items.find(
    (line) => line.rateKey === rateKey
  )?.rate;

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

    setItems((previous) => {
      const existingIndex = previous.findIndex(
        (line) =>
          line.itemName === item &&
          line.metal === metal &&
          line.carat === (metal === "gold" ? carat : "")
      );

      if (existingIndex !== -1) {
        return previous.map((line, index) =>
          index === existingIndex
            ? {
                ...line,
                quantity:
                  Number(line.quantity) + Number(quantity),
                weight:
                  Number(line.weight) + Number(weight),
                rate: Number(rate),
                rateKey: selectedRateKey,
              }
            : line
        );
      }

      return [
        ...previous,
        {
          id: `${Date.now()}-${Math.random()}`,
          itemName: item,
          metal,
          carat: metal === "gold" ? carat : "",
          quantity: Number(quantity),
          weight: Number(weight),
          rate: Number(rate),
          rateKey: selectedRateKey,
        },
      ];
    });

    setMetal("");
    setItem("");
    setCarat("");
    setQuantity(1);
    setWeight("");
    setRate("");
  };

  const removeItem = (id) => {
    setItems((previous) =>
      previous.filter((line) => line.id !== id)
    );
  };

  // ============================================
  // PRINT + SAVE BILL
  // ============================================

  const handlePrint = async () => {
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

    if (offerAmount > baseAmount + makingAmount) {
      window.alert(t.offerInvalid);
      return;
    }

    if (isPrinting) return;

    setIsPrinting(true);

    const now = new Date();
    const generatedBillNumber = makeBillNumber();

    const billItems = items.map((line) => ({
      itemName: line.itemName,
      metal: line.metal,
      carat: line.metal === "gold" ? line.carat : "",
      quantity: Number(line.quantity) || 0,
      weight: Number(line.weight) || 0,
      rate: Number(line.rate) || 0,
      amount: getItemAmount(line),
    }));

    const billData = {
      ownerId: user.uid,

      // Shop snapshot: keeps the shop details used on this invoice.
      shopName: shopProfile.shopName,
      shopOwnerName: shopProfile.ownerName,
      shopPhone: shopProfile.phone,
      shopAlternatePhone: shopProfile.alternatePhone,
      shopAddress: shopProfile.address,
      shopGstNumber: shopProfile.gstNumber,
      shopLogoUrl: shopProfile.logoUrl,

      billNumber: generatedBillNumber,
      invoiceNo: generatedBillNumber,

      customerName: customerName.trim(),
      customerMobile: customerMobile.trim(),

      items: billItems,

      // Backward compatibility with existing BillHistory records.
      itemName: billItems[0]?.itemName || "",
      metal: billItems[0]?.metal || "",
      carat: billItems[0]?.carat || "",
      quantity: billItems[0]?.quantity || 0,
      weight: billItems[0]?.weight || 0,
      rate: billItems[0]?.rate || 0,

      makingCharges: makingAmount,
      offer: offerAmount,
      gstEnabled,
      gstRate: gstEnabled ? Number(gstRate) || 0 : 0,
      gstAmount,
      subtotal,
      grandTotal,

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
                    (name, index) => (
                      <option value={name} key={`${name}-${index}`}>
                        {name}
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
                {items.map((line, index) => (
                  <div className="added-item-row" key={line.id}>
                    <div>
                      <strong>
                        {String(index + 1).padStart(2, "0")} •{" "}
                        {line.itemName}
                      </strong>
                      <span>
                        {line.metal === "gold"
                          ? `${t.gold} • ${line.carat}`
                          : t.silver}
                      </span>
                    </div>

                    <div>
                      <strong>
                        {line.quantity} {t.pieces}
                      </strong>
                      <span>
                        {line.weight} {t.gram}
                      </span>
                    </div>

                    <div>
                      <strong>
                        ₹ {formatMoney(getItemAmount(line))}
                      </strong>
                      <span>
                        {t.rate} ₹ {formatMoney(line.rate, 0)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(line.id)}
                      aria-label={t.removeItem}
                      title={t.removeItem}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* BILLING DETAILS */}

        <section className="section-card">
          <div className="section-heading">
            <span>04</span>
            <div>
              <h3>{t.billingDetails}</h3>
              <p>{t.billingDetailsDesc}</p>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="message">{t.addItemFirst}</div>
          ) : (
            <div className="billing-fields billing-extra-fields">
              <div className="field">
                <label>
                  {t.making}
                  <em>{t.wholeBill}</em>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="₹ 0"
                  value={making}
                  onChange={(event) =>
                    setMaking(event.target.value)
                  }
                />
              </div>

              <div className="field">
                <label>
                  {t.offer}
                  <em>{t.wholeBill}</em>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="₹ 0"
                  value={offer}
                  onChange={(event) =>
                    setOffer(event.target.value)
                  }
                />
              </div>
            </div>
          )}
        </section>

        {/* GST */}

        <section className="gst-card">
          <div className="gst-info">
            <div className="gst-icon">%</div>
            <div>
              <h3>{t.gst}</h3>
              <p>{t.applyGst}</p>
            </div>
          </div>

          <div className="gst-control">
            <button
              type="button"
              className={`gst-switch ${gstEnabled ? "active" : ""}`}
              onClick={() => setGstEnabled((value) => !value)}
              aria-label={t.gst}
              aria-pressed={gstEnabled}
            >
              <span />
            </button>

            <strong>
              {gstEnabled ? t.gstOn : t.gstOff}
            </strong>

            {gstEnabled && (
              <div className="gst-rate">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={gstRate}
                  onChange={(event) =>
                    setGstRate(event.target.value)
                  }
                />
                <span>%</span>
              </div>
            )}
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
              <div>
                <span>{t.making}</span>
                <strong>₹ {formatMoney(makingAmount)}</strong>
              </div>
            )}

            {offerAmount > 0 && (
              <div>
                <span>{t.offer}</span>
                <strong className="discount">
                  - ₹ {formatMoney(offerAmount)}
                </strong>
              </div>
            )}

            {gstEnabled && (
              <div>
                <span>GST ({gstRate}%)</span>
                <strong>₹ {formatMoney(gstAmount)}</strong>
              </div>
            )}
          </div>

          <div className="final-total">
            <span>{t.total}</span>
            <strong>₹ {formatMoney(grandTotal)}</strong>
          </div>

          <button
            type="button"
            className="print-bill"
            onClick={handlePrint}
            disabled={isPrinting}
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

            {shopProfile.address && (
              <p>{shopProfile.address}</p>
            )}

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
          {items.map((line, index) => (
            <div className="print-item-box" key={line.id}>
              <div className="print-item-main">
                <div className="print-item-number">
                  {String(index + 1).padStart(2, "0")}
                </div>

                <div>
                  <h3>{line.itemName || t.item}</h3>
                  <p>
                    {line.metal === "gold"
                      ? `${t.gold}${line.carat ? ` • ${line.carat}` : ""}`
                      : t.silver}
                  </p>
                </div>
              </div>

              <div
                className={`print-item-details ${
                  line.metal === "gold"
                    ? "gold-details"
                    : "silver-details"
                }`}
              >
                <div>
                  <span>{t.quantity}</span>
                  <strong>{line.quantity}</strong>
                </div>

                <div>
                  <span>{t.weight}</span>
                  <strong>
                    {line.weight} {t.gram}
                  </strong>
                </div>

                <div>
                  <span>{t.rate}</span>
                  <strong>₹ {formatMoney(line.rate, 0)}</strong>
                  <small>
                    {line.metal === "gold"
                      ? t.per10Gram
                      : t.perKg}
                  </small>
                </div>

                {line.metal === "gold" && (
                  <div>
                    <span>{t.purity}</span>
                    <strong>{line.carat || "-"}</strong>
                  </div>
                )}
              </div>

              <div className="print-item-line-total">
                <span>{t.allItems}</span>
                <strong>
                  ₹ {formatMoney(getItemAmount(line))}
                </strong>
              </div>
            </div>
          ))}
        </div>

        {/* AMOUNT SUMMARY */}

        <div className="print-amount-section">
          <div className="print-amount-row">
            <span>{t.allItems}</span>
            <strong>₹ {formatMoney(baseAmount)}</strong>
          </div>

          {makingAmount > 0 && (
            <div className="print-amount-row">
              <span>{t.making}</span>
              <strong>₹ {formatMoney(makingAmount)}</strong>
            </div>
          )}

          {offerAmount > 0 && (
            <div className="print-amount-row discount-row">
              <span>{t.offer}</span>
              <strong>- ₹ {formatMoney(offerAmount)}</strong>
            </div>
          )}

          <div className="print-subtotal">
            <span>{t.subtotal}</span>
            <strong>₹ {formatMoney(subtotal)}</strong>
          </div>

          {gstEnabled && (
            <div className="print-amount-row">
              <span>GST ({gstRate}%)</span>
              <strong>₹ {formatMoney(gstAmount)}</strong>
            </div>
          )}

          <div className="print-grand-total">
            <span>{t.total}</span>
            <strong>₹ {formatMoney(grandTotal)}</strong>
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

      {/* SCREEN FOOTER */}

      <footer className="shop-footer">
        <strong>{shopProfile.shopName}</strong>

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