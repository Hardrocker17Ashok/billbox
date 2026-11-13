
import "./BillHistory.css";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import PageLoader from "../components/PageLoader";

const DEFAULT_PROFILE = {
  shopName: "BillBox",
  ownerName: "",
  phone: "",
  address: "",
  gstNumber: "",
  logoUrl: "",
  language: "hi",
  theme: "dark",
};

const TEXT = {
  hi: {
    pageTitle: "बिल इतिहास",
    dashboard: "डैशबोर्ड",
    eyebrow: "बिक्री रिकॉर्ड",
    heading: "बिल इतिहास",
    description: "आपके सभी पुराने बिल एक ही जगह पर।",
    shownBills: "दिखाए गए बिल",
    totalAmount: "कुल राशि",
    searchFilter: "खोज और फ़िल्टर",
    searchBills: "बिल खोजें",
    clearFilters: "फ़िल्टर साफ़ करें",
    customerItemBill: "ग्राहक / आइटम / बिल नंबर",
    searchPlaceholder: "नाम या बिल नंबर खोजें",
    date: "तारीख",
    metal: "धातु",
    all: "सभी",
    gold: "सोना",
    silver: "चाँदी",
    minAmount: "न्यूनतम राशि",
    maxAmount: "अधिकतम राशि",
    minPlaceholder: "₹ न्यूनतम",
    maxPlaceholder: "₹ अधिकतम",
    records: "रिकॉर्ड",
    allBills: "सभी बिल",
    billCount: "बिल",
    loadError: "बिल इतिहास लोड नहीं हो सका।",
    loginRequired: "कृपया लॉगिन करें।",
    noBills: "कोई बिल नहीं मिला",
    noBillsDescription: "आपके चुने हुए फ़िल्टर के अनुसार कोई बिल उपलब्ध नहीं है।",
    billNumber: "बिल नंबर",
    customer: "ग्राहक",
    jewellery: "आभूषण",
    weight: "वजन",
    amount: "कुल राशि",
    gram: "ग्राम",
    more: "और",
    footerTrust: "विश्वास",
    footerPurity: "शुद्धता",
    footerBeauty: "सुंदरता",
    oldRecord: "पुराना बिक्री रिकॉर्ड",
    billDetails: "बिल का विवरण",
    close: "बंद करें",
    dateTime: "तारीख और समय",
    mobile: "मोबाइल",
    mobileUnavailable: "मोबाइल नंबर उपलब्ध नहीं",
    totalItems: "कुल आभूषण",
    separateItems: "अलग-अलग आइटम",
    totalWeight: "कुल वजन",
    allItemsWeight: "सभी आभूषणों का वजन",
    billType: "बिल का प्रकार",
    taxInvoice: "पक्का बिल / टैक्स इनवॉइस",
    estimateInvoice: "कच्चा बिल / अनुमान",
    owner: "मालिक",
    alternatePhone: "वैकल्पिक फोन",
    tagline: "टैगलाइन",
    hsn: "HSN कोड",
    sku: "आइटम कोड / SKU",
    huid: "HUID / हॉलमार्क नंबर",
    metalValue: "सोने / चाँदी की कीमत",
    otherCharges: "अन्य शुल्क",
    gstRate: "GST दर",
    taxableAmount: "कर योग्य राशि",
    lineTotal: "आइटम कुल",
    amountPaid: "प्राप्त राशि",
    balanceDue: "बाकी राशि",
    paymentStatus: "भुगतान स्थिति",
    paidStatus: "भुगतान पूरा",
    partialStatus: "आंशिक भुगतान",
    dueStatus: "भुगतान बाकी",
    items: "आभूषण",
    purchasedItems: "खरीदे गए आभूषण",
    itemCount: "आइटम",
    quantity: "मात्रा",
    pieces: "नग",
    rate: "दर",
    per10g: "प्रति 10 ग्राम",
    perKg: "प्रति किलो",
    itemAmount: "वस्तु राशि",
    shopInfo: "दुकान की जानकारी",
    making: "बनाने का शुल्क",
    discount: "छूट / ऑफर",
    subtotal: "उप-योग",
    gst: "GST",
    grandTotal: "कुल राशि",
    oldBill: "पुराना बिल रिकॉर्ड",
    readOnly: "यह जानकारी केवल देखने के लिए है।",
    timeUnavailable: "समय उपलब्ध नहीं",
    customerFallback: "ग्राहक",
    itemFallback: "आभूषण",
    billLoadMessage: "आपका बिल इतिहास तैयार हो रहा है...",
    dateUnavailable: "-",
    errorHeading: "कुछ समस्या हुई",
    billNotFound: "बिल उपलब्ध नहीं हैं।",
    gstin: "GSTIN",
    phoneLabel: "फोन",
    noShopProfile: "शॉप प्रोफाइल उपलब्ध नहीं है।",
    deleteBill: "बिल हटाएँ",
    confirmDeleteTitle: "बिल हटाने की पुष्टि करें",
    confirmDeleteMessage: "क्या आप यह बिल स्थायी रूप से हटाना चाहते हैं? यह कार्रवाई वापस नहीं की जा सकती।",
    confirmDelete: "हाँ, बिल हटाएँ",
    cancelDelete: "रद्द करें",
    deleting: "हटाया जा रहा है...",
    deleteSuccess: "बिल सफलतापूर्वक हटा दिया गया।",
    deleteError: "बिल हटाया नहीं जा सका। कृपया दोबारा प्रयास करें।",
  },

  en: {
    pageTitle: "Bill History",
    dashboard: "Dashboard",
    eyebrow: "SALES RECORDS",
    heading: "Bill History",
    description: "All your previous bills in one place.",
    shownBills: "Bills shown",
    totalAmount: "Total amount",
    searchFilter: "SEARCH & FILTER",
    searchBills: "Search bills",
    clearFilters: "Clear filters",
    customerItemBill: "Customer / Item / Bill number",
    searchPlaceholder: "Search name or bill number",
    date: "Date",
    metal: "Metal",
    all: "All",
    gold: "Gold",
    silver: "Silver",
    minAmount: "Minimum amount",
    maxAmount: "Maximum amount",
    minPlaceholder: "₹ Minimum",
    maxPlaceholder: "₹ Maximum",
    records: "RECORDS",
    allBills: "All bills",
    billCount: "bills",
    loadError: "Could not load bill history.",
    loginRequired: "Please log in.",
    noBills: "No bills found",
    noBillsDescription: "No bills are available for the selected filters.",
    billNumber: "Bill number",
    customer: "Customer",
    jewellery: "Jewellery",
    weight: "Weight",
    amount: "Total amount",
    gram: "grams",
    more: "more",
    footerTrust: "TRUST",
    footerPurity: "PURITY",
    footerBeauty: "BEAUTY",
    oldRecord: "PREVIOUS SALES RECORD",
    billDetails: "Bill details",
    close: "Close",
    dateTime: "Date & time",
    mobile: "Mobile",
    mobileUnavailable: "Mobile number unavailable",
    totalItems: "Total jewellery",
    separateItems: "Separate items",
    totalWeight: "Total weight",
    allItemsWeight: "Weight of all jewellery",
    billType: "Bill type",
    taxInvoice: "Tax Invoice",
    estimateInvoice: "Estimate / Non-tax invoice",
    owner: "Owner",
    alternatePhone: "Alternate phone",
    tagline: "Tagline",
    hsn: "HSN code",
    sku: "Item code / SKU",
    huid: "HUID / Hallmark number",
    metalValue: "Metal value",
    otherCharges: "Other charges",
    gstRate: "GST rate",
    taxableAmount: "Taxable amount",
    lineTotal: "Item total",
    amountPaid: "Amount received",
    balanceDue: "Balance due",
    paymentStatus: "Payment status",
    paidStatus: "Paid",
    partialStatus: "Partially paid",
    dueStatus: "Payment due",
    items: "JEWELLERY",
    purchasedItems: "Purchased items",
    itemCount: "items",
    quantity: "Quantity",
    pieces: "pcs",
    rate: "Rate",
    per10g: "Per 10 grams",
    perKg: "Per kilogram",
    itemAmount: "Item amount",
    shopInfo: "Shop information",
    making: "Making charges",
    discount: "Discount / Offer",
    subtotal: "Subtotal",
    gst: "GST",
    grandTotal: "Grand total",
    oldBill: "Previous bill record",
    readOnly: "This information is available in read-only mode.",
    timeUnavailable: "Time unavailable",
    customerFallback: "Customer",
    itemFallback: "Jewellery",
    billLoadMessage: "Preparing your bill history...",
    dateUnavailable: "-",
    errorHeading: "Something went wrong",
    billNotFound: "Bills are not available.",
    gstin: "GSTIN",
    phoneLabel: "Phone",
    noShopProfile: "Shop profile is unavailable.",
    deleteBill: "Remove bill",
    confirmDeleteTitle: "Confirm bill deletion",
    confirmDeleteMessage: "Are you sure you want to permanently delete this bill? This action cannot be undone.",
    confirmDelete: "Yes, delete bill",
    cancelDelete: "Cancel",
    deleting: "Deleting...",
    deleteSuccess: "Bill deleted successfully.",
    deleteError: "Could not delete the bill. Please try again.",
  },
};

