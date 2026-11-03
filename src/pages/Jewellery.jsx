
import "./Jewellery.css";

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
} from "firebase/firestore";

import { auth, db } from "../firebase";
import PageLoader from "../components/PageLoader";

const DEFAULT_PROFILE = {
  shopName: "BillBox",
  logoUrl: "",
  language: "hi",
  theme: "dark",
};

const TEXT = {
  hi: {
    collection: "आभूषण संग्रह",
    totalJewellery: "कुल आभूषण",
    eyebrow: "JEWELLERY COLLECTION",
    headingStart: "हमारे",
    headingEnd: "आभूषण",
    description: "आपकी दुकान के सभी उपलब्ध आभूषणों का संग्रह देखें।",
    gold: "सोना",
    silver: "चाँदी",
    searchPlaceholder: "आभूषण खोजें...",
    all: "सभी",
    sectionEyebrow: "संग्रह",
    listHeading: "आभूषण सूची",
    itemCount: "आभूषण",
    loading: "आभूषण लोड हो रहे हैं...",
    emptyHeading: "कोई आभूषण नहीं मिला",
    emptyDescription: "खोज या फ़िल्टर बदलकर दोबारा प्रयास करें।",
    itemLabel: "आभूषण",
    goldItem: "सोने का आभूषण",
    silverItem: "चाँदी का आभूषण",
    available: "उपलब्ध",
    trust: "विश्वास",
    purity: "शुद्धता",
    beauty: "सुंदरता",
    fetchError: "आभूषण लोड नहीं हो पाए। कृपया दोबारा प्रयास करें।",
    loginError: "कृपया पहले लॉगिन करें।",
    preparing: "आपका आभूषण संग्रह तैयार हो रहा है...",
    retry: "दोबारा प्रयास करें",
    unknownItem: "आभूषण",
    unknownMetal: "अन्य",
    otherItem: "अन्य आभूषण",
    dashboard: "डैशबोर्ड",
  },

  en: {
    collection: "Jewellery Collection",
    totalJewellery: "Total Jewellery",
    eyebrow: "JEWELLERY COLLECTION",
    headingStart: "Our",
    headingEnd: "Jewellery",
    description: "Explore all available jewellery items in your shop.",
    gold: "Gold",
    silver: "Silver",
    searchPlaceholder: "Search jewellery...",
    all: "All",
    sectionEyebrow: "COLLECTION",
    listHeading: "Jewellery List",
    itemCount: "items",
    loading: "Loading jewellery...",
    emptyHeading: "No jewellery found",
    emptyDescription: "Try changing your search or filters.",
    itemLabel: "JEWELLERY",
    goldItem: "Gold Jewellery",
    silverItem: "Silver Jewellery",
    available: "Available",
    trust: "Trust",
    purity: "Purity",
    beauty: "Beauty",
    fetchError: "Unable to load jewellery. Please try again.",
    loginError: "Please login first.",
    preparing: "Preparing your jewellery collection...",
    retry: "Try Again",
    unknownItem: "Jewellery",
    unknownMetal: "Other",
    otherItem: "Other Jewellery",
    dashboard: "Dashboard",
  },
};

const normalizeLanguage = (value) =>
  value === "en" ? "en" : "hi";

const normalizeTheme = (value) =>
  value === "light" ? "light" : "dark";

const normalizeMetal = (value) =>
  String(value || "").trim().toLowerCase();

