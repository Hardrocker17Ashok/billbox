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
import Jewellery from "./pages/Jewellery";

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

// Only a user validated as an active shop (or the BillBox admin)
// can enter protected routes. Do not use auth.currentUser here:
// Firebase also signs in users immediately after registration.
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

        // A signed-out state is always safe to apply immediately.
        if (!currentUser) {
          setUser(null);
          applyLocalPreferences();
          setAppReady(true);
          setBootLoading(false);
          return;
        }

        // The existing BillBox admin account does not need a shops/{uid} doc.
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
          // IMPORTANT:
          // Do not mark a Firebase user as logged in until their shop
          // document exists AND its status is active.
          const shopRef = doc(db, "shops", currentUser.uid);
          const shopSnapshot = await getDoc(shopRef);

          if (!active || thisEvent !== authEventVersion) return;

          if (!shopSnapshot.exists()) {
            // This is commonly the short interval during registration:
            // Firebase Auth has created the user, but the shop document
            // has not yet been written. Keep the Login page mounted.
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
              // Pending / rejected / suspended / unknown accounts
              // must never be treated as authenticated app users.
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

        <Route
          path="/jewellery"
          element={
            <ProtectedRoute user={user} authReady={appReady}>
              <Jewellery />
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