function BillHistory() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [shopProfile, setShopProfile] = useState(DEFAULT_PROFILE);

  const [authReady, setAuthReady] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [billsLoading, setBillsLoading] = useState(true);

  const [bills, setBills] = useState([]);
  const [error, setError] = useState("");

  const [searchName, setSearchName] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [metalFilter, setMetalFilter] = useState("all");

  const [selectedBill, setSelectedBill] = useState(null);
  const [deleteConfirmBill, setDeleteConfirmBill] = useState(null);
  const [deletingBillId, setDeletingBillId] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const language =
    shopProfile.language === "en" ? "en" : "hi";

  const theme =
    shopProfile.theme === "light" ? "light" : "dark";

  const t = TEXT[language];

  // ---------------------------------------------------------
  // AUTHENTICATION
  // ---------------------------------------------------------

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  // ---------------------------------------------------------
  // LOAD SHOP PROFILE AND BILLS
  // ---------------------------------------------------------

  useEffect(() => {
    if (!authReady) return;

    let active = true;

    const loadPageData = async () => {
      setProfileLoading(true);
      setBillsLoading(true);
      setError("");
      setBills([]);
      setSelectedBill(null);

      if (!user) {
        setShopProfile(DEFAULT_PROFILE);
        setProfileLoading(false);
        setBillsLoading(false);
        setError(TEXT.en.loginRequired);
        return;
      }

      // Load profile and bills together.
      const profileTask = async () => {
        const shopRef = doc(db, "shops", user.uid);
        const snapshot = await getDoc(shopRef);

        if (!snapshot.exists()) {
          throw new Error("SHOP_PROFILE_NOT_FOUND");
        }

        const saved = snapshot.data();

        return {
          ...DEFAULT_PROFILE,
          ...saved,
          theme: saved.theme === "light" ? "light" : "dark",
          language: saved.language === "hi" ? "hi" : "en",
        };
      };

      const billsTask = async () => {
        const billsQuery = query(
          collection(db, "bills"),
          where("ownerId", "==", user.uid)
        );

        const snapshot = await getDocs(billsQuery);

        return snapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data(),
          }))
          .sort((a, b) => {
            const dateA = getDateObject(a.createdAt);
            const dateB = getDateObject(b.createdAt);

            return (dateB?.getTime() || 0) -
              (dateA?.getTime() || 0);
          });
      };

      const [profileResult, billsResult] = await Promise.allSettled([
        profileTask(),
        billsTask(),
      ]);

      if (!active) return;

      if (profileResult.status === "fulfilled") {
        const profile = profileResult.value;

        setShopProfile(profile);

        // Keep global preferences in sync with the saved shop profile.
        document.documentElement.dataset.theme = profile.theme;
        document.documentElement.dataset.language = profile.language;
        document.body.dataset.theme = profile.theme;

        localStorage.setItem("billbox-theme", profile.theme);
        localStorage.setItem("billbox-language", profile.language);

      } else {
        console.error("Shop profile load error:", profileResult.reason);

        setShopProfile(DEFAULT_PROFILE);

        if (profileResult.reason?.message === "SHOP_PROFILE_NOT_FOUND") {
          setError(TEXT.en.noShopProfile);
        } else {
          setError(TEXT.en.loadError);
        }
      }

      if (billsResult.status === "fulfilled") {
        setBills(billsResult.value);
      } else {
        console.error("Bill history fetch error:", billsResult.reason);
        setBills([]);
        setError((current) => current || TEXT.en.loadError);
      }

      setProfileLoading(false);
      setBillsLoading(false);
    };

    loadPageData();

    return () => {
      active = false;
    };
  }, [user, authReady]);

  // ---------------------------------------------------------
  // SYNC DASHBOARD PREFERENCE CHANGES
  // ---------------------------------------------------------

  useEffect(() => {
    const handlePreferenceChange = (event) => {
      const preferences = event.detail || {};

      setShopProfile((current) => ({
        ...current,
        language: ["hi", "en"].includes(preferences.language)
          ? preferences.language
          : current.language,
        theme: ["dark", "light"].includes(preferences.theme)
          ? preferences.theme
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

  // ---------------------------------------------------------
  // DATE / TIME
  // ---------------------------------------------------------

  function getDateObject(timestamp) {
    if (!timestamp) return null;

    try {
      if (timestamp?.toDate) {
        return timestamp.toDate();
      }

      const date = new Date(timestamp);

      return Number.isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }

  const formatDate = (timestamp) => {
    const date = getDateObject(timestamp);

    if (!date) return "-";

    return date.toLocaleDateString(
      language === "hi" ? "hi-IN" : "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  const formatTime = (timestamp) => {
    const date = getDateObject(timestamp);

    if (!date) return "";

    return date.toLocaleTimeString(
      language === "hi" ? "hi-IN" : "en-IN",
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }
    );
  };

  // ---------------------------------------------------------
  // NUMBER FORMAT
  // ---------------------------------------------------------

  const formatMoney = (value) =>
    Number(value || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    });

  const formatNumber = (value) =>
    Number(value || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 3,
    });

  // ---------------------------------------------------------
  // BILL ITEMS
  // ---------------------------------------------------------

  const getBillItems = (bill) => {
    if (Array.isArray(bill?.items) && bill.items.length > 0) {
      return bill.items;
    }

    if (!bill) return [];

    return [
      {
        itemName: bill.itemName || "-",
        metal: bill.metal || "",
        carat: bill.carat || "",
        quantity: bill.quantity || 1,
        weight: bill.weight || 0,
        rate: bill.rate || 0,
        amount: bill.amount ?? bill.itemAmount ?? 0,
      },
    ];
  };

  // ---------------------------------------------------------
  // FILTERS
  // ---------------------------------------------------------

  const clearFilters = () => {
    setSearchName("");
    setDateFilter("");
    setMinPrice("");
    setMaxPrice("");
    setMetalFilter("all");
  };

  const filteredBills = useMemo(() => {
    const name = searchName.trim().toLowerCase();

    const min = minPrice === "" ? null : Number(minPrice);
    const max = maxPrice === "" ? null : Number(maxPrice);

    return bills.filter((bill) => {
      const customerName = String(
        bill.customerName || ""
      ).toLowerCase();

      const itemName = String(
        bill.itemName || ""
      ).toLowerCase();

      const billNumber = String(
        bill.billNumber || ""
      ).toLowerCase();

      const itemsText = Array.isArray(bill.items)
        ? bill.items
            .map((item) => item.itemName || "")
            .join(" ")
            .toLowerCase()
        : "";

      const matchesName =
        !name ||
        customerName.includes(name) ||
        itemName.includes(name) ||
        itemsText.includes(name) ||
        billNumber.includes(name);

      let matchesMetal = true;

      if (metalFilter !== "all") {
        if (Array.isArray(bill.items) && bill.items.length > 0) {
          matchesMetal = bill.items.some(
            (item) =>
              String(item.metal || "").toLowerCase() === metalFilter
          );
        } else {
          matchesMetal =
            String(bill.metal || "").toLowerCase() === metalFilter;
        }
      }

      const amount = Number(bill.grandTotal || 0);

      const matchesMin =
        min === null || (!Number.isNaN(min) && amount >= min);

      const matchesMax =
        max === null || (!Number.isNaN(max) && amount <= max);

      let matchesDate = true;

      if (dateFilter) {
        const billDate = getDateObject(bill.createdAt);

        if (!billDate) {
          matchesDate = false;
        } else {
          const localDate = [
            billDate.getFullYear(),
            String(billDate.getMonth() + 1).padStart(2, "0"),
            String(billDate.getDate()).padStart(2, "0"),
          ].join("-");

          matchesDate = localDate === dateFilter;
        }
      }

      return (
        matchesName &&
        matchesMetal &&
        matchesMin &&
        matchesMax &&
        matchesDate
      );
    });
  }, [
    bills,
    searchName,
    dateFilter,
    minPrice,
    maxPrice,
    metalFilter,
  ]);

  const totalFilteredAmount = filteredBills.reduce(
    (total, bill) => total + Number(bill.grandTotal || 0),
    0
  );

  // ---------------------------------------------------------
  // BILL DETAILS
  // ---------------------------------------------------------

  const openBillDetails = (bill) => setSelectedBill(bill);

  const closeBillDetails = () => setSelectedBill(null);

  const requestBillDelete = (event, bill) => {
    event.stopPropagation();
    setDeleteError("");
    setDeleteConfirmBill(bill);
  };

  const cancelBillDelete = () => {
    if (deletingBillId) return;
    setDeleteConfirmBill(null);
    setDeleteError("");
  };

  const confirmBillDelete = async () => {
    if (!deleteConfirmBill?.id || !user?.uid || deletingBillId) return;

    const billToDelete = deleteConfirmBill;
    setDeletingBillId(billToDelete.id);
    setDeleteError("");

    try {
      // The bill list is already scoped to the signed-in owner's UID.
      // Delete the exact Firestore document only after explicit confirmation.
      await deleteDoc(doc(db, "bills", billToDelete.id));

      setBills((currentBills) =>
        currentBills.filter((bill) => bill.id !== billToDelete.id)
      );

      if (selectedBill?.id === billToDelete.id) {
        setSelectedBill(null);
      }

      setDeleteConfirmBill(null);
    } catch (deleteErr) {
      console.error("Bill delete error:", deleteErr);
      setDeleteError(t.deleteError);
    } finally {
      setDeletingBillId("");
    }
  };

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setSelectedBill(null);
      }
    };

    if (selectedBill) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [selectedBill]);

  const selectedItems = selectedBill
    ? getBillItems(selectedBill)
    : [];

  const selectedBaseAmount = selectedItems.reduce(
    (total, item) => total + Number(item.amount || 0),
    0
  );

  const selectedMaking = Number(
    selectedBill?.makingCharges ??
      selectedItems.reduce((total, item) => total + Number(item.makingCharges || item.chargesBreakdown?.makingTotal || 0), 0)
  );

  const selectedOtherCharges = Number(
    selectedBill?.otherCharges ??
      selectedItems.reduce((total, item) => total + Number(item.otherCharges || item.chargesBreakdown?.otherTotal || 0), 0)
  );

  const selectedOffer = Number(
    selectedBill?.offer ?? selectedBill?.discount ?? 0
  );

  const selectedPaid = Number(
    selectedBill?.paidAmount ?? selectedBill?.amountPaid ?? selectedBill?.payment?.paid ?? 0
  );

  const selectedBalance = Number(
    selectedBill?.balanceDue ?? selectedBill?.balanceAmount ?? selectedBill?.payment?.balance ??
      Math.max(0, Number(selectedBill?.grandTotal || 0) - selectedPaid)
  );

  const rawPaymentStatus = String(
    selectedBill?.paymentStatus || selectedBill?.payment?.status || ""
  ).toLowerCase();

  const selectedPaymentStatus =
    rawPaymentStatus.includes("partial") || rawPaymentStatus.includes("आंशिक")
      ? "partial"
      : rawPaymentStatus.includes("paid") || rawPaymentStatus.includes("भुगतान पूरा")
        ? "paid"
        : selectedBalance <= 0
          ? "paid"
          : selectedPaid > 0
            ? "partial"
            : "due";

  const selectedSubtotal =
    selectedBill?.subtotal !== undefined
      ? Number(selectedBill.subtotal || 0)
      : selectedBaseAmount + selectedMaking + selectedOtherCharges - selectedOffer;

  const selectedGst = Number(
    selectedBill?.gstAmount || 0
  );

  const selectedGrandTotal =
    selectedBill?.grandTotal !== undefined
      ? Number(selectedBill.grandTotal || 0)
      : selectedSubtotal + selectedGst;

  const selectedTotalWeight = selectedItems.reduce(
    (total, item) => total + Number(item.weight || 0),
    0
  );

  const getMetalLabel = (metal) => {
    const value = String(metal || "").toLowerCase();

    if (value === "gold") return t.gold;
    if (value === "silver") return t.silver;

    return metal || "-";
  };

  // ---------------------------------------------------------
  // EXISTING GLOBAL LOADER
  // ---------------------------------------------------------

  if (!authReady || profileLoading || billsLoading) {
    return (
      <PageLoader
        loading={true}
        message={t.billLoadMessage}
        fullScreen={true}
      />
    );
  }

  // ---------------------------------------------------------
  // PAGE
  // ---------------------------------------------------------

  return (
    <main
      className={`bill-history-page ${theme === "light" ? "bill-history-light" : ""}`}
      data-theme={theme}
      data-language={language}
    >
      <header className="history-header">
        <div className="history-brand">
          {shopProfile.logoUrl ? (
            <img
              src={shopProfile.logoUrl}
              alt={shopProfile.shopName}
            />
          ) : (
            <div className="history-brand-fallback">
              {(shopProfile.shopName || "B").charAt(0).toUpperCase()}
            </div>
          )}

          <div>
            <span>{shopProfile.shopName || "BillBox"}</span>
            <strong>{t.pageTitle}</strong>
          </div>
        </div>

        <button
          type="button"
          className="sales-back1"
          onClick={() => navigate("/dashboard")}
        >
          ← {t.dashboard}
        </button>
      </header>

      <section className="history-content">
        <div className="history-heading">
          <div>
            <span>{t.eyebrow}</span>
            <h1>{t.heading}</h1>
            <p>{t.description}</p>
          </div>

          <div className="history-summary">
            <div>
              <span>{t.shownBills}</span>
              <strong>{filteredBills.length}</strong>
            </div>

            <div>
              <span>{t.totalAmount}</span>
              <strong>₹{formatMoney(totalFilteredAmount)}</strong>
            </div>
          </div>
        </div>

        {error && (
          <div className="history-state error-state">
            <strong>{t.errorHeading}</strong>
            <p>{error}</p>
          </div>
        )}

        {!error && (
          <>
            <section className="filter-panel">
              <div className="filter-top">
                <div>
                  <span className="filter-eyebrow">
                    {t.searchFilter}
                  </span>
                  <h2>{t.searchBills}</h2>
                </div>

                <button
                  type="button"
                  className="clear-filters"
                  onClick={clearFilters}
                >
                  {t.clearFilters}
                </button>
              </div>

              <div className="filter-grid">
                <div className="filter-field filter-name">
                  <label htmlFor="customer-search">
                    {t.customerItemBill}
                  </label>

                  <input
                    id="customer-search"
                    type="text"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    placeholder={t.searchPlaceholder}
                  />
                </div>

                <div className="filter-field">
                  <label htmlFor="date-filter">{t.date}</label>
                  <input
                    id="date-filter"
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                  />
                </div>

                <div className="filter-field">
                  <label htmlFor="metal-filter">{t.metal}</label>
                  <select
                    id="metal-filter"
                    value={metalFilter}
                    onChange={(e) => setMetalFilter(e.target.value)}
                  >
                    <option value="all">{t.all}</option>
                    <option value="gold">{t.gold}</option>
                    <option value="silver">{t.silver}</option>
                  </select>
                </div>

                <div className="filter-field">
                  <label htmlFor="min-price">{t.minAmount}</label>
                  <input
                    id="min-price"
                    type="number"
                    min="0"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder={t.minPlaceholder}
                  />
                </div>

                <div className="filter-field">
                  <label htmlFor="max-price">{t.maxAmount}</label>
                  <input
                    id="max-price"
                    type="number"
                    min="0"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder={t.maxPlaceholder}
                  />
                </div>
              </div>
            </section>

            <section className="bills-section">
              <div className="list-heading">
                <div>
                  <span>{t.records}</span>
                  <h2>{t.allBills}</h2>
                </div>

                <span className="result-count">
                  {filteredBills.length} {t.billCount}
                </span>
              </div>

              {filteredBills.length === 0 && (
                <div className="history-state empty-state">
                  <div className="empty-icon">▤</div>
                  <strong>{t.noBills}</strong>
                  <p>{t.noBillsDescription}</p>
                </div>
              )}

              {filteredBills.length > 0 && (
                <div className="bills-list">
                  {filteredBills.map((bill) => {
                    const billItems = getBillItems(bill);
                    const firstItem = billItems[0];

                    const metal = String(
                      firstItem?.metal || bill.metal || ""
                    ).toLowerCase();

                    return (
                      <article
                        className="bill-card"
                        key={bill.id}
                        data-view-label={language === "en" ? "View details" : "विवरण देखें"}
                        onClick={() => openBillDetails(bill)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openBillDetails(bill);
                          }
                        }}
                      >
                        <div className="bill-main">
                          <div className="bill-number">
                            <span>{t.billNumber}</span>
                            <strong>
                              #{bill.billNumber || bill.id.slice(0, 7)}
                            </strong>
                          </div>

                          <div className="bill-customer">
                            <span>{t.customer}</span>
                            <strong>{bill.customerName || "-"}</strong>
                            {bill.customerMobile && (
                              <small>{bill.customerMobile}</small>
                            )}
                          </div>

                          <div className="bill-item">
                            <span>{t.jewellery}</span>
                            <strong>
                              {firstItem?.itemName || bill.itemName || "-"}
                            </strong>

                            <small>
                              {metal === "gold"
                                ? `${t.gold}${firstItem?.carat || bill.carat ? ` • ${firstItem?.carat || bill.carat}` : ""}`
                                : metal === "silver"
                                  ? t.silver
                                  : "-"}
                              {billItems.length > 1 &&
                                ` • +${billItems.length - 1} ${t.more}`}
                            </small>
                          </div>

                          <div className="bill-weight">
                            <span>{t.weight}</span>
                            <strong>
                              {formatNumber(
                                billItems.reduce(
                                  (total, item) =>
                                    total + Number(item.weight || 0),
                                  0
                                )
                              )} {t.gram}
                            </strong>
                          </div>

                          <div className="bill-date">
                            <span>{t.date}</span>
                            <strong>{formatDate(bill.createdAt)}</strong>
                            <small>{formatTime(bill.createdAt)}</small>
                          </div>

                          <div className="bill-amount">
                            <span>{t.amount}</span>
                            <strong>
                              ₹{formatMoney(bill.grandTotal)}
                            </strong>
                          </div>
                        </div>

                        <div className="bill-card-actions">
                          <button
                            type="button"
                            className="bill-delete-button"
                            onClick={(event) => requestBillDelete(event, bill)}
                            aria-label={`${t.deleteBill} #${bill.billNumber || bill.id.slice(0, 7)}`}
                          >
                            <span className="bill-delete-icon" aria-hidden="true">⌫</span>
                            {t.deleteBill}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </section>

      <footer className="history-footer">
        <span>{t.footerTrust}</span>
        <b>•</b>
        <span>{t.footerPurity}</span>
        <b>•</b>
        <span>{t.footerBeauty}</span>

        <small>
          © {new Date().getFullYear()} {shopProfile.shopName || "BillBox"}
        </small>
      </footer>

      {/* PREMIUM BILL DETAILS MODAL */}
      {selectedBill && (
        <div
          className="bill-details-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeBillDetails();
            }
          }}
        >
          <section className="bill-details-modal">
            <div className="details-modal-top">
              <div className="details-modal-heading">
                <span>{t.oldRecord}</span>
                <h2>{t.billDetails}</h2>
              </div>

              <button
                type="button"
                className="details-close"
                onClick={closeBillDetails}
                aria-label={t.close}
              >
                ×
              </button>
            </div>

            <div className="details-identity">
              <div className="identity-brand">
                <div className="identity-logo">
                  {(selectedBill.shopLogoUrl || shopProfile.logoUrl) ? (
                    <img
                      src={selectedBill.shopLogoUrl || shopProfile.logoUrl}
                      alt={selectedBill.shopName || shopProfile.shopName}
                    />
                  ) : (
                    <strong>
                      {(selectedBill.shopName || shopProfile.shopName || "B").charAt(0).toUpperCase()}
                    </strong>
                  )}
                </div>

                <div>
                  <strong>{selectedBill.shopName || shopProfile.shopName || "BillBox"}</strong>
                  <span>
                    {t.footerTrust} • {t.footerPurity} • {t.footerBeauty}
                  </span>
                </div>
              </div>

              <div className="identity-number">
                <span>{t.billNumber}</span>
                <strong>
                  #{selectedBill.billNumber || selectedBill.id.slice(0, 7)}
                </strong>
              </div>
            </div>

            <div className="details-info-grid">
              <div className="details-info-card">
                <span>{t.dateTime}</span>
                <strong>{formatDate(selectedBill.createdAt)}</strong>
                <small>
                  {formatTime(selectedBill.createdAt) || t.timeUnavailable}
                </small>
              </div>

              <div className="details-info-card">
                <span>{t.customer}</span>
                <strong>
                  {selectedBill.customerName || t.customerFallback}
                </strong>
                <small>
                  {selectedBill.customerMobile
                    ? `${t.mobile}: ${selectedBill.customerMobile}`
                    : t.mobileUnavailable}
                </small>
              </div>

              <div className="details-info-card">
                <span>{t.totalItems}</span>
                <strong>{selectedItems.length}</strong>
                <small>{t.separateItems}</small>
              </div>

              <div className="details-info-card">
                <span>{t.totalWeight}</span>
                <strong>
                  {formatNumber(selectedTotalWeight)} {t.gram}
                </strong>
                <small>{t.allItemsWeight}</small>
              </div>

              <div className="details-info-card">
                <span>{t.billType}</span>
                <strong>
                  {selectedBill.billType === "tax"
                    ? t.taxInvoice
                    : selectedBill.billType
                      ? t.estimateInvoice
                      : (selectedBill.billTypeLabel || t.estimateInvoice)}
                </strong>
                <small>{selectedBill.gstEnabled ? `${t.gst}: ${formatNumber(selectedBill.gstRate || 0)}%` : `${t.gst}: ${t.gstOff || "—"}`}</small>
              </div>
            </div>

            <div className="details-items-section">
              <div className="details-section-heading">
                <div>
                  <span>{t.items}</span>
                  <h3>{t.purchasedItems}</h3>
                </div>

                <strong>
                  {selectedItems.length} {t.itemCount}
                </strong>
              </div>

              <div className="details-items-list">
                {selectedItems.map((item, index) => {
                  const isGold =
                    String(item.metal || "").toLowerCase() === "gold";

                  return (
                    <div
                      className="details-item"
                      key={`${selectedBill.id}-${index}`}
                    >
                      <div className="details-item-number">
                        {String(index + 1).padStart(2, "0")}
                      </div>

                      <div className="details-item-main">
                        <strong>{item.itemName || t.itemFallback}</strong>

                        <span className={isGold ? "gold-label" : "silver-label"}>
                          {getMetalLabel(item.metal)}
                          {isGold && item.carat ? ` • ${item.carat}` : ""}
                        </span>
                      </div>

                      <div className="details-item-data">
                        <span>{t.quantity}</span>
                        <strong>
                          {formatNumber(item.quantity || 1)} {t.pieces}
                        </strong>
                      </div>

                      <div className="details-item-data">
                        <span>{t.weight}</span>
                        <strong>
                          {formatNumber(item.weight)} {t.gram}
                        </strong>
                      </div>

                      <div className="details-item-data">
                        <span>{t.rate}</span>
                        <strong>₹{formatMoney(item.rate)}</strong>
                        <small>{isGold ? t.per10g : t.perKg}</small>
                      </div>

                      <div className="details-item-amount">
                        <span>{t.itemAmount}</span>
                        <strong>₹{formatMoney(item.amount ?? item.chargesBreakdown?.metalValue ?? 0)}</strong>
                      </div>

                      <div className="details-item-extra">
                        {(item.hsnCode || item.skuCode || item.huid) && (
                          <div className="details-extra-codes">
                            {item.hsnCode && <span><b>{t.hsn}:</b> {item.hsnCode}</span>}
                            {item.skuCode && <span><b>{t.sku}:</b> {item.skuCode}</span>}
                            {item.huid && <span><b>{t.huid}:</b> {item.huid}</span>}
                          </div>
                        )}
                        <div className="details-extra-values">
                          <span>{t.making}: <b>₹{formatMoney(item.makingCharges ?? item.chargesBreakdown?.makingTotal ?? 0)}</b></span>
                          <span>{t.otherCharges}: <b>₹{formatMoney(item.otherCharges ?? item.chargesBreakdown?.otherTotal ?? 0)}</b></span>
                          <span>{t.gst} ({formatNumber(item.gstRate || 0)}%): <b>₹{formatMoney(item.gstAmount || 0)}</b></span>
                          <span>{t.taxableAmount}: <b>₹{formatMoney(item.taxableAmount ?? (Number(item.amount || 0) + Number(item.makingCharges || 0) + Number(item.otherCharges || 0)))}</b></span>
                          <span>{t.lineTotal}: <b>₹{formatMoney(item.lineTotal ?? item.totalAmount ?? item.amount ?? 0)}</b></span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="details-bottom-grid">
              <div className="details-shop-card">
                <span>{t.shopInfo}</span>
                <strong>{selectedBill.shopName || shopProfile.shopName || "BillBox"}</strong>

                {(selectedBill.shopOwnerName || shopProfile.ownerName) && (
                  <p>{t.owner}: {selectedBill.shopOwnerName || shopProfile.ownerName}</p>
                )}

                {(selectedBill.shopTagline || shopProfile.tagline) && (
                  <p>{selectedBill.shopTagline || shopProfile.tagline}</p>
                )}

                {(selectedBill.shopAddress || shopProfile.address) && (
                  <p>{selectedBill.shopAddress || shopProfile.address}</p>
                )}

                {(selectedBill.shopPhone || shopProfile.phone) && (
                  <small>{t.phoneLabel}: {selectedBill.shopPhone || shopProfile.phone}</small>
                )}

                {(selectedBill.shopAlternatePhone || shopProfile.alternatePhone) && (
                  <small>{t.alternatePhone}: {selectedBill.shopAlternatePhone || shopProfile.alternatePhone}</small>
                )}

                {(selectedBill.shopGstNumber || shopProfile.gstNumber) && (
                  <small>{t.gstin}: {selectedBill.shopGstNumber || shopProfile.gstNumber}</small>
                )}
              </div>

              <div className="details-amount-card">
                <div className="details-amount-row">
                  <span>{t.itemAmount}</span>
                  <strong>₹{formatMoney(selectedBaseAmount)}</strong>
                </div>

                {selectedMaking > 0 && (
                  <div className="details-amount-row">
                    <span>{t.making}</span>
                    <strong>₹{formatMoney(selectedMaking)}</strong>
                  </div>
                )}

                <div className="details-amount-row">
                  <span>{t.otherCharges}</span>
                  <strong>₹{formatMoney(selectedOtherCharges)}</strong>
                </div>

                {selectedOffer > 0 && (
                  <div className="details-amount-row discount">
                    <span>{t.discount}</span>
                    <strong>- ₹{formatMoney(selectedOffer)}</strong>
                  </div>
                )}

                <div className="details-amount-row subtotal">
                  <span>{t.subtotal}</span>
                  <strong>₹{formatMoney(selectedSubtotal)}</strong>
                </div>

                {(selectedBill.gstEnabled || selectedGst > 0) && (
                  <div className="details-amount-row">
                    <span>
                      {t.gst} ({selectedBill.gstRate || 0}%)
                    </span>
                    <strong>₹{formatMoney(selectedGst)}</strong>
                  </div>
                )}

                <div className="details-grand-total">
                  <span>{t.grandTotal}</span>
                  <strong>₹{formatMoney(selectedGrandTotal)}</strong>
                </div>

                <div className="details-amount-row details-payment-row">
                  <span>{t.amountPaid}</span>
                  <strong>₹{formatMoney(selectedPaid)}</strong>
                </div>

                <div className="details-amount-row details-balance-row">
                  <span>{t.balanceDue}</span>
                  <strong>₹{formatMoney(selectedBalance)}</strong>
                </div>

                <div className="details-payment-status">
                  <span>{t.paymentStatus}</span>
                  <strong>
                    {selectedPaymentStatus === "paid" ? t.paidStatus :
                      selectedPaymentStatus === "partial" ? t.partialStatus : t.dueStatus}
                  </strong>
                </div>
              </div>
            </div>

            <div className="details-modal-footer">
              <div>
                <strong>{t.oldBill}</strong>
                <span>{t.readOnly}</span>
              </div>

              <button type="button" onClick={closeBillDetails}>
                {t.close}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* BILL DELETE CONFIRMATION */}
      {deleteConfirmBill && (
        <div
          className="bill-delete-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              cancelBillDelete();
            }
          }}
        >
          <section
            className="bill-delete-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bill-delete-title"
          >
            <div className="bill-delete-dialog-icon" aria-hidden="true">
              <span>!</span>
            </div>

            <div className="bill-delete-dialog-content">
              <span className="bill-delete-eyebrow">BILLBOX • {t.deleteBill}</span>
              <h2 id="bill-delete-title">{t.confirmDeleteTitle}</h2>
              <p>{t.confirmDeleteMessage}</p>

              <div className="bill-delete-summary">
                <div>
                  <span>{t.billNumber}</span>
                  <strong>
                    #{deleteConfirmBill.billNumber || deleteConfirmBill.id.slice(0, 7)}
                  </strong>
                </div>
                <div>
                  <span>{t.customer}</span>
                  <strong>{deleteConfirmBill.customerName || t.customerFallback}</strong>
                </div>
                <div>
                  <span>{t.amount}</span>
                  <strong>₹{formatMoney(deleteConfirmBill.grandTotal)}</strong>
                </div>
              </div>

              {deleteError && (
                <p className="bill-delete-error" role="alert">{deleteError}</p>
              )}

              <div className="bill-delete-dialog-actions">
                <button
                  type="button"
                  className="bill-delete-cancel"
                  onClick={cancelBillDelete}
                  disabled={Boolean(deletingBillId)}
                >
                  {t.cancelDelete}
                </button>
                <button
                  type="button"
                  className="bill-delete-confirm"
                  onClick={confirmBillDelete}
                  disabled={Boolean(deletingBillId)}
                >
                  {deletingBillId ? t.deleting : t.confirmDelete}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default BillHistory;
