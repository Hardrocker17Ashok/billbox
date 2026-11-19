import "./Dashboard.css";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { signOut } from "firebase/auth";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";

import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { auth, db, storage } from "../firebase";
import PageLoader from "../components/PageLoader";

// Per-bill cost in ₹
const PER_BILL_COST = 3;

const DEFAULT_PROFILE = {
  shopName: "",
  ownerName: "",
  phone: "",
  address: "",
  gstNumber: "",
  logoUrl: "",
  language: "en",
  theme: "dark",
  subscriptionPlan: "monthly",
  subscriptionStatus: "active",
  subscriptionDurationDays: 30,
  subscriptionStartAt: null,
  subscriptionEndsAt: null,
};

const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const isValidGSTIN = (value) => {
  if (!value) return true;
  return GSTIN_REGEX.test(value.trim().toUpperCase());
};

const TEXT = {
  hi: {
    admin: "व्यवस्थापक",
    profile: "प्रोफाइल",
    settings: "शॉप प्रोफाइल और सेटिंग्स",
    logout: "लॉग आउट",
    welcome: "स्वागत है,",
    welcomeText: "अपने ज्वेलरी व्यवसाय का काम आसानी से संभालें।",
    market: "आज का बाजार भाव",
    goldSilver: "सोना एवं चाँदी",
    lastUpdated: "अंतिम अपडेट:",
    live: "आज का भाव",
    loadingRates: "भाव लोड हो रहा है...",
    ratesError: "आज का भाव प्राप्त नहीं हो सका",
    gold24: "सोना 24K",
    gold22: "सोना 22K",
    gold18: "सोना 18K",
    silver999: "चाँदी 999",
    per10g: "प्रति 10 ग्राम",
    perKg: "प्रति किलो",
    newBill: "नया बिल",
    newBillText: "ग्राहक का नया बिल बनाएँ",
    jewellery: "ग्राहक लेजर",
    jewelleryText: "ग्राहक का पूरा लेन-देन और बकाया देखें",
    sales: "बिक्री",
    salesText: "आज की बिक्री देखें",
    billHistory: "बिल इतिहास",
    billHistoryText: "पुराने बिल देखें",
    summary: "सारांश",
    todayDetails: "आज का विवरण",
    today: "आज",
    todayBills: "आज के बिल",
    billsCreated: "आज बनाए गए बिल",
    todaySales: "आज की बिक्री",
    totalTodaySales: "आज की कुल बिक्री",
    thisMonth: "इस महीने",
    monthSales: "महीने की कुल बिक्री",
    activity: "हाल की गतिविधि",
    recentBills: "हाल के बिल",
    viewAll: "सभी देखें",
    billNumber: "बिल नंबर",
    customer: "ग्राहक",
    item: "आभूषण",
    amount: "राशि",
    loading: "लोड हो रहा है...",
    noBills: "आज अभी कोई बिल नहीं बनाया गया",
    trust: "विश्वास",
    purity: "शुद्धता",
    beauty: "सुंदरता",
    shopProfile: "शॉप प्रोफाइल",
    shopName: "दुकान का नाम",
    ownerName: "मालिक का नाम",
    phone: "फोन नंबर",
    address: "दुकान का पता",
    gst: "GST नंबर (वैकल्पिक)",
    logo: "दुकान का लोगो",
    chooseLogo: "लोगो चुनें",
    language: "भाषा",
    hindi: "हिन्दी",
    english: "English",
    theme: "थीम",
    dark: "डार्क",
    light: "लाइट",
    save: "सेटिंग्स सेव करें",
    saving: "सेव हो रहा है...",
    cancel: "रद्द करें",
    saved: "सेटिंग्स सेव हो गईं।",
    saveError: "सेटिंग्स सेव नहीं हो सकीं।",
    logoError: "लोगो अपलोड नहीं हो सका।",
    selectImage: "कृपया इमेज फाइल चुनें।",
    logoSize: "लोगो का साइज 5 MB से कम होना चाहिए।",
    gold: "सोना",
    silver: "चाँदी",
    gstInvalid: "कृपया सही 15 अंकों का GSTIN दर्ज करें।",
    gstValid: "GSTIN का फॉर्मेट सही है।",
    gstLength: "GSTIN में कुल 15 अक्षर होने चाहिए।",

    subscription: "सब्सक्रिप्शन",
    subscriptionTitle: "सब्सक्रिप्शन और बिलिंग",
    subscriptionSubtitle: "आपके प्लान, रिन्यूअल और बिल शुल्क की पूरी जानकारी",
    backToDashboard: "डैशबोर्ड पर वापस जाएँ",
    statusActive: "सक्रिय",
    statusExpired: "समाप्त",
    statusPending: "लंबित",
    daysRemaining: "शेष दिन",
    daysLeft: "दिन शेष",
    plan: "प्लान",
    planMonthly: "मासिक (Monthly)",
    planLabel: "सब्सक्रिप्शन प्लान",
    startedOn: "शुरू हुआ",
    renewsOn: "रिन्यूअल तारीख",
    totalBills: "कुल बनाए गए बिल",
    totalBillsLabel: "अब तक कुल बिल",
    perBillCost: "प्रति बिल लागत",
    perBillLabel: "प्रति बिल शुल्क",
    totalCharges: "कुल बिल शुल्क",
    totalChargesLabel: "कुल शुल्क (बिल × ₹3)",
    billingSummary: "बिलिंग सारांश",
    planDetails: "प्लान की जानकारी",
    renewNow: "WhatsApp पर रिन्यू करें",
    renewHeading: "सब्सक्रिप्शन रिन्यू करें",
    renewText: "रिन्यूअल, पेमेंट या प्लान से जुड़ी किसी भी सहायता के लिए हमारी टीम से संपर्क करें।",
    expiredMessage: "आपका सब्सक्रिप्शन समाप्त हो गया है। नए बिल बनाने के लिए कृपया रिन्यूअल पूरा करें।",
    activeMessage: "आपका सब्सक्रिप्शन सक्रिय है। आप बिल बना सकते हैं।",
    subscriptionNotFound: "सब्सक्रिप्शन की जानकारी उपलब्ध नहीं है। कृपया सहायता से संपर्क करें।",
    cycleBills: "इस साइकिल के बिल",
    lifetimeBills: "अब तक के कुल बिल",
    billsChargesNote: "₹3 प्रति बिल के हिसाब से कुल बिल शुल्क",
  },

  en: {
    admin: "Administrator",
    profile: "Profile",
    settings: "Shop Profile & Settings",
    logout: "Log out",
    welcome: "Welcome,",
    welcomeText: "Manage your jewellery business with ease.",
    market: "TODAY'S MARKET RATES",
    goldSilver: "Gold & Silver",
    lastUpdated: "Last updated:",
    live: "Live rates",
    loadingRates: "Loading rates...",
    ratesError: "Today's rates could not be loaded.",
    gold24: "Gold 24K",
    gold22: "Gold 22K",
    gold18: "Gold 18K",
    silver999: "Silver 999",
    per10g: "Per 10 grams",
    perKg: "Per kilogram",
    newBill: "New Bill",
    newBillText: "Create a new customer bill",
    jewellery: "Customer Ledger",
    jewelleryText: "Track customer payments and outstanding bills",
    sales: "Sales",
    salesText: "View today's sales",
    billHistory: "Bill History",
    billHistoryText: "View previous bills",
    summary: "SUMMARY",
    todayDetails: "Today's Overview",
    today: "Today",
    todayBills: "Today's Bills",
    billsCreated: "Bills created today",
    todaySales: "Today's Sales",
    totalTodaySales: "Total sales today",
    thisMonth: "This Month",
    monthSales: "Total sales this month",
    activity: "RECENT ACTIVITY",
    recentBills: "Recent Bills",
    viewAll: "View all",
    billNumber: "Bill Number",
    customer: "Customer",
    item: "Item",
    amount: "Amount",
    loading: "Loading...",
    noBills: "No bills have been created today.",
    trust: "Trust",
    purity: "Purity",
    beauty: "Beauty",
    shopProfile: "Shop Profile",
    shopName: "Shop name",
    ownerName: "Owner name",
    phone: "Phone number",
    address: "Shop address",
    gst: "GST number (optional)",
    logo: "Shop logo",
    chooseLogo: "Choose logo",
    language: "Language",
    hindi: "हिन्दी",
    english: "English",
    theme: "Theme",
    dark: "Dark",
    light: "Light",
    save: "Save Settings",
    saving: "Saving...",
    cancel: "Cancel",
    saved: "Settings saved successfully.",
    saveError: "Could not save settings.",
    logoError: "Could not upload the logo.",
    selectImage: "Please select an image file.",
    logoSize: "Logo must be smaller than 5 MB.",
    gold: "Gold",
    silver: "Silver",
    gstInvalid: "Please enter a valid GSTIN format.",
    gstValid: "GSTIN format is valid.",
    gstLength: "GSTIN must contain exactly 15 characters.",

    subscription: "Subscription",
    subscriptionTitle: "Subscription & Billing",
    subscriptionSubtitle: "Full details of your plan, renewal and bill charges.",
    backToDashboard: "Back to Dashboard",
    statusActive: "Active",
    statusExpired: "Expired",
    statusPending: "Pending",
    daysRemaining: "Days Remaining",
    daysLeft: "days left",
    plan: "Plan",
    planMonthly: "Monthly",
    planLabel: "Subscription Plan",
    startedOn: "Started On",
    renewsOn: "Renews On",
    totalBills: "Total Bills Created",
    totalBillsLabel: "Total bills till now",
    perBillCost: "Per Bill Cost",
    perBillLabel: "Per bill charge",
    totalCharges: "Total Bill Charges",
    totalChargesLabel: "Total charges (bills × ₹3)",
    billingSummary: "Billing Summary",
    planDetails: "Plan Details",
    renewNow: "Renew on WhatsApp",
    renewHeading: "Renew your subscription",
    renewText: "Contact our team for renewal, payment or any plan-related help.",
    expiredMessage: "Your subscription has expired. Please complete the renewal to continue creating bills.",
    activeMessage: "Your subscription is active. You can create bills.",
    subscriptionNotFound: "Subscription details are not available. Please contact support.",
    cycleBills: "Bills this cycle",
    lifetimeBills: "Total bills till now",
    billsChargesNote: "Total bill charges calculated at ₹3 per bill",
  },
};

