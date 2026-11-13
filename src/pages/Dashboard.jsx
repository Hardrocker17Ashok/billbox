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




const DEFAULT_PROFILE = {
  shopName: "",
  ownerName: "",
  phone: "",
  address: "",
  gstNumber: "",
  logoUrl: "",
  language: "en",
  theme: "dark",
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
    jewellery: "आभूषण",
    jewelleryText: "अपने आभूषण देखें",
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
    jewellery: "Jewellery",
    jewelleryText: "View your jewellery",
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
  },
};

// Add your official WhatsApp number with country code, without + or spaces.
// Example: 919876543210. Keep empty until the official support number is confirmed.
const SUPPORT_WHATSAPP_NUMBER = "917597201594";

const HELP_FAQS = [
  {
    category: "GST & Billing",
    q: "GST details save nahi ho rahi hain, kya karein?",
    a: "Shop Profile & Settings open karein. GST number ko carefully enter karein aur shop details verify karke Save Settings par click karein. GSTIN mein extra spaces na hon. Agar phir bhi save nahi hota, error ka screenshot lekar Report a Problem se team ko bhejein.",
    qEn: "GST details are not saving. What should I do?",
    aEn: "Open Shop Profile & Settings, carefully enter your GST number, verify the shop details and click Save Settings. Remove any extra spaces from the GSTIN. If it still fails, send an error screenshot using Report a Problem.",
  },
  {
    category: "GST & Billing",
    q: "Pakka bill generate karne se pehle GST kaise save karein?",
    a: "Pehle Profile menu → Shop Profile & Settings mein jaakar GST Number fill karein aur Save Settings par click karein. Save hone ke baad settings dobara open karke GSTIN verify karein. Phir New Bill par jaakar bill banayein. GST applicability aur tax rate apne transaction ke hisaab se verify karein.",
    qEn: "How do I save GST details before generating a tax invoice?",
    aEn: "Go to Profile → Shop Profile & Settings, enter the GST number and click Save Settings. Reopen the settings to verify the GSTIN, then create the bill from New Bill. Confirm tax applicability and rates for the transaction before issuing the invoice.",
  },
  {
    category: "GST & Billing",
    q: "Kya GST ke bina bill bana sakte hain?",
    a: "BillBox mein GST details optional profile field ho sakti hain, lekin iska matlab yeh nahi ki har transaction GST-free hai. Agar aapki sale par GST applicable hai, toh invoice aur tax compliance ke liye applicable rules follow karein.",
    qEn: "Can I create a bill without GST details?",
    aEn: "GST may be optional as a shop-profile field in BillBox, but that does not mean every transaction is GST-free. If GST applies to your sale, follow the applicable invoicing and tax requirements.",
  },
  {
    category: "GST & Billing",
    q: "Bill mein GST amount galat aa raha hai?",
    a: "Bill save/issue karne se pehle item price, taxable value, GST rate aur making charges check karein. Agar values sahi hone ke baad bhi calculation galat hai, bill number aur screenshot ke saath support ko report karein.",
    qEn: "The GST amount on my bill looks incorrect.",
    aEn: "Before saving or issuing the bill, check the item price, taxable value, GST rate and making charges. If the calculation still looks wrong, report it with the bill number and a screenshot.",
  },
  {
    category: "Bills & Printing",
    q: "Bill print nahi ho raha hai, kya karein?",
    a: "Printer connection, power, paper aur selected printer check karein. Browser print window mein correct printer aur paper size select karein. Zarurat ho toh bill ko PDF mein save karke print karein.",
    qEn: "My bill is not printing. What should I do?",
    aEn: "Check the printer connection, power, paper and selected printer. In the browser print window, select the correct printer and paper size. If needed, save the bill as a PDF and print it.",
  },
  {
    category: "Bills & Printing",
    q: "Purana bill kaise dekhein?",
    a: "Dashboard se Bill History page open karein. Wahan available search/filter options ka use karke bill number, customer ya date ke through bill dhoondhein.",
    qEn: "How can I find an old bill?",
    aEn: "Open Bill History from the dashboard. Use the available search or filters to find a bill by bill number, customer or date.",
  },
  {
    category: "Bills & Printing",
    q: "Galat bill ban gaya hai. Kya use delete kar doon?",
    a: "Agar bill customer ko issue ho chuka hai, toh bina records aur tax impact check kiye use delete ya edit na karein. Correction/cancellation ke liye apne applicable accounting process ko follow karein aur zarurat par BillBox support se guidance lein.",
    qEn: "I created an incorrect bill. Should I delete it?",
    aEn: "If the bill has already been issued to a customer, do not delete or edit it without checking the records and tax impact. Follow your applicable correction or cancellation process and contact BillBox support if you need product guidance.",
  },
  {
    category: "Bills & Printing",
    q: "A4 paper par bill kaise print karein?",
    a: "Bill preview se Print option select karein. Print dialog mein paper size A4 set karein, preview check karein aur phir print karein.",
    qEn: "How do I print a bill on A4 paper?",
    aEn: "Choose Print from the bill preview. Set the paper size to A4 in the print dialog, check the preview and then print.",
  },
  {
    category: "Shop Profile & Settings",
    q: "Shop ka logo kaise change karein?",
    a: "Profile menu → Shop Profile & Settings open karein. Choose Logo se image upload karein. Image 5 MB se chhoti honi chahiye. Upload complete hone ke baad logo save ho jayega.",
    qEn: "How do I change my shop logo?",
    aEn: "Open Profile → Shop Profile & Settings and upload an image using Choose Logo. The image must be smaller than 5 MB. The logo is saved after the upload completes.",
  },
  {
    category: "Shop Profile & Settings",
    q: "Shop ka address, phone ya owner name kaise update karein?",
    a: "Profile menu se Shop Profile & Settings open karein. Required details update karke Save Settings par click karein.",
    qEn: "How do I update my shop address, phone or owner name?",
    aEn: "Open Shop Profile & Settings from the profile menu, update the required details and click Save Settings.",
  },
  {
    category: "Shop Profile & Settings",
    q: "Hindi/English ya Dark/Light mode kaise change karein?",
    a: "Profile menu → Shop Profile & Settings mein Language aur Theme select karein. Save Settings par click karein. Aapki preference save ho jayegi.",
    qEn: "How do I change language or dark/light mode?",
    aEn: "Open Profile → Shop Profile & Settings, choose your Language and Theme, then click Save Settings. Your preferences will be saved.",
  },
  {
    category: "Account & Support",
    q: "Login nahi ho raha hai, kya karein?",
    a: "Username/email aur password check karein, internet connection verify karein aur page reload karke dobara try karein. Problem continue ho toh Report a Problem se support ko contact karein. Password kisi ke saath share na karein.",
    qEn: "I cannot log in. What should I do?",
    aEn: "Check your username/email and password, verify your internet connection and reload the page before trying again. If the issue continues, contact support using Report a Problem. Never share your password.",
  },
  {
    category: "Account & Support",
    q: "Registration ke baad account activate nahi hua?",
    a: "Agar account pending/inactive status mein hai, toh BillBox team ki activation process complete hone ka wait karein. Status check karwane ke liye registered shop name aur phone number ke saath support ko message karein.",
    qEn: "My account has not been activated after registration.",
    aEn: "If your account is pending or inactive, wait for the BillBox team's activation process. Message support with your registered shop name and phone number to check the status.",
  },
  {
    category: "Account & Support",
    q: "Technical problem report kaise karein?",
    a: "Help & Support page par Report a Problem open karein, category select karein aur problem detail mein likhein. Send on WhatsApp par click karein. WhatsApp khulne ke baad screenshot attach karke message send karein.",
    qEn: "How do I report a technical problem?",
    aEn: "Open Report a Problem on this Help & Support page, select a category and describe the issue. Click Send on WhatsApp. Once WhatsApp opens, attach a screenshot and send the message.",
  },
];

