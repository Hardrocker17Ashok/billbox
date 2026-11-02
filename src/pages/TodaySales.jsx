
import "./TodaySales.css";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import { onAuthStateChanged } from "firebase/auth";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import PageLoader from "../components/PageLoader";

// =========================================================
// DEFAULT PROFILE
// =========================================================

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

// =========================================================
// LANGUAGE
// =========================================================

const TEXT = {
  hi: {
    pageTitle: "आज की बिक्री",
    dashboard: "डैशबोर्ड",

    dailyReport: "दैनिक बिक्री रिपोर्ट",
    heading: "आज की बिक्री",
    description: "की पूरी बिक्री का विवरण",

    refresh: "ताज़ा करें",
    refreshing: "लोड हो रहा है...",

    totalSales: "आज की कुल बिक्री",
    filtered: "फ़िल्टर के अनुसार",

    totalBills: "कुल बिल",
    createdToday: "आज बनाए गए बिल",

    customers: "ग्राहक",
    customersToday: "आज के ग्राहक",

    averageBill: "औसत बिल",
    averagePerBill: "प्रति बिल औसत",

    salesFilter: "बिक्री फ़िल्टर",
    searchBills: "बिल खोजें",
    clear: "साफ़ करें",

    customerItemBill: "ग्राहक / आइटम / बिल नंबर",
    searchPlaceholder: "नाम, आइटम या बिल नंबर खोजें",

    metal: "धातु",
    all: "सभी",
    gold: "सोना",
    silver: "चाँदी",

    minimumAmount: "न्यूनतम राशि",
    maximumAmount: "अधिकतम राशि",
    minimumPlaceholder: "₹ न्यूनतम",
    maximumPlaceholder: "₹ अधिकतम",

    todayRecords: "आज के रिकॉर्ड",
    salesBills: "बिक्री बिल",
    billCount: "बिल",

    billNumber: "बिल नंबर",
    customer: "ग्राहक",
    jewellery: "आभूषण",
    weight: "वजन",
    time: "समय",
    totalAmount: "कुल राशि",

    loading: "आज की बिक्री लोड हो रही है...",

    errorHeading: "कुछ समस्या हुई",
    loginRequired: "कृपया लॉगिन करें।",
    profileError: "शॉप प्रोफाइल लोड नहीं हो सकी।",
    billsError: "आज की बिक्री लोड नहीं हो सकी।",

    noSales: "आज कोई बिक्री नहीं है",
    noSalesDescription: "आज का कोई बिल अभी तक नहीं बनाया गया है।",
    noMatchingBills: "कोई बिल नहीं मिला",
    noMatchingDescription: "आपके चुने हुए फ़िल्टर के अनुसार कोई बिल उपलब्ध नहीं है।",

    gram: "ग्राम",
    more: "और",

    trust: "विश्वास",
    purity: "शुद्धता",
    beauty: "सुंदरता",

    noShopProfile: "शॉप प्रोफाइल उपलब्ध नहीं है।",
  },

  en: {
    pageTitle: "Today's Sales",
    dashboard: "Dashboard",

    dailyReport: "DAILY SALES REPORT",
    heading: "Today's Sales",
    description: "sales overview for",

    refresh: "Refresh",
    refreshing: "Refreshing...",

    totalSales: "Total sales today",
    filtered: "Based on filters",

    totalBills: "Total bills",
    createdToday: "Bills created today",

    customers: "Customers",
    customersToday: "Customers today",

    averageBill: "Average bill",
    averagePerBill: "Average per bill",

    salesFilter: "SALES FILTER",
    searchBills: "Search bills",
    clear: "Clear filters",

    customerItemBill: "Customer / Item / Bill number",
    searchPlaceholder: "Search name, item or bill number",

    metal: "Metal",
    all: "All",
    gold: "Gold",
    silver: "Silver",

    minimumAmount: "Minimum amount",
    maximumAmount: "Maximum amount",
    minimumPlaceholder: "₹ Minimum",
    maximumPlaceholder: "₹ Maximum",

    todayRecords: "TODAY'S RECORDS",
    salesBills: "Sales bills",
    billCount: "bills",

    billNumber: "Bill number",
    customer: "Customer",
    jewellery: "Jewellery",
    weight: "Weight",
    time: "Time",
    totalAmount: "Total amount",

    loading: "Loading today's sales...",

    errorHeading: "Something went wrong",
    loginRequired: "Please log in.",
    profileError: "Shop profile could not be loaded.",
    billsError: "Today's sales could not be loaded.",

    noSales: "No sales today",
    noSalesDescription: "No bills have been created today yet.",
    noMatchingBills: "No bills found",
    noMatchingDescription: "No bills match your selected filters.",

    gram: "grams",
    more: "more",

    trust: "TRUST",
    purity: "PURITY",
    beauty: "BEAUTY",

    noShopProfile: "Shop profile is unavailable.",
  },
};