function Jewellery() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);

  const [shopProfile, setShopProfile] =
    useState(DEFAULT_PROFILE);

  const [jewellery, setJewellery] = useState([]);

  const [authReady, setAuthReady] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [metalFilter, setMetalFilter] = useState("all");

  const [refreshKey, setRefreshKey] = useState(0);

  const language = normalizeLanguage(shopProfile.language);
  const theme = normalizeTheme(shopProfile.theme);

  const t = TEXT[language];

  // ============================================
  // AUTH + SHOP PROFILE + JEWELLERY FETCH
  // ============================================

  useEffect(() => {
    let mounted = true;
    let requestId = 0;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        const currentRequest = ++requestId;

        const isCurrentRequest = () =>
          mounted && currentRequest === requestId;

        if (!isCurrentRequest()) return;

        setAuthReady(true);
        setUser(currentUser);
        setError("");
        setJewellery([]);
        setLoading(true);
        setProfileLoading(Boolean(currentUser));

        let profile = DEFAULT_PROFILE;

        try {
          // Load shop profile only when a user is logged in.
          if (currentUser) {
            const shopRef = doc(
              db,
              "shops",
              currentUser.uid
            );

            const shopSnapshot = await getDoc(shopRef);

            if (!isCurrentRequest()) return;

            if (shopSnapshot.exists()) {
              const shopData = shopSnapshot.data();

              profile = {
                ...DEFAULT_PROFILE,
                shopName:
                  shopData.shopName ||
                  DEFAULT_PROFILE.shopName,
                logoUrl: shopData.logoUrl || "",
                language: normalizeLanguage(
                  shopData.language
                ),
                theme: normalizeTheme(
                  shopData.theme
                ),
              };
            }
          }

          if (!isCurrentRequest()) return;

          setShopProfile(profile);
          setProfileLoading(false);

          // Public jewellery: fetch ALL documents.
          const snapshot = await getDocs(
            collection(db, "jewellery")
          );

          if (!isCurrentRequest()) return;

          const jewelleryData = snapshot.docs
            .map((itemDoc) => ({
              id: itemDoc.id,
              ...itemDoc.data(),
            }))
            .filter((item) => item.active !== false);

          setJewellery(jewelleryData);
          setError("");
        } catch (fetchError) {
          console.error(
            "Jewellery Fetch Error:",
            fetchError
          );

          if (!isCurrentRequest()) return;

          setError(
            TEXT[
              normalizeLanguage(profile.language)
            ].fetchError
          );
        } finally {
          if (isCurrentRequest()) {
            setProfileLoading(false);
            setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      requestId += 1;
      unsubscribe();
    };
  }, [refreshKey]);

  // ============================================
  // DASHBOARD THEME + LANGUAGE SYNC
  // ============================================

  useEffect(() => {
    const handlePreferenceChange = (event) => {
      const savedLanguage =
        event.detail?.language;

      const savedTheme =
        event.detail?.theme;

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
    document.documentElement.setAttribute(
      "data-theme",
      theme
    );

    document.documentElement.setAttribute(
      "data-language",
      language
    );

    document.body.setAttribute(
      "data-theme",
      theme
    );

    document.body.setAttribute(
      "data-language",
      language
    );

    document.documentElement.classList.toggle(
      "dark-theme",
      theme === "dark"
    );

    document.documentElement.classList.toggle(
      "light-theme",
      theme === "light"
    );

    try {
      localStorage.setItem(
        "billbox-theme",
        theme
      );

      localStorage.setItem(
        "billbox-language",
        language
      );
    } catch (storageError) {
      console.warn(
        "Preference storage unavailable:",
        storageError
      );
    }
  }, [theme, language]);

  // ============================================
  // REFRESH
  // ============================================

  const handleRefresh = useCallback(() => {
    setError("");
    setRefreshKey((current) => current + 1);
  }, []);

  // ============================================
  // FILTER JEWELLERY
  // ============================================

  const filteredJewellery = useMemo(() => {
    const searchValue = search
      .trim()
      .toLowerCase();

    return jewellery.filter((item) => {
      const itemName = String(
        item.name || ""
      ).toLowerCase();

      const itemMetal = normalizeMetal(
        item.metal
      );

      const searchMatch =
        itemName.includes(searchValue);

      const metalMatch =
        metalFilter === "all" ||
        itemMetal === metalFilter;

      return searchMatch && metalMatch;
    });
  }, [jewellery, search, metalFilter]);

  // ============================================
  // COUNTS
  // ============================================

  const goldCount = useMemo(
    () =>
      jewellery.filter(
        (item) =>
          normalizeMetal(item.metal) === "gold"
      ).length,
    [jewellery]
  );

  const silverCount = useMemo(
    () =>
      jewellery.filter(
        (item) =>
          normalizeMetal(item.metal) === "silver"
      ).length,
    [jewellery]
  );

  // ============================================
  // METAL LABEL
  // ============================================

  const getMetalLabel = (metal) => {
    const value = normalizeMetal(metal);

    if (value === "gold") return t.gold;
    if (value === "silver") return t.silver;

    return t.unknownMetal;
  };

  const getItemDescription = (metal) => {
    const value = normalizeMetal(metal);

    if (value === "gold") return t.goldItem;
    if (value === "silver") return t.silverItem;

    return t.otherItem;
  };

  // ============================================
  // LOADER
  // ============================================

  if (
    !authReady ||
    profileLoading ||
    loading
  ) {
    return (
      <PageLoader
        loading={true}
        message={t.preparing}
        fullScreen={true}
      />
    );
  }

  // ============================================
  // MAIN UI
  // ============================================

  return (
    <div
      className={`jewellery-page ${
        theme === "light"
          ? "jewellery-light"
          : "jewellery-dark"
      }`}
      data-theme={theme}
      data-language={language}
    >
      {/* HEADER */}

      <header className="jewellery-topbar">
        <div className="jewellery-brand">

          {/* SHOP LOGO — EXISTING DESIGN PRESERVED */}

          <div className="jewellery-logo">
            {shopProfile.logoUrl ? (
              <img
                src={shopProfile.logoUrl}
                alt={shopProfile.shopName}
                onError={(event) => {
                  event.currentTarget.style.display =
                    "none";
                }}
              />
            ) : (
              <span>
                {String(
                  shopProfile.shopName || "B"
                )
                  .trim()
                  .charAt(0)
                  .toUpperCase()}
              </span>
            )}
          </div>

          <div className="brand-text">
            <strong>
              {shopProfile.shopName}
            </strong>

            <span>{t.collection}</span>
          </div>
        </div>

        {/* DASHBOARD BUTTON — RIGHT CORNER */}

        <button
          className="jewellery-dashboard-button"
          type="button"
          onClick={() => navigate("/dashboard")}
        >
          <span aria-hidden="true">←</span>
          <span>{t.dashboard}</span>
        </button>
      </header>

      {/* MAIN */}

      <main className="jewellery-content">

        {/* INTRO */}

        <section className="jewellery-intro">
          <div>
            <span className="jewellery-eyebrow">
              {t.eyebrow}
            </span>

            <h1>
              {t.headingStart}{" "}
              <em>{t.headingEnd}</em>
            </h1>

            <p>{t.description}</p>
          </div>

          {/* COLLECTION STATS */}

          <div className="collection-stats">
            <div className="collection-stat">
              <span>{t.gold}</span>
              <strong>{goldCount}</strong>
            </div>

            <div className="stat-divider"></div>

            <div className="collection-stat">
              <span>{t.silver}</span>
              <strong>{silverCount}</strong>
            </div>

            <div className="stat-divider"></div>

            <div className="collection-stat total-stat">
              <span>{t.totalJewellery}</span>
              <strong>{jewellery.length}</strong>
            </div>

            {/* REFRESH BUTTON */}

            <button
              className="jewellery-refresh"
              type="button"
              onClick={handleRefresh}
              title={t.retry}
              aria-label={t.retry}
            >
              ↻
            </button>
          </div>
        </section>

        {/* TOOLBAR */}

        <section className="jewellery-toolbar">
          <div className="search-box">
            <span className="search-icon">
              ⌕
            </span>

            <input
              id="jewellery-search"
              name="jewellerySearch"
              type="text"
              placeholder={t.searchPlaceholder}
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              aria-label={t.searchPlaceholder}
            />

            {search && (
              <button
                className="clear-search"
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <div className="metal-filters">
            <button
              type="button"
              className={
                metalFilter === "all"
                  ? "metal-filter active"
                  : "metal-filter"
              }
              onClick={() => setMetalFilter("all")}
            >
              {t.all}
            </button>

            <button
              type="button"
              className={
                metalFilter === "gold"
                  ? "metal-filter gold active"
                  : "metal-filter gold"
              }
              onClick={() => setMetalFilter("gold")}
            >
              {t.gold}
            </button>

            <button
              type="button"
              className={
                metalFilter === "silver"
                  ? "metal-filter silver active"
                  : "metal-filter silver"
              }
              onClick={() =>
                setMetalFilter("silver")
              }
            >
              {t.silver}
            </button>
          </div>
        </section>

        {/* COLLECTION */}

        <section className="collection-section">
          <div className="collection-heading">
            <div>
              <span>{t.sectionEyebrow}</span>
              <h2>{t.listHeading}</h2>
            </div>

            <p>
              {filteredJewellery.length}{" "}
              {t.itemCount}
            </p>
          </div>

          {/* ERROR */}

          {error && (
            <div className="empty-jewellery jewellery-error">
              <div className="empty-icon">!</div>

              <h3>{error}</h3>

              <button
                type="button"
                className="jewellery-retry-button"
                onClick={handleRefresh}
              >
                {t.retry}
              </button>
            </div>
          )}

          {/* EMPTY */}

          {!error &&
            filteredJewellery.length === 0 && (
              <div className="empty-jewellery">
                <div className="empty-icon">◇</div>

                <h3>{t.emptyHeading}</h3>

                <p>{t.emptyDescription}</p>
              </div>
            )}

          {/* JEWELLERY GRID */}

          {!error &&
            filteredJewellery.length > 0 && (
              <div className="jewellery-grid">
                {filteredJewellery.map((item) => {
                  const metal = normalizeMetal(
                    item.metal
                  );

                  const isGold = metal === "gold";
                  const isSilver = metal === "silver";

                  const imageUrl = String(
                    item.imageUrl || ""
                  ).trim();

                  return (
                    <article
                      className="jewellery-card"
                      key={item.id}
                    >
                      {/* IMAGE */}

                      <div
                        className={`jewellery-image ${
                          isGold
                            ? "gold-image"
                            : isSilver
                              ? "silver-image"
                              : "other-image"
                        }`}
                      >
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={
                              item.name ||
                              t.unknownItem
                            }
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.style.display =
                                "none";

                              event.currentTarget.parentElement.classList.add(
                                "image-error"
                              );
                            }}
                          />
                        ) : (
                          <div className="no-image">
                            ◇
                          </div>
                        )}

                        <span
                          className={`metal-badge ${
                            isGold
                              ? "gold-badge"
                              : isSilver
                                ? "silver-badge"
                                : "other-badge"
                          }`}
                        >
                          {getMetalLabel(item.metal)}
                        </span>
                      </div>

                      {/* CARD CONTENT */}

                      <div className="jewellery-card-content">
                        <span className="item-number">
                          {t.itemLabel}
                        </span>

                        <h3>
                          {item.name || t.unknownItem}
                        </h3>

                        <div className="card-bottom">
                          <span>
                            {getItemDescription(
                              item.metal
                            )}
                          </span>

                          <span className="active-status">
                            {t.available}
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
        </section>
      </main>

      {/* FOOTER */}

      <footer className="jewellery-footer">
        <span>{t.trust}</span>
        <b>•</b>
        <span>{t.purity}</span>
        <b>•</b>
        <span>{t.beauty}</span>

        <small>
          © {new Date().getFullYear()}{" "}
          {shopProfile.shopName}
        </small>
      </footer>
    </div>
  );
}

export default Jewellery;