function Dashboard() {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const [showMenu, setShowMenu] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [helpSearch, setHelpSearch] = useState("");
  const [helpCategory, setHelpCategory] = useState("All");
  const [expandedFaq, setExpandedFaq] = useState(0);
  const [showProblemForm, setShowProblemForm] = useState(false);
  const [problemCategory, setProblemCategory] = useState("Billing issue");
  const [problemDescription, setProblemDescription] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const profileWrapperRef = useRef(null);
  const [showSettings, setShowSettings] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeError, setNoticeError] = useState(false);

  // Close the profile dropdown when the user clicks anywhere outside it.
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

  // Show dashboard notifications briefly, then dismiss them automatically.
  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => {
      setNotice("");
      setNoticeError(false);
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [notice]);

  const [profile, setProfile] = useState({
    ...DEFAULT_PROFILE,
  });

  const [draft, setDraft] = useState({
    ...DEFAULT_PROFILE,
  });

  const language = profile.language === "en" ? "en" : "hi";
  const t = TEXT[language];

  const [recentBills, setRecentBills] = useState([]);
  const [recentBillsLoading, setRecentBillsLoading] = useState(true);
  const [todayBillsCount, setTodayBillsCount] = useState(0);
  const [todaySales, setTodaySales] = useState(0);
  const [monthlySales, setMonthlySales] = useState(0);

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
        {
          maximumFractionDigits: 2,
        }
      ),
    [language]
  );

  const formatMonthlySales = (amount) => {
    const value = Number(amount || 0);

    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(2)} Cr`;
    }

    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(2)} L`;
    }

    if (value >= 1000) {
      return `₹${(value / 1000).toFixed(1)} K`;
    }

    return `₹${money(value)}`;
  };

  // Load this signed-in user's shop settings.
  // Load shop settings and preload the shop logo before hiding PageLoader.
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

        // Safety timeout: never keep the dashboard loader forever.
        const timeout = window.setTimeout(finish, 10000);

        image.onload = finish;
        image.onerror = finish;
        image.src = logoUrl;

        // Handle an already cached image.
        if (image.complete) {
          finish();
        }
      });
    };

    const loadProfile = async () => {
      try {
        const shopRef = doc(db, "shops", user.uid);
        const snapshot = await getDoc(shopRef);

        if (!active) return;

        if (!snapshot.exists()) {
          console.error(
            "Shop document not found:",
            `shops/${user.uid}`
          );

          setNotice(
            "Shop profile not found. Please contact BillBox support."
          );
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

        // IMPORTANT: Wait for Firebase Storage logo image to load.
        await preloadShopLogo(merged.logoUrl);

        if (!active) return;

        // Only show dashboard after logo loading has completed.
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
        if (active) {
          setProfileLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [user]);

  // Apply theme to the complete dashboard page.
  useEffect(() => {
    document.documentElement.dataset.theme =
      profile.theme === "light" ? "light" : "dark";

    document.body.dataset.theme =
      profile.theme === "light" ? "light" : "dark";
  }, [profile.theme]);

  const updateDraft = (field, value) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const openSettings = () => {
    setDraft({ ...profile });
    setNotice("");
    setShowMenu(false);
    setShowSettings(true);
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

      // Update the existing shop document only.
      await updateDoc(
        doc(db, "shops", user.uid),
        payload
      );

      setProfile((current) => ({
        ...current,
        ...payload,
      }));

      setDraft((current) => ({
        ...current,
        ...payload,
      }));

      // Persist preferences locally and notify App.jsx.
      localStorage.setItem("billbox-theme", payload.theme);
      localStorage.setItem("billbox-language", payload.language);

      window.dispatchEvent(
        new CustomEvent("billbox-preferences-change", {
          detail: {
            theme: payload.theme,
            language: payload.language,
          },
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
      setNotice(
        `${TEXT[language].saveError} (${error.code || error.message})`
      );
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

    // Keep the previous logo URL before uploading the new one.
    const oldLogoUrl = draft.logoUrl || profile.logoUrl || "";

    setLogoUploading(true);
    setNotice("");
    setNoticeError(false);

    try {
      const safeName = file.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );

      const path =
        `shop-logos/${user.uid}/${Date.now()}-${safeName}`;

      const fileRef = storageRef(storage, path);

      // 1. Upload new logo
      await uploadBytes(fileRef, file, {
        contentType: file.type,
      });

      // 2. Get new logo URL
      const newLogoUrl = await getDownloadURL(fileRef);

      // 3. Save new URL in Firestore first
      // 3. Save new URL in the shop document
      await updateDoc(
        doc(db, "shops", user.uid),
        {
          logoUrl: newLogoUrl,
        }
      );

      // 4. Update React states
      setDraft((current) => ({
        ...current,
        logoUrl: newLogoUrl,
      }));

      setProfile((current) => ({
        ...current,
        logoUrl: newLogoUrl,
      }));

      // 5. Delete previous logo only after successful Firestore save
      if (oldLogoUrl && oldLogoUrl !== newLogoUrl) {
        try {
          const oldFileRef = storageRef(storage, oldLogoUrl);

          // Delete only files belonging to this shop's logo folder.
          const allowedPath = `shop-logos/${user.uid}/`;

          if (oldFileRef.fullPath.startsWith(allowedPath)) {
            await deleteObject(oldFileRef);
            console.log("Previous logo deleted successfully.");
          }
        } catch (deleteError) {
          // New logo is already saved. Do not undo the successful upload.
          console.warn(
            "Previous logo could not be deleted:",
            deleteError
          );
        }
      }

      setNotice("Logo uploaded and saved successfully!");
      setNoticeError(false);

    } catch (error) {
      console.error("Logo upload/save error:", error);

      setNoticeError(true);
      setNotice(
        error.code
          ? `${t.logoError} (${error.code})`
          : t.logoError
      );

    } finally {
      setLogoUploading(false);
    }
  };  // Fetch gold and silver market rates.
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
        goldData.generated_at ||
        silverData.generated_at ||
        null
      );

      const goldRates = {
        gold24: null,
        gold22: null,
        gold18: null,
      };

      goldData.observations?.forEach((item) => {
        if (item.instrument_id === "XAU.24K.INR.G") {
          goldRates.gold24 = item.value;
        }

        if (item.instrument_id === "XAU.22K.INR.G") {
          goldRates.gold22 = item.value;
        }

        if (item.instrument_id === "XAU.18K.INR.G") {
          goldRates.gold18 = item.value;
        }
      });

      const silverRate = silverData.observations?.find(
        (item) => item.instrument_id === "XAG.INR.KG"
      );

      setMetalRates({
        ...goldRates,
        silver999: silverRate?.value ?? null,
      });
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
      if (!cancelled) {
        await fetchMetalRates();
      }
    };

    loadRates();

    return () => {
      cancelled = true;
    };
  }, [fetchMetalRates]);

  // Load bill totals and the latest three bills created today.
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

            return Number.isNaN(date.getTime())
              ? null
              : date;
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
          .sort(
            (a, b) =>
              getBillDate(b) - getBillDate(a)
          );

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
            total + Number(bill.grandTotal || 0),
          0
        );

        const monthTotal = monthBills.reduce(
          (total, bill) =>
            total + Number(bill.grandTotal || 0),
          0
        );

        if (!active) return;

        setTodayBillsCount(todayBills.length);
        setTodaySales(todayTotal);
        setMonthlySales(monthTotal);
        setRecentBills(todayBills.slice(0, 3));
      } catch (error) {
        console.error("Dashboard Firebase Error:", error);

        if (!active) return;

        setRecentBills([]);
        setTodayBillsCount(0);
        setTodaySales(0);
        setMonthlySales(0);
      } finally {
        if (active) {
          setRecentBillsLoading(false);
        }
      }
    };

    fetchDashboardData();

    return () => {
      active = false;
    };
  }, [user]);

  const openHelpCentre = () => {
    setShowMenu(false);
    setShowSettings(false);
    setShowHelp(true);
    setHelpSearch("");
    setHelpCategory("All");
    setExpandedFaq(0);
    setShowProblemForm(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openWhatsAppSupport = (message) => {
    if (!SUPPORT_WHATSAPP_NUMBER) {
      window.alert("Please add the official BillBox WhatsApp support number in Dashboard.jsx (SUPPORT_WHATSAPP_NUMBER) before using this option.");
      return;
    }

    const url = `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const startGeneralSupport = () => {
    const message = `Hello BillBox Support Team,\n\nI need help with my BillBox account.\nShop: ${shopName}\nOwner: ${ownerName}\nRegistered phone: ${profile.phone || "Not added"}\n\nPlease assist me.\nThank you.`;
    openWhatsAppSupport(message);
  };

  const submitProblemReport = (event) => {
    event.preventDefault();
    if (!problemDescription.trim()) return;

    const message = `Hello BillBox Support Team,\n\nI want to report a problem.\n\nShop: ${shopName}\nOwner: ${ownerName}\nRegistered phone: ${profile.phone || "Not added"}\nCategory: ${problemCategory}\nProblem details: ${problemDescription.trim()}\n\nI will attach a screenshot if required. Please help me resolve this issue.\nThank you.`;
    openWhatsAppSupport(message);
  };

  const helpCategories = [
    { value: "All", label: language === "en" ? "All topics" : "सभी विषय" },
    { value: "GST & Billing", label: language === "en" ? "GST & Billing" : "GST और बिलिंग" },
    { value: "Bills & Printing", label: language === "en" ? "Bills & Printing" : "बिल और प्रिंटिंग" },
    { value: "Shop Profile & Settings", label: language === "en" ? "Shop Profile" : "शॉप प्रोफाइल" },
    { value: "Account & Support", label: language === "en" ? "Account & Support" : "अकाउंट और सपोर्ट" },
  ];

  const filteredHelpFaqs = HELP_FAQS.filter((faq) => {
    const question = language === "en" ? faq.qEn : faq.q;
    const answer = language === "en" ? faq.aEn : faq.a;
    const matchesCategory = helpCategory === "All" || faq.category === helpCategory;
    const search = helpSearch.trim().toLowerCase();
    const matchesSearch = !search ||
      `${question} ${answer} ${faq.category}`.toLowerCase().includes(search);
    return matchesCategory && matchesSearch;
  });

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

  const shopName =
    profile.shopName || "BillBox";

  const ownerName =
    profile.ownerName || t.admin;

  const avatarLetter = (
    profile.ownerName || shopName || "B"
  )
    .trim()
    .charAt(0)
    .toUpperCase();

  // Show one full-screen loader until all initial data is ready.
  if (
    profileLoading ||
    recentBillsLoading ||
    ratesLoading
  ) {
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
      className={`dashboard ${profile.theme === "light"
        ? "dashboard-light"
        : ""
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

          <span className="brand-owner-name">
            {shopName}
          </span>
        </div>

        <div className="topbar-right">


          <div className="profile-wrapper" ref={profileWrapperRef}>
            <button
              type="button"
              className="admin-avatar"
              onClick={() =>
                setShowMenu((current) => !current)
              }
              aria-label={t.profile}
              aria-expanded={showMenu}
            >
              <span className="admin-avatar-letter">{avatarLetter}</span>
              <span className="admin-avatar-chevron" aria-hidden="true">⌄</span>
            </button>

            {showMenu && (
              <div className="profile-menu">
                <div className="profile-menu-header">
                  <div className="profile-menu-avatar">
                    {avatarLetter}
                  </div>

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
                  className="profile-action-button profile-help-button"
                  onClick={openHelpCentre}
                >
                  <span aria-hidden="true">?</span>
                  <span>{language === "en" ? "Help & Support" : "हेल्प और सपोर्ट"}</span>
                </button>

                <button
                  type="button"
                  className="logout-button"
                  onClick={handleLogout}
                >
                  <span
                    className="logout-icon"
                    aria-hidden="true"
                  >
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

          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      )}

      {showHelp ? (
        <main className="dashboard-content help-page-content">
          <section className="help-hero">
            <button type="button" className="help-back-button" onClick={() => setShowHelp(false)}>
              <span aria-hidden="true">←</span>
              {language === "en" ? "Back to Dashboard" : "डैशबोर्ड पर वापस जाएँ"}
            </button>
            <div className="help-hero-copy">
              <span className="help-eyebrow">BILLBOX CUSTOMER CARE</span>
              <h1>{language === "en" ? "How can we help you?" : "हम आपकी कैसे मदद कर सकते हैं?"}</h1>
              <p>{language === "en" ? "Find quick answers or connect with our support team." : "अपने सवालों के जवाब पाएँ या हमारी सपोर्ट टीम से जुड़ें।"}</p>
            </div>
            <label className="help-search-box">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                value={helpSearch}
                onChange={(event) => setHelpSearch(event.target.value)}
                placeholder={language === "en" ? "Search questions, e.g. GST, printing..." : "सवाल खोजें, जैसे GST, प्रिंटिंग..."}
              />
            </label>
          </section>

          <section className="help-contact-grid">
            <article className="help-contact-card help-whatsapp-card">
              <div className="help-contact-icon">◉</div>
              <div>
                <span className="help-card-kicker">{language === "en" ? "TALK TO OUR TEAM" : "हमारी टीम से बात करें"}</span>
                <h2>{language === "en" ? "WhatsApp Support" : "WhatsApp सपोर्ट"}</h2>
                <p>{language === "en" ? "Get assistance for your account, billing and setup." : "अकाउंट, बिलिंग और सेटअप के लिए सहायता पाएँ।"}</p>
              </div>
              <button type="button" onClick={startGeneralSupport}>
                {language === "en" ? "Chat on WhatsApp" : "WhatsApp पर चैट करें"} <span>↗</span>
              </button>
            </article>

            <article className="help-contact-card">
              <div className="help-contact-icon help-problem-icon">!</div>
              <div>
                <span className="help-card-kicker">{language === "en" ? "NEED TECHNICAL HELP?" : "तकनीकी सहायता चाहिए?"}</span>
                <h2>{language === "en" ? "Report a Problem" : "समस्या की रिपोर्ट करें"}</h2>
                <p>{language === "en" ? "Describe the issue and send it directly to our team." : "अपनी समस्या लिखें और सीधे हमारी टीम को भेजें।"}</p>
              </div>
              <button type="button" className="help-secondary-button" onClick={() => setShowProblemForm((value) => !value)}>
                {showProblemForm ? (language === "en" ? "Close form" : "फॉर्म बंद करें") : (language === "en" ? "Report an issue" : "समस्या भेजें")} <span>→</span>
              </button>
            </article>
          </section>

          {showProblemForm && (
            <section className="help-problem-panel">
              <div className="help-section-heading">
                <span className="help-eyebrow">SUPPORT REQUEST</span>
                <h2>{language === "en" ? "Tell us what went wrong" : "हमें बताएं कि क्या समस्या आई"}</h2>
                <p>{language === "en" ? "Your shop details will be added automatically. You can attach a screenshot after WhatsApp opens." : "आपकी शॉप की जानकारी अपने आप जुड़ जाएगी। WhatsApp खुलने के बाद screenshot भी attach कर सकते हैं।"}</p>
              </div>
              <form onSubmit={submitProblemReport} className="help-problem-form">
                <label>
                  <span>{language === "en" ? "Problem category" : "समस्या की श्रेणी"}</span>
                  <select value={problemCategory} onChange={(event) => setProblemCategory(event.target.value)}>
                    <option value="Billing issue">Billing issue / बिलिंग</option>
                    <option value="GST issue">GST issue / GST</option>
                    <option value="Printing issue">Printing issue / प्रिंटिंग</option>
                    <option value="Login or account">Login or account / लॉगिन</option>
                    <option value="Shop profile or settings">Shop profile / शॉप प्रोफाइल</option>
                    <option value="Other technical issue">Other technical issue / अन्य</option>
                  </select>
                </label>
                <label>
                  <span>{language === "en" ? "Describe your problem" : "अपनी समस्या विस्तार से लिखें"}</span>
                  <textarea rows="4" value={problemDescription} onChange={(event) => setProblemDescription(event.target.value)} placeholder={language === "en" ? "Tell us what happened and what you were trying to do..." : "बताएं कि क्या हुआ और आप क्या करने की कोशिश कर रहे थे..."} required />
                </label>
                <button type="submit" disabled={!problemDescription.trim()}>
                  {language === "en" ? "Send on WhatsApp" : "WhatsApp पर भेजें"} <span>↗</span>
                </button>
              </form>
            </section>
          )}

          <section className="help-faq-section">
            <div className="help-section-heading">
              <span className="help-eyebrow">KNOWLEDGE CENTRE</span>
              <h2>{language === "en" ? "Frequently Asked Questions" : "अक्सर पूछे जाने वाले सवाल"}</h2>
              <p>{language === "en" ? "Helpful answers to common BillBox questions." : "BillBox से जुड़े आम सवालों के आसान जवाब।"}</p>
            </div>

            <div className="help-category-list">
              {helpCategories.map((category) => (
                <button
                  type="button"
                  key={category.value}
                  className={helpCategory === category.value ? "active" : ""}
                  onClick={() => { setHelpCategory(category.value); setExpandedFaq(0); }}
                >
                  {category.label}
                </button>
              ))}
            </div>

            <div className="help-faq-list">
              {filteredHelpFaqs.length ? filteredHelpFaqs.map((faq) => {
                const originalIndex = HELP_FAQS.indexOf(faq);
                const isOpen = expandedFaq === originalIndex;
                return (
                  <article className={`help-faq-item ${isOpen ? "is-open" : ""}`} key={faq.qEn}>
                    <button type="button" className="help-faq-question" onClick={() => setExpandedFaq(isOpen ? -1 : originalIndex)} aria-expanded={isOpen}>
                      <span>{language === "en" ? faq.qEn : faq.q}</span>
                      <span className="help-faq-chevron">{isOpen ? "−" : "+"}</span>
                    </button>
                    {isOpen && (
                      <div className="help-faq-answer">
                        <p>{language === "en" ? faq.aEn : faq.a}</p>
                        <button type="button" onClick={startGeneralSupport}>
                          {language === "en" ? "Still need help? Contact support" : "फिर भी मदद चाहिए? सपोर्ट से संपर्क करें"} ↗
                        </button>
                      </div>
                    )}
                  </article>
                );
              }) : (
                <div className="help-no-results">
                  <strong>{language === "en" ? "No matching questions found" : "कोई मिलता-जुलता सवाल नहीं मिला"}</strong>
                  <p>{language === "en" ? "Try another keyword or contact our support team." : "दूसरा शब्द खोजें या हमारी सपोर्ट टीम से संपर्क करें।"}</p>
                  <button type="button" onClick={startGeneralSupport}>{language === "en" ? "Contact Support" : "सपोर्ट से संपर्क करें"}</button>
                </div>
              )}
            </div>
          </section>

          <section className="help-bottom-cta">
            <div>
              <span className="help-eyebrow">BILLBOX SUPPORT</span>
              <h2>{language === "en" ? "We're here when you need us." : "जब भी जरूरत हो, हम आपकी मदद के लिए हैं।"}</h2>
              <p>{language === "en" ? "Couldn't find your answer? Send our team a message." : "जवाब नहीं मिला? हमारी टीम को मैसेज भेजें।"}</p>
            </div>
            <button type="button" onClick={startGeneralSupport}>{language === "en" ? "Contact our team" : "हमारी टीम से संपर्क करें"} ↗</button>
          </section>
        </main>
      ) : (
        <main className="dashboard-content">
          <section className="welcome">
            <div>
              <span className="welcome-label">
                {shopName}
              </span>

              <h1>
                {t.welcome} <em>{ownerName}</em>
              </h1>

              <p>{t.welcomeText}</p>
            </div>
          </section>

          <section className="metal-rates-card">
            <div className="metal-rates-header">
              <div>
                <span className="metal-rates-label">
                  {t.market}
                </span>

                <h3>{t.goldSilver}</h3>

                {ratesUpdatedAt && (
                  <small className="rates-last-update">
                    {t.lastUpdated}{" "}
                    {new Date(
                      ratesUpdatedAt
                    ).toLocaleString(
                      language === "hi"
                        ? "hi-IN"
                        : "en-IN",
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

              <span className="metal-rates-live">
                ● {t.live}
              </span>
            </div>

            {ratesLoading ? (
              <div className="rates-loading">
                {t.loadingRates}
              </div>
            ) : ratesError ? (
              <div className="rates-error">
                {ratesError}
              </div>
            ) : (
              <div className="metal-rates-grid">
                <div className="metal-rate-item">
                  <span>{t.gold24}</span>

                  <strong>
                    ₹{" "}
                    {metalRates.gold24 != null
                      ? Number(
                        metalRates.gold24 * 10
                      ).toLocaleString("en-IN")
                      : "--"}
                  </strong>

                  <small>{t.per10g}</small>
                </div>

                <div className="metal-rate-item">
                  <span>{t.gold22}</span>

                  <strong>
                    ₹{" "}
                    {metalRates.gold22 != null
                      ? Number(
                        metalRates.gold22 * 10
                      ).toLocaleString("en-IN")
                      : "--"}
                  </strong>

                  <small>{t.per10g}</small>
                </div>

                <div className="metal-rate-item">
                  <span>{t.gold18}</span>

                  <strong>
                    ₹{" "}
                    {metalRates.gold18 != null
                      ? Number(
                        metalRates.gold18 * 10
                      ).toLocaleString("en-IN")
                      : "--"}
                  </strong>

                  <small>{t.per10g}</small>
                </div>

                <div className="metal-rate-item">
                  <span>{t.silver999}</span>

                  <strong>
                    ₹{" "}
                    {metalRates.silver999 != null
                      ? Number(
                        metalRates.silver999
                      ).toLocaleString("en-IN")
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
              onClick={() => navigate("/new-bill")}
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
              className="action-card"
              onClick={() => navigate("/jewellery")}
            >
              <div className="action-icon">◇</div>

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

              <div className="today-date">
                {t.today}
              </div>
            </div>

            <div className="summary-grid">
              <div className="summary-card">
                <span className="summary-title">
                  {t.todayBills}
                </span>

                <strong>{todayBillsCount}</strong>

                <p>{t.billsCreated}</p>
              </div>

              <div className="summary-card">
                <span className="summary-title">
                  {t.todaySales}
                </span>

                <strong>₹{money(todaySales)}</strong>

                <p>{t.totalTodaySales}</p>
              </div>

              <div className="summary-card">
                <span className="summary-title">
                  {t.thisMonth}
                </span>

                <strong>
                  {formatMonthlySales(monthlySales)}
                </strong>

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

              {!recentBillsLoading &&
                recentBills.length === 0 && (
                  <div className="table-row">
                    <span>{t.noBills}</span>
                  </div>
                )}

              {!recentBillsLoading &&
                recentBills.map((bill) => (
                  <div
                    className="table-row"
                    key={bill.id}
                  >
                    <span className="bill-no">
                      #
                      {bill.billNumber ||
                        bill.id.slice(0, 7)}
                    </span>

                    <span>
                      {bill.customerName || t.customer}
                    </span>

                    <span className="item-name">
                      {bill.itemName || t.jewellery}

                      {bill.metal && (
                        <>
                          {" • "}

                          {String(bill.metal).toLowerCase() ===
                            "gold"
                            ? t.gold
                            : String(
                              bill.metal
                            ).toLowerCase() === "silver"
                              ? t.silver
                              : bill.metal}
                        </>
                      )}
                    </span>

                    <strong>
                      ₹
                      {Number(
                        bill.grandTotal || 0
                      ).toLocaleString("en-IN")}
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
            <div className="logout-confirm-icon" aria-hidden="true">↪</div>
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
                <span className="shop-settings-eyebrow">
                  BILLBOX
                </span>

                <h2 id="shop-settings-title">
                  {t.settings}
                </h2>
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
                    <img
                      src={draft.logoUrl}
                      alt={draft.shopName || t.shopName}
                    />
                  ) : (
                    <span>
                      {(draft.shopName || "B")
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="shop-settings-logo-control">
                  <strong>{t.logo}</strong>

                  <label className="shop-settings-upload">
                    {logoUploading
                      ? t.saving
                      : t.chooseLogo}

                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={logoUploading}
                    />
                  </label>

                  <small>
                    PNG, JPG, WEBP · Max 5 MB
                  </small>
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
                      updateDraft(
                        "shopName",
                        event.target.value
                      )
                    }
                  />
                </label>

                <label className="shop-settings-field">
                  <span>{t.ownerName}</span>

                  <input
                    type="text"
                    value={draft.ownerName}
                    onChange={(event) =>
                      updateDraft(
                        "ownerName",
                        event.target.value
                      )
                    }
                  />
                </label>

                <label className="shop-settings-field">
                  <span>{t.phone}</span>

                  <input
                    type="tel"
                    value={draft.phone}
                    onChange={(event) =>
                      updateDraft(
                        "phone",
                        event.target.value
                      )
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
                      updateDraft(
                        "address",
                        event.target.value
                      )
                    }
                  />
                </label>

                <label className="shop-settings-field">
                  <span>{t.language}</span>

                  <select
                    value={draft.language}
                    onChange={(event) =>
                      updateDraft(
                        "language",
                        event.target.value
                      )
                    }
                  >
                    <option value="hi">
                      {t.hindi}
                    </option>

                    <option value="en">
                      {t.english}
                    </option>
                  </select>
                </label>

                <label className="shop-settings-field">
                  <span>{t.theme}</span>

                  <select
                    value={draft.theme}
                    onChange={(event) =>
                      updateDraft(
                        "theme",
                        event.target.value
                      )
                    }
                  >
                    <option value="dark">
                      {t.dark}
                    </option>

                    <option value="light">
                      {t.light}
                    </option>
                  </select>
                </label>
              </div>

              {notice && (
                <p
                  className={`shop-settings-message ${noticeError ? "is-error" : ""
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
                  disabled={
                    saving ||
                    logoUploading ||
                    profileLoading
                  }
                >
                  {saving ? t.saving : t.save}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default Dashboard;