// =========================================================
// DATE HELPERS
// =========================================================

const getDateObject = (timestamp) => {
  if (!timestamp) return null;

  try {
    if (typeof timestamp.toDate === "function") {
      return timestamp.toDate();
    }

    const date = new Date(timestamp);

    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

const getLocalDateKey = (date) => {
  if (!date) return "";

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

// =========================================================
// BILL ITEM HELPERS
// =========================================================

const getBillItems = (bill) => {
  if (Array.isArray(bill?.items) && bill.items.length > 0) {
    return bill.items;
  }

  if (!bill) return [];

  return [
    {
      itemName: bill.itemName || "",
      metal: bill.metal || "",
      carat: bill.carat || "",
      weight: bill.weight || 0,
      amount: bill.amount ?? bill.itemAmount ?? 0,
      quantity: bill.quantity || 1,
    },
  ];
};

// =========================================================
// MAIN COMPONENT
// =========================================================

function TodaySales() {
  const navigate = useNavigate();

  // -------------------------------------------------------
  // AUTH
  // -------------------------------------------------------

  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // -------------------------------------------------------
  // PROFILE
  // -------------------------------------------------------

  const [shopProfile, setShopProfile] = useState(DEFAULT_PROFILE);
  const [profileLoading, setProfileLoading] = useState(true);

  // -------------------------------------------------------
  // SALES
  // -------------------------------------------------------

  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // -------------------------------------------------------
  // FILTERS
  // -------------------------------------------------------

  const [search, setSearch] = useState("");
  const [metal, setMetal] = useState("all");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  // -------------------------------------------------------
  // PREFERENCES
  // -------------------------------------------------------

  const language =
    shopProfile.language === "en" ? "en" : "hi";

  const theme =
    shopProfile.theme === "light" ? "light" : "dark";

  const t = TEXT[language];

  // -------------------------------------------------------
  // AUTH LISTENER
  // -------------------------------------------------------

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  // -------------------------------------------------------
  // FETCH PROFILE AND TODAY'S SALES
  // -------------------------------------------------------

  const fetchTodaySales = useCallback(async (currentUser) => {
    if (!currentUser) {
      setBills([]);
      setError(TEXT.en.loginRequired);
      setLoading(false);
      setProfileLoading(false);
      return;
    }

    setLoading(true);
    setProfileLoading(true);
    setError("");

    try {
      // 1. Fetch shop profile.
      const profileRef = doc(db, "shops", currentUser.uid);
      const profileSnapshot = await getDoc(profileRef);

      if (!profileSnapshot.exists()) {
        setShopProfile(DEFAULT_PROFILE);
        setError(TEXT.en.noShopProfile);
        setBills([]);
        return;
      }

      const savedProfile = profileSnapshot.data();

      const profile = {
        ...DEFAULT_PROFILE,
        ...savedProfile,
        language: savedProfile.language === "hi" ? "hi" : "en",
        theme: savedProfile.theme === "light" ? "light" : "dark",
      };

      setShopProfile(profile);

      // Sync global preferences.
      document.documentElement.dataset.theme = profile.theme;
      document.documentElement.dataset.language = profile.language;
      document.body.dataset.theme = profile.theme;

      localStorage.setItem("billbox-theme", profile.theme);
      localStorage.setItem("billbox-language", profile.language);

      setProfileLoading(false);

      // 2. Fetch only this shop's bills.
      const billsQuery = query(
        collection(db, "bills"),
        where("ownerId", "==", currentUser.uid)
      );

      const snapshot = await getDocs(billsQuery);

      // 3. Filter today's records using local date.
      const todayKey = getLocalDateKey(new Date());

      const todayBills = snapshot.docs
        .map((item) => ({
          id: item.id,
          ...item.data(),
        }))
        .filter((bill) => {
          const billDate = getDateObject(bill.createdAt);

          if (!billDate) return false;

          return getLocalDateKey(billDate) === todayKey;
        })
        .sort((a, b) => {
          const dateA = getDateObject(a.createdAt);
          const dateB = getDateObject(b.createdAt);

          return (dateB?.getTime() || 0) -
            (dateA?.getTime() || 0);
        });

      setBills(todayBills);
    } catch (err) {
      console.error("Today's Sales Error:", err);

      setError(TEXT.en.billsError);
      setBills([]);
    } finally {
      setLoading(false);
      setProfileLoading(false);
    }
  }, []);

  // -------------------------------------------------------
  // INITIAL DATA LOAD / AUTH CHANGE
  // -------------------------------------------------------

  useEffect(() => {
    if (!authReady) return;

    let active = true;

    const loadData = async () => {
      if (!user) {
        setShopProfile(DEFAULT_PROFILE);
        setBills([]);
        setError(TEXT.en.loginRequired);
        setLoading(false);
        setProfileLoading(false);
        return;
      }

      setLoading(true);
      setProfileLoading(true);

      await fetchTodaySales(user);

      if (!active) return;
    };

    loadData();

    return () => {
      active = false;
    };
  }, [authReady, user, fetchTodaySales]);

  // -------------------------------------------------------
  // DASHBOARD PREFERENCE SYNC
  // -------------------------------------------------------

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

  // -------------------------------------------------------
  // REFRESH
  // -------------------------------------------------------

  const handleRefresh = async () => {
    if (!user) return;

    await fetchTodaySales(user);
  };

  // -------------------------------------------------------
  // FORMATTERS
  // -------------------------------------------------------

  const formatMoney = (value) => {
    return Number(value || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    });
  };

  const formatNumber = (value) => {
    return Number(value || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 3,
    });
  };

  const formatTime = (timestamp) => {
    const date = getDateObject(timestamp);

    if (!date) return "-";

    return date.toLocaleTimeString(
      language === "en" ? "en-IN" : "hi-IN",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  const formatWeight = (bill) => {
    const items = getBillItems(bill);

    const totalWeight = items.reduce(
      (sum, item) => sum + Number(item.weight || 0),
      0
    );

    if (!totalWeight) return "-";

    return `${formatNumber(totalWeight)} ${t.gram}`;
  };

  const formatDate = (date) => {
    return date.toLocaleDateString(
      language === "en" ? "en-IN" : "hi-IN",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );
  };

  // -------------------------------------------------------
  // CLEAR FILTERS
  // -------------------------------------------------------

  const clearFilters = () => {
    setSearch("");
    setMetal("all");
    setMinAmount("");
    setMaxAmount("");
  };

  // -------------------------------------------------------
  // FILTERED BILLS
  // -------------------------------------------------------

  const filteredBills = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    const min =
      minAmount === "" ? null : Number(minAmount);

    const max =
      maxAmount === "" ? null : Number(maxAmount);

    return bills.filter((bill) => {
      const items = getBillItems(bill);

      const customerName = String(
        bill.customerName || ""
      ).toLowerCase();

      const billNumber = String(
        bill.billNumber || ""
      ).toLowerCase();

      const itemNames = items
        .map((item) => item.itemName || "")
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !searchText ||
        customerName.includes(searchText) ||
        itemNames.includes(searchText) ||
        billNumber.includes(searchText);

      const matchesMetal =
        metal === "all" ||
        items.some(
          (item) =>
            String(item.metal || "").toLowerCase() === metal
        );

      const amount = Number(bill.grandTotal || 0);

      const matchesMin =
        min === null ||
        (!Number.isNaN(min) && amount >= min);

      const matchesMax =
        max === null ||
        (!Number.isNaN(max) && amount <= max);

      return (
        matchesSearch &&
        matchesMetal &&
        matchesMin &&
        matchesMax
      );
    });
  }, [bills, search, metal, minAmount, maxAmount]);

  // -------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------

  const totalSales = filteredBills.reduce(
    (sum, bill) => sum + Number(bill.grandTotal || 0),
    0
  );

  const averageBill =
    filteredBills.length > 0
      ? totalSales / filteredBills.length
      : 0;

  const uniqueCustomers = new Set(
    filteredBills
      .map((bill) => bill.customerMobile || bill.customerName)
      .filter(Boolean)
  ).size;

  // -------------------------------------------------------
  // TODAY LABEL
  // -------------------------------------------------------

  const todayLabel = formatDate(new Date());

  // -------------------------------------------------------
  // PAGE LOADER
  // -------------------------------------------------------

  if (!authReady || profileLoading || loading) {
    return (
      <PageLoader
        loading={true}
        message={
          language === "en"
            ? "Preparing today's sales..."
            : "आज की बिक्री तैयार हो रही है..."
        }
        fullScreen={true}
      />
    );
  }

  // -------------------------------------------------------
  // PAGE UI
  // -------------------------------------------------------

  return (
    <main
      className={`today-sales-page ${theme === "light" ? "today-sales-light" : ""}`}
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
            />
          ) : (
            <div className="sales-brand-fallback">
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
          className="sales-back"
          onClick={() => navigate("/dashboard")}
        >
          ← {t.dashboard}
        </button>
      </header>

      {/* MAIN */}

      <section className="sales-content">

        {/* TITLE */}

        <div className="sales-title">
          <div>
            <span>{t.dailyReport}</span>

            <h1>{t.heading}</h1>

            <p>
              {todayLabel} {t.description}
            </p>
          </div>

          <button
            type="button"
            className="sales-refresh"
            onClick={handleRefresh}
            disabled={loading}
          >
            ↻ &nbsp; {loading ? t.refreshing : t.refresh}
          </button>
        </div>

        {/* ERROR */}

        {error && (
          <div className="sales-empty sales-error">
            <strong>{t.errorHeading}</strong>
            <p>{error}</p>
          </div>
        )}

        {!error && (
          <>
            {/* SUMMARY */}

            <div className="sales-stats">
              <div className="sales-stat primary">
                <span>{t.totalSales}</span>

                <strong>
                  ₹{formatMoney(totalSales)}
                </strong>

                <small>{t.filtered}</small>
              </div>

              <div className="sales-stat">
                <span>{t.totalBills}</span>

                <strong>{filteredBills.length}</strong>

                <small>{t.createdToday}</small>
              </div>

              <div className="sales-stat">
                <span>{t.customers}</span>

                <strong>{uniqueCustomers}</strong>

                <small>{t.customersToday}</small>
              </div>

              <div className="sales-stat">
                <span>{t.averageBill}</span>

                <strong>
                  ₹{formatMoney(averageBill)}
                </strong>

                <small>{t.averagePerBill}</small>
              </div>
            </div>

            {/* FILTER */}

            <section className="sales-filter">
              <div className="sales-filter-heading">
                <div>
                  <span>{t.salesFilter}</span>
                  <h2>{t.searchBills}</h2>
                </div>

                <button
                  type="button"
                  onClick={clearFilters}
                >
                  {t.clear}
                </button>
              </div>

              <div className="sales-filter-grid">
                <div className="sales-field large">
                  <label htmlFor="sales-search">
                    {t.customerItemBill}
                  </label>

                  <input
                    id="sales-search"
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t.searchPlaceholder}
                  />
                </div>

                <div className="sales-field">
                  <label htmlFor="sales-metal">
                    {t.metal}
                  </label>

                  <select
                    id="sales-metal"
                    value={metal}
                    onChange={(e) => setMetal(e.target.value)}
                  >
                    <option value="all">{t.all}</option>
                    <option value="gold">{t.gold}</option>
                    <option value="silver">{t.silver}</option>
                  </select>
                </div>

                <div className="sales-field">
                  <label htmlFor="sales-min">
                    {t.minimumAmount}
                  </label>

                  <input
                    id="sales-min"
                    type="number"
                    min="0"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    placeholder={t.minimumPlaceholder}
                  />
                </div>

                <div className="sales-field">
                  <label htmlFor="sales-max">
                    {t.maximumAmount}
                  </label>

                  <input
                    id="sales-max"
                    type="number"
                    min="0"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    placeholder={t.maximumPlaceholder}
                  />
                </div>
              </div>
            </section>

            {/* BILL LIST */}

            <section className="today-bills">
              <div className="today-bills-heading">
                <div>
                  <span>{t.todayRecords}</span>
                  <h2>{t.salesBills}</h2>
                </div>

                <strong>
                  {filteredBills.length} {t.billCount}
                </strong>
              </div>

              {filteredBills.length === 0 && (
                <div className="sales-empty">
                  <div className="sales-empty-icon">₹</div>

                  <strong>
                    {bills.length === 0 ? t.noSales : t.noMatchingBills}
                  </strong>

                  <p>
                    {bills.length === 0
                      ? t.noSalesDescription
                      : t.noMatchingDescription}
                  </p>
                </div>
              )}

              {filteredBills.length > 0 && (
                <div className="sales-bill-list">
                  {filteredBills.map((bill) => {
                    const items = getBillItems(bill);
                    const firstItem = items[0];

                    const metalTypes = [
                      ...new Set(
                        items.map((item) =>
                          String(item.metal || "").toLowerCase()
                        )
                      ),
                    ];

                    const metalLabel = metalTypes
                      .map((value) => {
                        if (value === "gold") return t.gold;
                        if (value === "silver") return t.silver;
                        return value;
                      })
                      .filter(Boolean)
                      .join(" / ");

                    return (
                      <article
                        className="sales-bill"
                        key={bill.id}
                      >
                        <div className="sales-bill-number">
                          <span>{t.billNumber}</span>

                          <strong>
                            #{bill.billNumber || bill.id.slice(0, 7)}
                          </strong>
                        </div>

                        <div>
                          <span>{t.customer}</span>

                          <strong>
                            {bill.customerName || "-"}
                          </strong>

                          {bill.customerMobile && (
                            <small>{bill.customerMobile}</small>
                          )}
                        </div>

                        <div>
                          <span>{t.jewellery}</span>

                          <strong>
                            {firstItem?.itemName || bill.itemName || "-"}
                          </strong>

                          <small>
                            {metalLabel || "-"}
                            {items.length > 1 &&
                              ` • +${items.length - 1} ${t.more}`}
                          </small>
                        </div>

                        <div>
                          <span>{t.weight}</span>

                          <strong>{formatWeight(bill)}</strong>
                        </div>

                        <div>
                          <span>{t.time}</span>

                          <strong>{formatTime(bill.createdAt)}</strong>
                        </div>

                        <div className="sales-bill-total">
                          <span>{t.totalAmount}</span>

                          <strong>
                            ₹{formatMoney(bill.grandTotal)}
                          </strong>
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

      {/* FOOTER */}

      <footer className="sales-footer">
        <span>{t.trust}</span>
        <b>•</b>
        <span>{t.purity}</span>
        <b>•</b>
        <span>{t.beauty}</span>

        <small>
          © {new Date().getFullYear()} {shopProfile.shopName || "BillBox"}
        </small>
      </footer>
    </main>
  );
}

export default TodaySales;
