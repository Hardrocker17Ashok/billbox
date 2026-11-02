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

const DEFAULT_PREFERENCES = {
  theme: "dark",
  language: "hi",
};

// Apply preferences globally.
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

// Protected route.
function ProtectedRoute({ children, user }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Main application content.
function AppContent() {
  const [user, setUser] = useState(null);
  const [appReady, setAppReady] = useState(false);

  const { setBootLoading } = useGlobalLoading();

  useEffect(() => {
    let active = true;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (!active) return;

        // Keep the global loader active during authentication.
        setBootLoading(true);
        setAppReady(false);
        setUser(currentUser);

        // No logged-in user.
        if (!currentUser) {
          applyPreferences({
            theme: localStorage.getItem("billbox-theme") || "dark",
            language: localStorage.getItem("billbox-language") || "hi",
          });

          if (active) {
            setAppReady(true);
            setBootLoading(false);
          }

          return;
        }

        // Load saved shop preferences.
        try {
          const shopRef = doc(
            db,
            "shops",
            currentUser.uid
          );

          const shopSnapshot = await getDoc(shopRef);

          if (!active) return;

          if (shopSnapshot.exists()) {
            const shopData = shopSnapshot.data();

            applyPreferences({
              theme: shopData.theme || DEFAULT_PREFERENCES.theme,
              language: shopData.language || DEFAULT_PREFERENCES.language,
            });
          } else {
            applyPreferences(DEFAULT_PREFERENCES);
          }
        } catch (error) {
          console.error(
            "Could not load saved preferences:",
            error
          );

          if (active) {
            applyPreferences({
              theme: localStorage.getItem("billbox-theme") || "dark",
              language: localStorage.getItem("billbox-language") || "hi",
            });
          }
        } finally {
          if (active) {
            setAppReady(true);

            setBootLoading(false);
          }
        }
      }
    );

    // Listen for preference changes from any page.
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

  // Wait until authentication and preferences are initialized.
  // The global PageLoader is already rendered by LoadingProvider.
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
          element={<Login />}
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute user={user}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/new-bill"
          element={
            <ProtectedRoute user={user}>
              <NewBill />
            </ProtectedRoute>
          }
        />

        <Route
          path="/bill-history"
          element={
            <ProtectedRoute user={user}>
              <BillHistory />
            </ProtectedRoute>
          }
        />

        <Route
          path="/today-sales"
          element={
            <ProtectedRoute user={user}>
              <TodaySales />
            </ProtectedRoute>
          }
        />

        <Route
          path="/jewellery"
          element={
            <ProtectedRoute user={user}>
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

// Root application.
function App() {
  return (
    <LoadingProvider>
      <AppContent />
    </LoadingProvider>
  );
}

export default App;