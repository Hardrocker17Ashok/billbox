import "./Dashboard.css";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { signOut } from "firebase/auth";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
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
  },
};

function Dashboard() {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeError, setNoticeError] = useState(false);

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
  useEffect(() => {
    if (!user) return;

    let active = true;

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

    setSaving(true);
    setNotice("");
    setNoticeError(false);

    try {
      const payload = {
        shopName: draft.shopName.trim(),
        ownerName: draft.ownerName.trim(),
        phone: draft.phone.trim(),
        address: draft.address.trim(),
        gstNumber: draft.gstNumber.trim(),
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
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
              {shopName}
            </div>
          )}
        </div>

        <div className="topbar-right">
          <div className="admin-info">
            <strong>{ownerName}</strong>
            <span>{shopName}</span>
          </div>

          <div className="profile-wrapper">
            <button
              type="button"
              className="admin-avatar"
              onClick={() =>
                setShowMenu((current) => !current)
              }
              aria-label={t.profile}
              aria-expanded={showMenu}
            >
              {avatarLetter}
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

      {notice && (
        <div
          className={`dashboard-notice ${noticeError ? "is-error" : ""
            }`}
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
                    onChange={(event) =>
                      updateDraft(
                        "shopName",
                        event.target.value
                      )
                    }
                    required
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
                    onChange={(event) =>
                      updateDraft(
                        "gstNumber",
                        event.target.value
                      )
                    }
                  />
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