const SUPPORT_WHATSAPP_NUMBER = "919358943693";


const toDateSafe = (value) => {
  if (!value) return null;
  try {
    const date = value?.toDate ? value.toDate() : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

const formatDate = (date, language) => {
  if (!date) return "—";
  return date.toLocaleDateString(language === "hi" ? "hi-IN" : "en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function Dashboard() {
  const [showSubscriptionExpired, setShowSubscriptionExpired] = useState(false);

  const navigate = useNavigate();
  const user = auth.currentUser;

  const [showMenu, setShowMenu] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const profileWrapperRef = useRef(null);
  const [showSettings, setShowSettings] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeError, setNoticeError] = useState(false);

  useEffect(() => {
    if (!showMenu) return;

    const handleOutsideClick = (event) => {
      if (
        profileWrapperRef.current &&
        !profileWrapperRef.current.contains(event.target)
      ) {
        setShowMenu(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") setShowMenu(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showMenu]);

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => {
      setNotice("");
      setNoticeError(false);
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [notice]);

  const [profile, setProfile] = useState({ ...DEFAULT_PROFILE });
  const [draft, setDraft] = useState({ ...DEFAULT_PROFILE });

  const language = profile.language === "en" ? "en" : "hi";
  const t = TEXT[language];

  const [recentBills, setRecentBills] = useState([]);
  const [recentBillsLoading, setRecentBillsLoading] = useState(true);
  const [todayBillsCount, setTodayBillsCount] = useState(0);
  const [totalBillsCount, setTotalBillsCount] = useState(0);
  const [todaySales, setTodaySales] = useState(0);
  const [monthlySales, setMonthlySales] = useState(0);
  const [todayPaid, setTodayPaid] = useState(0);
  const [monthlyPaid, setMonthlyPaid] = useState(0);

  const [metalRates, setMetalRates] = useState({
    gold24: null,
    gold22: null,
    gold18: null,
    silver999: null,
  });

  const [ratesUpdatedAt, setRatesUpdatedAt] = useState(null);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesError, setRatesError] = useState("");

  const money = useCallback(
    (amount) =>
      Number(amount || 0).toLocaleString(
        language === "hi" ? "en-IN" : "en-IN",
        { maximumFractionDigits: 2 }
      ),
    [language]
  );

  const formatMonthlySales = (amount) => {
    const value = Number(amount || 0);
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)} K`;
    return `₹${money(value)}`;
  };

  useEffect(() => {
    if (!user) return;
    let active = true;

    const preloadShopLogo = (logoUrl) => {
      if (!logoUrl) return Promise.resolve();
      return new Promise((resolve) => {
        const image = new Image();
        let completed = false;
        const finish = () => {
          if (completed) return;
          completed = true;
          window.clearTimeout(timeout);
          image.onload = null;
          image.onerror = null;
          resolve();
        };
        const timeout = window.setTimeout(finish, 10000);
        image.onload = finish;
        image.onerror = finish;
        image.src = logoUrl;
        if (image.complete) finish();
      });
    };

    const loadProfile = async () => {
      try {
        const shopRef = doc(db, "shops", user.uid);
        const snapshot = await getDoc(shopRef);
        if (!active) return;

        if (!snapshot.exists()) {
          console.error("Shop document not found:", `shops/${user.uid}`);
          setNotice("Shop profile not found. Please contact BillBox support.");
          setNoticeError(true);
          setProfile(DEFAULT_PROFILE);
          setDraft(DEFAULT_PROFILE);
          return;
        }

        const saved = snapshot.data();
        const merged = {
          ...DEFAULT_PROFILE,
          ...saved,
          theme: saved.theme === "light" ? "light" : "dark",
          language: saved.language === "hi" ? "hi" : "en",
        };

        await preloadShopLogo(merged.logoUrl);
        if (!active) return;

        setProfile(merged);
        setDraft(merged);

        localStorage.setItem("billbox-theme", merged.theme);
        localStorage.setItem("billbox-language", merged.language);

        document.documentElement.dataset.theme = merged.theme;
        document.body.dataset.theme = merged.theme;
        document.documentElement.dataset.language = merged.language;
      } catch (error) {
        console.error("Shop profile load error:", error);
        if (active) {
          setNotice(
            `Could not load shop profile: ${error.code || error.message}`
          );
          setNoticeError(true);
        }
      } finally {
        if (active) setProfileLoading(false);
      }
    };

    loadProfile();
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    document.documentElement.dataset.theme =
      profile.theme === "light" ? "light" : "dark";
    document.body.dataset.theme =
      profile.theme === "light" ? "light" : "dark";
  }, [profile.theme]);

  const updateDraft = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const openSettings = () => {
    setDraft({ ...profile });
    setNotice("");
    setShowMenu(false);
    setShowHelp(false);
    setShowSubscription(false);
    setShowSettings(true);
  };

  const openSubscription = () => {
    setShowMenu(false);
    setShowSettings(false);
    setShowHelp(false);
    setShowSubscription(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openHelpCentre = () => {
    setShowMenu(false);
    setShowSettings(false);
    setShowSubscription(false);
    setShowHelp(true);
    setShowProblemForm(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNewBillClick = () => {
    const expiry = toDateSafe(profile.subscriptionEndsAt);
    const isSubscriptionValid =
      profile.subscriptionStatus === "active" &&
      expiry &&
      expiry.getTime() > Date.now();

    if (!isSubscriptionValid) {
      setShowSubscriptionExpired(true);
      return;
    }
    navigate("/new-bill");
  };

  const saveSettings = async (event) => {
    event.preventDefault();
    if (!user) return;

    if (!draft.shopName.trim()) {
      setNotice("Please enter your shop name.");
      setNoticeError(true);
      return;
    }
    const gstin = draft.gstNumber.trim().toUpperCase();
    if (!isValidGSTIN(gstin)) {
      setNotice(TEXT[language].gstInvalid);
      setNoticeError(true);
      return;
    }

    setSaving(true);
    setNotice("");
    setNoticeError(false);

    try {
      const payload = {
        shopName: draft.shopName.trim(),
        ownerName: draft.ownerName.trim(),
        phone: draft.phone.trim(),
        address: draft.address.trim(),
        gstNumber: gstin,
        logoUrl: draft.logoUrl || "",
        language: draft.language === "hi" ? "hi" : "en",
        theme: draft.theme === "light" ? "light" : "dark",
      };

      await updateDoc(doc(db, "shops", user.uid), payload);

      setProfile((current) => ({ ...current, ...payload }));
      setDraft((current) => ({ ...current, ...payload }));

      localStorage.setItem("billbox-theme", payload.theme);
      localStorage.setItem("billbox-language", payload.language);

      window.dispatchEvent(
        new CustomEvent("billbox-preferences-change", {
          detail: { theme: payload.theme, language: payload.language },
        })
      );

      document.documentElement.dataset.theme = payload.theme;
      document.body.dataset.theme = payload.theme;
      document.documentElement.dataset.language = payload.language;

      setNotice(TEXT[payload.language].saved);
      setShowSettings(false);
    } catch (error) {
      console.error("Save shop profile error:", error);
      setNoticeError(true);
      setNotice(`${TEXT[language].saveError} (${error.code || error.message})`);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setNoticeError(true);
      setNotice(t.selectImage);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setNoticeError(true);
      setNotice(t.logoSize);
      return;
    }
    if (!user) return;

    const oldLogoUrl = draft.logoUrl || profile.logoUrl || "";
    setLogoUploading(true);
    setNotice("");
    setNoticeError(false);

    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `shop-logos/${user.uid}/${Date.now()}-${safeName}`;
      const fileRef = storageRef(storage, path);

      await uploadBytes(fileRef, file, { contentType: file.type });
      const newLogoUrl = await getDownloadURL(fileRef);
      await updateDoc(doc(db, "shops", user.uid), { logoUrl: newLogoUrl });

      setDraft((current) => ({ ...current, logoUrl: newLogoUrl }));
      setProfile((current) => ({ ...current, logoUrl: newLogoUrl }));

      if (oldLogoUrl && oldLogoUrl !== newLogoUrl) {
        try {
          const oldFileRef = storageRef(storage, oldLogoUrl);
          const allowedPath = `shop-logos/${user.uid}/`;
          if (oldFileRef.fullPath.startsWith(allowedPath)) {
            await deleteObject(oldFileRef);
            console.log("Previous logo deleted successfully.");
          }
        } catch (deleteError) {
          console.warn("Previous logo could not be deleted:", deleteError);
        }
      }

      setNotice("Logo uploaded and saved successfully!");
      setNoticeError(false);
    } catch (error) {
      console.error("Logo upload/save error:", error);
      setNoticeError(true);
      setNotice(error.code ? `${t.logoError} (${error.code})` : t.logoError);
    } finally {
      setLogoUploading(false);
    }
  };

  const fetchMetalRates = useCallback(async () => {
    try {
      const [goldRes, silverRes] = await Promise.all([
        fetch("https://snapdata.dev/api/v1/gold/in/latest.json"),
        fetch("https://snapdata.dev/api/v1/silver/in/latest.json"),
      ]);
      if (!goldRes.ok || !silverRes.ok) {
        throw new Error("Market rate request failed");
      }

      const goldData = await goldRes.json();
      const silverData = await silverRes.json();

      setRatesError("");
      setRatesUpdatedAt(
        goldData.generated_at || silverData.generated_at || null
      );

      const goldRates = { gold24: null, gold22: null, gold18: null };
      goldData.observations?.forEach((item) => {
        if (item.instrument_id === "XAU.24K.INR.G") goldRates.gold24 = item.value;
        if (item.instrument_id === "XAU.22K.INR.G") goldRates.gold22 = item.value;
        if (item.instrument_id === "XAU.18K.INR.G") goldRates.gold18 = item.value;
      });

      const silverRate = silverData.observations?.find(
        (item) => item.instrument_id === "XAG.INR.KG"
      );

      setMetalRates({ ...goldRates, silver999: silverRate?.value ?? null });
    } catch (error) {
      console.error("Metal rates error:", error);
      setRatesError(TEXT[language].ratesError);
    } finally {
      setRatesLoading(false);
    }
  }, [language]);

  useEffect(() => {
    let cancelled = false;
    const loadRates = async () => {
      if (!cancelled) await fetchMetalRates();
    };
    loadRates();
    return () => {
      cancelled = true;
    };
  }, [fetchMetalRates]);

  useEffect(() => {
    let active = true;

    const fetchDashboardData = async () => {
      try {
        const billsQuery = query(
          collection(db, "bills"),
          where("ownerId", "==", user.uid)
        );
        const snapshot = await getDocs(billsQuery);
        const allBills = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const currentDate = now.getDate();

        const getBillDate = (bill) => {
          if (!bill.createdAt) return null;
          try {
            const date = bill.createdAt?.toDate
              ? bill.createdAt.toDate()
              : new Date(bill.createdAt);
            return Number.isNaN(date.getTime()) ? null : date;
          } catch {
            return null;
          }
        };

        const todayBills = allBills
          .filter((bill) => {
            const date = getBillDate(bill);
            return (
              date &&
              date.getFullYear() === currentYear &&
              date.getMonth() === currentMonth &&
              date.getDate() === currentDate
            );
          })
          .sort((a, b) => getBillDate(b) - getBillDate(a));

        const monthBills = allBills.filter((bill) => {
          const date = getBillDate(bill);
          return (
            date &&
            date.getFullYear() === currentYear &&
            date.getMonth() === currentMonth
          );
        });

        const todayTotal = todayBills.reduce(
          (total, bill) =>
            total + Number(bill.grandTotal || bill.totalAmount || 0),
          0
        );
        const monthTotal = monthBills.reduce(
          (total, bill) =>
            total + Number(bill.grandTotal || bill.totalAmount || 0),
          0
        );

        const getPaidAmount = (bill) =>
          Number(
            bill.paidAmount ?? bill.amountPaid ?? bill.payment?.paid ?? 0
          ) || 0;

        const todayPaidTotal = todayBills.reduce(
          (sum, bill) => sum + getPaidAmount(bill),
          0
        );
        const monthPaidTotal = monthBills.reduce(
          (sum, bill) => sum + getPaidAmount(bill),
          0
        );

        if (!active) return;

        setTodayBillsCount(todayBills.length);
        setTotalBillsCount(allBills.length);
        setTodaySales(todayTotal);
        setMonthlySales(monthTotal);
        setTodayPaid(todayPaidTotal);
        setMonthlyPaid(monthPaidTotal);
        setRecentBills(todayBills.slice(0, 3));
      } catch (error) {
        console.error("Dashboard Firebase Error:", error);
        if (!active) return;
        setRecentBills([]);
        setTodayBillsCount(0);
        setTotalBillsCount(0);
        setTodaySales(0);
        setMonthlySales(0);
        setTodayPaid(0);
        setMonthlyPaid(0);
      } finally {
        if (active) setRecentBillsLoading(false);
      }
    };

    fetchDashboardData();
    return () => {
      active = false;
    };
  }, [user]);

  const openWhatsAppSupport = (message) => {
    if (!SUPPORT_WHATSAPP_NUMBER) {
      window.alert(
        "Please add the official BillBox WhatsApp support number in Dashboard.jsx (SUPPORT_WHATSAPP_NUMBER) before using this option."
      );
      return;
    }
    const url = `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(
      message
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };




  const handleLogout = () => {
    setShowMenu(false);
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    try {
      await signOut(auth);
      setShowLogoutConfirm(false);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
      setNoticeError(true);
      setNotice(
        language === "en"
          ? "Unable to log out. Please try again."
          : "लॉग आउट नहीं हो सका। कृपया दोबारा प्रयास करें।"
      );
      setShowLogoutConfirm(false);
    }
  };

  const shopName = profile.shopName || "BillBox";
  const ownerName = profile.ownerName || t.admin;
  const avatarLetter = (profile.ownerName || shopName || "B")
    .trim()
    .charAt(0)
    .toUpperCase();

  const subscriptionStartDate = toDateSafe(profile.subscriptionStartAt);
  const subscriptionEndDate = toDateSafe(profile.subscriptionEndsAt);

  const daysRemaining = subscriptionEndDate
    ? Math.max(
        0,
        Math.ceil(
          (subscriptionEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  const isSubscriptionActive =
    profile.subscriptionStatus === "active" &&
    subscriptionEndDate &&
    subscriptionEndDate.getTime() > Date.now();

  const totalBillCharges = totalBillsCount * PER_BILL_COST;

  const statusLabel = isSubscriptionActive
    ? t.statusActive
    : profile.subscriptionStatus === "active"
    ? t.statusExpired
    : profile.subscriptionStatus === "pending"
    ? t.statusPending
    : t.statusExpired;

  if (profileLoading || recentBillsLoading || ratesLoading) {
    return (
      <PageLoader
        loading={true}
        message={
          language === "en"
            ? "Preparing your dashboard..."
            : "आपका डैशबोर्ड तैयार हो रहा है..."
        }
        fullScreen={true}
      />
    );
  }

  return (
    <div
      className={`dashboard ${
        profile.theme === "light" ? "dashboard-light" : ""
      }`}
    >
      <header className="topbar">
        <div className="brand">
          {profile.logoUrl ? (
            <img src={profile.logoUrl} alt={shopName} />
          ) : (
            <div className="brand-fallback">
              {shopName.trim().charAt(0).toUpperCase()}
            </div>
          )}
          <span className="brand-owner-name">{shopName}</span>
        </div>

        <div className="topbar-right">
          <div className="profile-wrapper" ref={profileWrapperRef}>
            <button
              type="button"
              className="admin-avatar"
              onClick={() => setShowMenu((current) => !current)}
              aria-label={t.profile}
              aria-expanded={showMenu}
            >
              <span className="admin-avatar-letter">{avatarLetter}</span>
              <span className="admin-avatar-chevron" aria-hidden="true">
                ⌄
              </span>
            </button>

            {showMenu && (
              <div className="profile-menu">
                <div className="profile-menu-header">
                  <div className="profile-menu-avatar">{avatarLetter}</div>
                  <div>
                    <strong>{ownerName}</strong>
                    <span>{shopName}</span>
                  </div>
                </div>

                <div className="profile-menu-divider" />

                <button
                  type="button"
                  className="profile-action-button"
                  onClick={openSettings}
                >
                  <span aria-hidden="true">⚙</span>
                  <span>{t.settings}</span>
                </button>

                <button
                  type="button"
                  className="profile-action-button profile-subscription-button"
                  onClick={openSubscription}
                >
                  <span aria-hidden="true">₹</span>
                  <span>{t.subscription}</span>
                  {!isSubscriptionActive && (
                    <span className="subscription-alert-dot" aria-hidden="true" />
                  )}
                </button>

                <button
                  type="button"
                  className="profile-action-button profile-help-button"
                  onClick={openHelpCentre}
                >
                  <span aria-hidden="true">?</span>
                  <span>
                    {language === "en" ? "Help & Support" : "हेल्प और सपोर्ट"}
                  </span>
                </button>

                <button
                  type="button"
                  className="logout-button"
                  onClick={handleLogout}
                >
                  <span className="logout-icon" aria-hidden="true">
                    ↪
                  </span>
                  <span>{t.logout}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {notice && !showSettings && (
        <div
          className={`dashboard-notice ${noticeError ? "is-error" : ""}`}
          role="status"
          aria-live="polite"
        >
          {notice}
          <button type="button" onClick={() => setNotice("")} aria-label="Close">
            ×
          </button>
        </div>
      )}

      {showSubscription ? (
        <main className="dashboard-content subscription-page-content">
          <section className="subscription-hero">
            <button
              type="button"
              className="help-back-button"
              onClick={() => setShowSubscription(false)}
            >
              <span aria-hidden="true">←</span>
              {t.backToDashboard}
            </button>

            <div className="subscription-hero-copy">
              <span className="help-eyebrow">BILLBOX SUBSCRIPTION</span>
              <h1>{t.subscriptionTitle}</h1>
              <p>{t.subscriptionSubtitle}</p>
            </div>

            <div
              className={`subscription-status-pill ${
                isSubscriptionActive ? "is-active" : "is-expired"
              }`}
            >
              <span className="subscription-status-dot" />
              {statusLabel}
            </div>
          </section>

          <section className="subscription-highlight-card">
            <div className="subscription-highlight-left">
              <span className="help-eyebrow">{t.daysRemaining}</span>
              <h2 className="subscription-days-number">
                {isSubscriptionActive ? daysRemaining : 0}
                <small>
                  {isSubscriptionActive
                    ? ` ${t.daysLeft}`
                    : ` — ${t.statusExpired}`}
                </small>
              </h2>
              <p>
                {isSubscriptionActive
                  ? `${t.renewsOn}: ${formatDate(subscriptionEndDate, language)}`
                  : t.expiredMessage}
              </p>
            </div>

            <div className="subscription-highlight-right">
              <div className="subscription-mini-row">
                <span>{t.startedOn}</span>
                <strong>{formatDate(subscriptionStartDate, language)}</strong>
              </div>
              <div className="subscription-mini-row">
                <span>{t.renewsOn}</span>
                <strong>{formatDate(subscriptionEndDate, language)}</strong>
              </div>
              <div className="subscription-mini-row">
                <span>{t.plan}</span>
                <strong>{t.planMonthly}</strong>
              </div>
            </div>
          </section>

          <section className="subscription-section">
            <div className="help-section-heading">
              <span className="help-eyebrow">BILLING</span>
              <h2>{t.billingSummary}</h2>
              <p>{t.billsChargesNote}</p>
            </div>

            <div className="subscription-stats-grid">
              <div className="subscription-stat-card">
                <span className="subscription-stat-label">
                  {t.totalBillsLabel}
                </span>
                <strong>{totalBillsCount}</strong>
                <small>{t.totalBills}</small>
              </div>

              <div className="subscription-stat-card">
                <span className="subscription-stat-label">
                  {t.perBillLabel}
                </span>
                <strong>₹{PER_BILL_COST}</strong>
                <small>{t.perBillCost}</small>
              </div>

              <div className="subscription-stat-card subscription-stat-highlight">
                <span className="subscription-stat-label">
                  {t.totalChargesLabel}
                </span>
                <strong>₹{money(totalBillCharges)}</strong>
                <small>{t.totalCharges}</small>
              </div>
            </div>
          </section>

          <section className="subscription-section">
            <div className="help-section-heading">
              <span className="help-eyebrow">PLAN</span>
              <h2>{t.planDetails}</h2>
            </div>

            <div className="subscription-plan-card">
              <div className="subscription-plan-row">
                <span>{t.planLabel}</span>
                <strong>{t.planMonthly}</strong>
              </div>
              <div className="subscription-plan-row">
                <span>{t.startedOn}</span>
                <strong>{formatDate(subscriptionStartDate, language)}</strong>
              </div>
              <div className="subscription-plan-row">
                <span>{t.renewsOn}</span>
                <strong>{formatDate(subscriptionEndDate, language)}</strong>
              </div>
              <div className="subscription-plan-row">
                <span>{t.perBillLabel}</span>
                <strong>₹{PER_BILL_COST}</strong>
              </div>
            </div>
          </section>

          <section className="subscription-renew-cta">
            <div>
              <span className="help-eyebrow">RENEWAL</span>
              <h2>{t.renewHeading}</h2>
              <p>{t.renewText}</p>
            </div>

            <button
              type="button"
              onClick={() =>
                openWhatsAppSupport(
                  language === "en"
                    ? `Hello BillBox Team,\n\nI want to renew my subscription.\n\nShop: ${profile.shopName}\nOwner: ${profile.ownerName}\nCurrent plan: Monthly\nRenews on: ${formatDate(
                        subscriptionEndDate,
                        "en"
                      )}\n\nPlease share renewal details and payment information.`
                    : `नमस्ते BillBox Team,\n\nमैं अपना सब्सक्रिप्शन रिन्यू करना चाहता/चाहती हूँ।\n\nदुकान: ${
                        profile.shopName
                      }\nमालिक: ${
                        profile.ownerName
                      }\nप्लान: मासिक\nरिन्यूअल तारीख: ${formatDate(
                        subscriptionEndDate,
                        "hi"
                      )}\n\nकृपया रिन्यूअल और पेमेंट की जानकारी भेजें।`
                )
              }
            >
              {t.renewNow} <span aria-hidden="true">↗</span>
            </button>
          </section>
        </main>
      ) : showHelp ? (
        <main className="dashboard-content help-page-content">
          <section className="help-hero help-hero-simple">
            <button
              type="button"
              className="help-back-button"
              onClick={() => setShowHelp(false)}
            >
              <span aria-hidden="true">←</span>
              {language === "en" ? "Back to Dashboard" : "डैशबोर्ड पर वापस जाएँ"}
            </button>

            <div className="help-hero-copy">
              <span className="help-eyebrow">BILLBOX CUSTOMER CARE</span>
              <h1>
                {language === "en"
                  ? "We're here to help."
                  : "हम आपकी मदद के लिए यहाँ हैं।"}
              </h1>
              <p>
                {language === "en"
                  ? "Connect with our team for billing, account or technical support."
                  : "बिलिंग, अकाउंट या तकनीकी सहायता के लिए हमारी टीम से संपर्क करें।"}
              </p>
            </div>
          </section>

          <section className="help-contact-section">
            <div className="help-section-heading">
              <span className="help-eyebrow">GET IN TOUCH</span>
              <h2>{language === "en" ? "Contact our team" : "हमसे संपर्क करें"}</h2>
              <p>
                {language === "en"
                  ? "Choose the way that works best for you."
                  : "अपनी सुविधा के अनुसार संपर्क का तरीका चुनें।"}
              </p>
            </div>

            <div className="help-contact-grid help-contact-grid-three">
              <article className="help-contact-card help-contact-detail-card">
                <div className="help-contact-icon">☎</div>
                <span className="help-card-kicker">
                  {language === "en" ? "CALL US" : "हमें कॉल करें"}
                </span>
                <h2>{language === "en" ? "Phone Support" : "फोन सपोर्ट"}</h2>
                <a className="help-contact-value" href="tel:9358943693">9358943693</a>
                <p>
                  {language === "en"
                    ? "Call us for direct assistance."
                    : "सीधी सहायता के लिए हमें कॉल करें।"}
                </p>
                <a className="help-contact-action" href="tel:9358943693">
                  {language === "en" ? "Call now" : "अभी कॉल करें"} <span>↗</span>
                </a>
              </article>

              <article className="help-contact-card help-contact-detail-card">
                <div className="help-contact-icon">✉</div>
                <span className="help-card-kicker">
                  {language === "en" ? "EMAIL US" : "हमें ईमेल करें"}
                </span>
                <h2>{language === "en" ? "Email Support" : "ईमेल सपोर्ट"}</h2>
                <a className="help-contact-value help-email-value" href="mailto:billbox@techsez.in">
                  billbox@techsez.in
                </a>
                <p>
                  {language === "en"
                    ? "Send your query and our team will assist you."
                    : "अपना सवाल भेजें, हमारी टीम आपकी सहायता करेगी।"}
                </p>
                <a className="help-contact-action" href="mailto:billbox@techsez.in">
                  {language === "en" ? "Send email" : "ईमेल भेजें"} <span>↗</span>
                </a>
              </article>

              <article className="help-contact-card help-whatsapp-card help-contact-detail-card">
                <div className="help-contact-icon">◉</div>
                <span className="help-card-kicker">
                  {language === "en" ? "QUICK SUPPORT" : "त्वरित सहायता"}
                </span>
                <h2>{language === "en" ? "WhatsApp Support" : "WhatsApp सपोर्ट"}</h2>
                <a
                  className="help-contact-value"
                  href="https://wa.me/919358943693"
                  target="_blank"
                  rel="noreferrer"
                >
                  9358943693
                </a>
                <p>
                  {language === "en"
                    ? "Message us for quick help with your account."
                    : "अपने अकाउंट से जुड़ी सहायता के लिए मैसेज करें।"}
                </p>
                <a
                  className="help-contact-action"
                  href="https://wa.me/919358943693"
                  target="_blank"
                  rel="noreferrer"
                >
                  {language === "en" ? "Chat on WhatsApp" : "WhatsApp पर चैट करें"} <span>↗</span>
                </a>
              </article>
            </div>
          </section>

          <section className="help-bottom-cta">
            <div>
              <span className="help-eyebrow">BILLBOX SUPPORT</span>
              <h2>
                {language === "en"
                  ? "Need assistance with BillBox?"
                  : "BillBox में सहायता चाहिए?"}
              </h2>
              <p>
                {language === "en"
                  ? "Our support team is ready to help you."
                  : "हमारी सपोर्ट टीम आपकी मदद के लिए तैयार है।"}
              </p>
            </div>
            <a className="help-contact-action help-cta-action" href="mailto:billbox@techsez.in">
              {language === "en" ? "Contact our team" : "हमसे संपर्क करें"} ↗
            </a>
          </section>
        </main>
      ) : (
        <main className="dashboard-content">
          <section className="welcome">
            <div>
              <span className="welcome-label">{shopName}</span>
              <h1>
                {t.welcome} <em>{ownerName}</em>
              </h1>
              <p>{t.welcomeText}</p>
            </div>
          </section>

          <section className="metal-rates-card">
            <div className="metal-rates-header">
              <div>
                <span className="metal-rates-label">{t.market}</span>
                <h3>{t.goldSilver}</h3>
                {ratesUpdatedAt && (
                  <small className="rates-last-update">
                    {t.lastUpdated}{" "}
                    {new Date(ratesUpdatedAt).toLocaleString(
                      language === "hi" ? "hi-IN" : "en-IN",
                      {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </small>
                )}
              </div>
              <span className="metal-rates-live">● {t.live}</span>
            </div>

            {ratesLoading ? (
              <div className="rates-loading">{t.loadingRates}</div>
            ) : ratesError ? (
              <div className="rates-error">{ratesError}</div>
            ) : (
              <div className="metal-rates-grid">
                <div className="metal-rate-item">
                  <span>{t.gold24}</span>
                  <strong>
                    ₹{" "}
                    {metalRates.gold24 != null
                      ? Number(metalRates.gold24 * 10).toLocaleString("en-IN")
                      : "--"}
                  </strong>
                  <small>{t.per10g}</small>
                </div>
                <div className="metal-rate-item">
                  <span>{t.gold22}</span>
                  <strong>
                    ₹{" "}
                    {metalRates.gold22 != null
                      ? Number(metalRates.gold22 * 10).toLocaleString("en-IN")
                      : "--"}
                  </strong>
                  <small>{t.per10g}</small>
                </div>
                <div className="metal-rate-item">
                  <span>{t.gold18}</span>
                  <strong>
                    ₹{" "}
                    {metalRates.gold18 != null
                      ? Number(metalRates.gold18 * 10).toLocaleString("en-IN")
                      : "--"}
                  </strong>
                  <small>{t.per10g}</small>
                </div>
                <div className="metal-rate-item">
                  <span>{t.silver999}</span>
                  <strong>
                    ₹{" "}
                    {metalRates.silver999 != null
                      ? Number(metalRates.silver999).toLocaleString("en-IN")
                      : "--"}
                  </strong>
                  <small>{t.perKg}</small>
                </div>
              </div>
            )}
          </section>

          <section className="actions">
            <button
              type="button"
              className="action-card main-action"
              onClick={handleNewBillClick}
            >
              <div className="action-icon">+</div>
              <div className="action-content">
                <h2>{t.newBill}</h2>
                <p>{t.newBillText}</p>
              </div>
              <span className="action-arrow">→</span>
            </button>

            <button
              type="button"
              className="action-card ledger-action"
              onClick={() => navigate("/customer-ledger")}
            >
              <div className="action-icon">▥</div>
              <div className="action-content">
                <h2>{t.jewellery}</h2>
                <p>{t.jewelleryText}</p>
              </div>
              <span className="action-arrow">→</span>
            </button>

            <button
              type="button"
              className="action-card"
              onClick={() => navigate("/today-sales")}
            >
              <div className="action-icon">₹</div>
              <div className="action-content">
                <h2>{t.sales}</h2>
                <p>{t.salesText}</p>
              </div>
              <span className="action-arrow">→</span>
            </button>

            <button
              type="button"
              className="action-card"
              onClick={() => navigate("/bill-history")}
            >
              <div className="action-icon">▤</div>
              <div className="action-content">
                <h2>{t.billHistory}</h2>
                <p>{t.billHistoryText}</p>
              </div>
              <span className="action-arrow">→</span>
            </button>
          </section>

          <section className="summary-section">
            <div className="section-heading">
              <div>
                <span>{t.summary}</span>
                <h2>{t.todayDetails}</h2>
              </div>
              <div className="today-date">{t.today}</div>
            </div>

            <div className="summary-grid">
              <div className="summary-card">
                <span className="summary-title">{t.todayBills}</span>
                <strong>{todayBillsCount}</strong>
                <p>{t.billsCreated}</p>
              </div>

              <div className="summary-card">
                <span className="summary-title">{t.todaySales}</span>
                <div className="summary-sales-row">
                  <strong>₹{money(todaySales)}</strong>
                  <div
                    className="summary-payment-flip"
                    aria-label={
                      language === "en"
                        ? "Paid amount and total amount"
                        : "प्राप्त राशि और कुल राशि"
                    }
                  >
                    <div className="flip-track">
                      <span>
                        <small>{language === "en" ? "PAID" : "प्राप्त"}</small>
                        <b>₹{money(todayPaid)}</b>
                      </span>
                      <span>
                        <small>{language === "en" ? "TOTAL" : "कुल"}</small>
                        <b>₹{money(todaySales)}</b>
                      </span>
                    </div>
                  </div>
                </div>
                <p>{t.totalTodaySales}</p>
              </div>

              <div className="summary-card">
                <span className="summary-title">{t.thisMonth}</span>
                <div className="summary-sales-row">
                  <strong>{formatMonthlySales(monthlySales)}</strong>
                  <div
                    className="summary-payment-flip"
                    aria-label={
                      language === "en"
                        ? "Paid amount and total amount"
                        : "प्राप्त राशि और कुल राशि"
                    }
                  >
                    <div className="flip-track">
                      <span>
                        <small>{language === "en" ? "PAID" : "प्राप्त"}</small>
                        <b>
                          ₹
                          {formatMonthlySales(monthlyPaid).replace(/^₹/, "")}
                        </b>
                      </span>
                      <span>
                        <small>{language === "en" ? "TOTAL" : "कुल"}</small>
                        <b>
                          ₹
                          {formatMonthlySales(monthlySales).replace(/^₹/, "")}
                        </b>
                      </span>
                    </div>
                  </div>
                </div>
                <p>{t.monthSales}</p>
              </div>
            </div>
          </section>

          <section className="recent-section">
            <div className="section-heading">
              <div>
                <span>{t.activity}</span>
                <h2>{t.recentBills}</h2>
              </div>
              <button
                type="button"
                className="view-all"
                onClick={() => navigate("/bill-history")}
              >
                {t.viewAll} →
              </button>
            </div>

            <div className="recent-table">
              <div className="table-header">
                <span>{t.billNumber}</span>
                <span>{t.customer}</span>
                <span>{t.item}</span>
                <span>{t.amount}</span>
              </div>

              {recentBillsLoading && (
                <div className="table-row">
                  <span>{t.loading}</span>
                </div>
              )}

              {!recentBillsLoading && recentBills.length === 0 && (
                <div className="table-row">
                  <span>{t.noBills}</span>
                </div>
              )}

              {!recentBillsLoading &&
                recentBills.map((bill) => (
                  <div
                    className="table-row recent-bill-clickable"
                    key={bill.id}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      navigate(
                        `/bill-history?billId=${encodeURIComponent(bill.id)}`
                      )
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(
                          `/bill-history?billId=${encodeURIComponent(bill.id)}`
                        );
                      }
                    }}
                    title={
                      language === "en"
                        ? "Open bill details"
                        : "बिल का विवरण देखें"
                    }
                  >
                    <span className="bill-no">
                      #{bill.billNumber || bill.id.slice(0, 7)}
                    </span>
                    <span>{bill.customerName || t.customer}</span>
                    <span className="item-name">
                      {bill.itemName || t.jewellery}
                      {bill.metal && (
                        <>
                          {" • "}
                          {String(bill.metal).toLowerCase() === "gold"
                            ? t.gold
                            : String(bill.metal).toLowerCase() === "silver"
                            ? t.silver
                            : bill.metal}
                        </>
                      )}
                    </span>
                    <strong>
                      ₹{Number(bill.grandTotal || 0).toLocaleString("en-IN")}
                    </strong>
                  </div>
                ))}
            </div>
          </section>
        </main>
      )}

      <footer className="dashboard-footer">
        <span>{t.trust}</span>
        <b>•</b>
        <span>{t.purity}</span>
        <b>•</b>
        <span>{t.beauty}</span>
        <small>
          © {new Date().getFullYear()} {shopName}
        </small>
      </footer>

      {showLogoutConfirm && (
        <div
          className="logout-confirm-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowLogoutConfirm(false);
            }
          }}
        >
          <section
            className="logout-confirm-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
            aria-describedby="logout-confirm-description"
          >
            <div className="logout-confirm-icon" aria-hidden="true">
              ↪
            </div>
            <h2 id="logout-confirm-title">
              {language === "en" ? "Confirm Logout" : "लॉग आउट की पुष्टि करें"}
            </h2>
            <p id="logout-confirm-description">
              {language === "en"
                ? "Are you sure you want to log out of your BillBox account?"
                : "क्या आप वाकई अपने BillBox अकाउंट से लॉग आउट करना चाहते हैं?"}
            </p>
            <div className="logout-confirm-actions">
              <button
                type="button"
                className="logout-confirm-cancel"
                onClick={() => setShowLogoutConfirm(false)}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                className="logout-confirm-submit"
                onClick={confirmLogout}
              >
                {language === "en" ? "Yes, Log out" : "हाँ, लॉग आउट करें"}
              </button>
            </div>
          </section>
        </div>
      )}

      {showSettings && (
        <div
          className="shop-settings-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowSettings(false);
            }
          }}
        >
          <section
            className="shop-settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shop-settings-title"
          >
            <div className="shop-settings-heading">
              <div>
                <span className="shop-settings-eyebrow">BILLBOX</span>
                <h2 id="shop-settings-title">{t.settings}</h2>
              </div>

              <button
                type="button"
                className="shop-settings-close"
                onClick={() => setShowSettings(false)}
                aria-label="Close settings"
              >
                ×
              </button>
            </div>

            <form onSubmit={saveSettings}>
              <div className="shop-settings-logo-row">
                <div className="shop-settings-logo-preview">
                  {draft.logoUrl ? (
                    <img src={draft.logoUrl} alt={draft.shopName || t.shopName} />
                  ) : (
                    <span>
                      {(draft.shopName || "B").charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="shop-settings-logo-control">
                  <strong>{t.logo}</strong>
                  <label className="shop-settings-upload">
                    {logoUploading ? t.saving : t.chooseLogo}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={logoUploading}
                    />
                  </label>
                  <small>PNG, JPG, WEBP · Max 5 MB</small>
                </div>
              </div>

              <div className="shop-settings-grid">
                <label className="shop-settings-field">
                  <span>{t.shopName}</span>
                  <input
                    type="text"
                    value={draft.shopName}
                    maxLength={40}
                    onChange={(event) =>
                      updateDraft("shopName", event.target.value)
                    }
                  />
                </label>

                <label className="shop-settings-field">
                  <span>{t.ownerName}</span>
                  <input
                    type="text"
                    value={draft.ownerName}
                    onChange={(event) =>
                      updateDraft("ownerName", event.target.value)
                    }
                  />
                </label>

                <label className="shop-settings-field">
                  <span>{t.phone}</span>
                  <input
                    type="tel"
                    value={draft.phone}
                    onChange={(event) =>
                      updateDraft("phone", event.target.value)
                    }
                  />
                </label>

                <label className="shop-settings-field">
                  <span>{t.gst}</span>
                  <input
                    type="text"
                    value={draft.gstNumber}
                    maxLength={15}
                    autoComplete="off"
                    placeholder="22AAAAA0000A1Z5"
                    style={{
                      textTransform: "uppercase",
                      borderColor:
                        draft.gstNumber.trim() &&
                        !isValidGSTIN(draft.gstNumber)
                          ? "#ef4444"
                          : draft.gstNumber.trim()
                          ? "#22c55e"
                          : undefined,
                    }}
                    onChange={(event) =>
                      updateDraft(
                        "gstNumber",
                        event.target.value
                          .toUpperCase()
                          .replace(/[^A-Z0-9]/g, "")
                          .slice(0, 15)
                      )
                    }
                  />
                  {draft.gstNumber.trim() && (
                    <small
                      style={{
                        display: "block",
                        marginTop: "6px",
                        fontSize: "12px",
                        color: isValidGSTIN(draft.gstNumber)
                          ? "#22c55e"
                          : "#ef4444",
                      }}
                    >
                      {draft.gstNumber.length < 15
                        ? t.gstLength
                        : isValidGSTIN(draft.gstNumber)
                        ? t.gstValid
                        : t.gstInvalid}
                    </small>
                  )}
                </label>

                <label className="shop-settings-field shop-settings-field-full">
                  <span>{t.address}</span>
                  <textarea
                    rows={2}
                    value={draft.address}
                    onChange={(event) =>
                      updateDraft("address", event.target.value)
                    }
                  />
                </label>

                <label className="shop-settings-field">
                  <span>{t.language}</span>
                  <select
                    value={draft.language}
                    onChange={(event) =>
                      updateDraft("language", event.target.value)
                    }
                  >
                    <option value="hi">{t.hindi}</option>
                    <option value="en">{t.english}</option>
                  </select>
                </label>

                <label className="shop-settings-field">
                  <span>{t.theme}</span>
                  <select
                    value={draft.theme}
                    onChange={(event) =>
                      updateDraft("theme", event.target.value)
                    }
                  >
                    <option value="dark">{t.dark}</option>
                    <option value="light">{t.light}</option>
                  </select>
                </label>
              </div>

              {notice && (
                <p
                  className={`shop-settings-message ${
                    noticeError ? "is-error" : ""
                  }`}
                >
                  {notice}
                </p>
              )}

              <div className="shop-settings-actions">
                <button
                  type="button"
                  className="shop-settings-cancel"
                  onClick={() => setShowSettings(false)}
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="shop-settings-save"
                  disabled={saving || logoUploading || profileLoading}
                >
                  {saving ? t.saving : t.save}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {showSubscriptionExpired && (
        <div className="subscription-modal-overlay">
          <section className="subscription-expired-card">
            <div className="subscription-expired-icon">!</div>

            <h2>
              {language === "en"
                ? "Subscription Expired"
                : "सब्सक्रिप्शन समाप्त हो गया"}
            </h2>

            <p>
              {language === "en"
                ? "Your BillBox subscription has expired. Please contact our team and complete the renewal payment to continue creating new bills."
                : "आपके BillBox सब्सक्रिप्शन की अवधि समाप्त हो गई है। नए बिल बनाने के लिए कृपया हमारी टीम से संपर्क करें और रिन्यूअल पेमेंट पूरा करें।"}
            </p>

            {profile.subscriptionEndsAt && (
              <small>
                {language === "en" ? "Expired on: " : "समाप्ति की तारीख: "}
                {new Date(
                  profile.subscriptionEndsAt?.toDate
                    ? profile.subscriptionEndsAt.toDate()
                    : profile.subscriptionEndsAt
                ).toLocaleDateString(language === "hi" ? "hi-IN" : "en-IN")}
              </small>
            )}

            <a
              className="subscription-whatsapp-button"
              href={`https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(
                language === "en"
                  ? `Hello BillBox Team, my subscription has expired. Please help me renew it.\nShop: ${profile.shopName}\nOwner: ${profile.ownerName}`
                  : `नमस्ते BillBox Team, मेरा सब्सक्रिप्शन समाप्त हो गया है। कृपया इसे रिन्यू करने में मेरी मदद करें।\nदुकान: ${profile.shopName}\nमालिक: ${profile.ownerName}`
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp {language === "en" ? "Renew Subscription" : "रिन्यू करें"}
            </a>

            <button
              type="button"
              className="subscription-close-button"
              onClick={() => setShowSubscriptionExpired(false)}
            >
              {language === "en" ? "Close" : "बंद करें"}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

export default Dashboard;