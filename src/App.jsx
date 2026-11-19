
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "./firebase";

import {
  LoadingProvider,
  useGlobalLoading,
} from "./context/LoadingContext";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NewBill from "./pages/NewBill";
import BillHistory from "./pages/BillHistory";
import TodaySales from "./pages/TodaySales";
import CustomerLedger from "./pages/CustomerLedger";
import PendingBills from "./pages/PendingBills";

const ADMIN_EMAIL = "kj@gmail.com";

const DEFAULT_PREFERENCES = {
  theme: "dark",
  language: "hi",
};

function applyPreferences(preferences, broadcast = true) {
  const theme = preferences.theme === "light" ? "light" : "dark";
  const language = preferences.language === "en" ? "en" : "hi";

  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.language = language;

  localStorage.setItem("billbox-theme", theme);
  localStorage.setItem("billbox-language", language);

  if (broadcast) {
    window.dispatchEvent(
      new CustomEvent("billbox-preferences-change", {
        detail: { theme, language },
      })
    );
  }
}

function ProtectedRoute({ children, user, authReady }) {
  if (!authReady) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppContent() {
  const [user, setUser] = useState(null);
  const [appReady, setAppReady] = useState(false);

  const { setBootLoading } = useGlobalLoading();

  useEffect(() => {
    let active = true;
    let authEventVersion = 0;

    const applyLocalPreferences = () => {
      applyPreferences({
        theme:
          localStorage.getItem("billbox-theme") ||
          DEFAULT_PREFERENCES.theme,
        language:
          localStorage.getItem("billbox-language") ||
          DEFAULT_PREFERENCES.language,
      });
    };

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (!active) return;

        const thisEvent = ++authEventVersion;

        if (!currentUser) {
          setUser(null);
          applyLocalPreferences();
          setAppReady(true);
          setBootLoading(false);
          return;
        }

        if (
          String(currentUser.email || "").toLowerCase() ===
          ADMIN_EMAIL.toLowerCase()
        ) {
          setUser(currentUser);
          applyPreferences(DEFAULT_PREFERENCES);
          setAppReady(true);
          setBootLoading(false);
          return;
        }

        try {
          const shopRef = doc(db, "shops", currentUser.uid);
          const shopSnapshot = await getDoc(shopRef);

          if (!active || thisEvent !== authEventVersion) return;

          if (!shopSnapshot.exists()) {
            setUser(null);
            applyLocalPreferences();
          } else {
            const shopData = shopSnapshot.data();

            const shopStatus = String(shopData.status || "")
              .toLowerCase()
              .trim();

            if (shopStatus === "active") {
              setUser(currentUser);

              applyPreferences({
                theme:
                  shopData.theme || DEFAULT_PREFERENCES.theme,
                language:
                  shopData.language || DEFAULT_PREFERENCES.language,
              });
            } else {
              setUser(null);
              applyLocalPreferences();
            }
          }
        } catch (error) {
          console.error("Could not verify shop account:", error);

          if (!active || thisEvent !== authEventVersion) return;

          setUser(null);
          applyLocalPreferences();
        } finally {
          if (active && thisEvent === authEventVersion) {
            setAppReady(true);
            setBootLoading(false);
          }
        }
      }
    );

    const handlePreferenceChange = (event) => {
      if (event.detail) {
        applyPreferences(event.detail, false);
      }
    };

    window.addEventListener(
      "billbox-preferences-change",
      handlePreferenceChange
    );

    return () => {
      active = false;
      unsubscribeAuth();

      window.removeEventListener(
        "billbox-preferences-change",
        handlePreferenceChange
      );
    };
  }, [setBootLoading]);

  if (!appReady) {
    return null;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        <Route
          path="/login"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login />
            )
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute user={user} authReady={appReady}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/new-bill"
          element={
            <ProtectedRoute user={user} authReady={appReady}>
              <NewBill />
            </ProtectedRoute>
          }
        />

        <Route
          path="/bill-history"
          element={
            <ProtectedRoute user={user} authReady={appReady}>
              <BillHistory />
            </ProtectedRoute>
          }
        />

        <Route
          path="/today-sales"
          element={
            <ProtectedRoute user={user} authReady={appReady}>
              <TodaySales />
            </ProtectedRoute>
          }
        />

        {/* Customer Ledger Route */}
        <Route
          path="/customer-ledger"
          element={
            <ProtectedRoute user={user} authReady={appReady}>
              <CustomerLedger />
            </ProtectedRoute>
          }
        />

        {/* Pending Bills Route */}
        <Route
          path="/pending-bills"
          element={
            <ProtectedRoute user={user} authReady={appReady}>
              <PendingBills />
            </ProtectedRoute>
          }
        />

        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <LoadingProvider>
      <AppContent />
    </LoadingProvider>
  );
}

export default App;
