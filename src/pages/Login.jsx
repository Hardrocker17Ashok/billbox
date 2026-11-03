
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGlobalLoading } from "../context/LoadingContext";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";

import { auth, db, storage } from "../firebase";
import "./Login.css";

const ADMIN_EMAIL = "kj@gmail.com";
const VALID_USERNAME = "kj001";
const WHATSAPP_SUPPORT_NUMBER = "917597201594";
const getWhatsAppUrl = (message) => {
  const text = encodeURIComponent(message);

  return WHATSAPP_SUPPORT_NUMBER
    ? `https://wa.me/${WHATSAPP_SUPPORT_NUMBER}?text=${text}`
    : `https://wa.me/?text=${text}`;
};

const jewelleryImages = [
  {
    src: "/pexels-dhrupal-shiyal-2155843159-37601639.jpg",
    alt: "Elegant jewellery collection",
  },
  {
    src: "/pexels-ebru-akal-1512857-12585697.jpg",
    alt: "Premium jewellery design",
  },
  {
    src: "/pexels-karola-g-4735892.jpg",
    alt: "Fine jewellery craftsmanship",
  },
  {
    src: "/pexels-vedat-28933799.jpg",
    alt: "Luxury jewellery collection",
  },
  {
    src: "/pexels-vedat-28933800.jpg",
    alt: "Luxury jewellery collection",
  },
  {
    src: "/pexels-waseem-istanbuli-2149205866-33569933.jpg",
    alt: "Luxury jewellery collection",
  },
];

// Username is converted to a Firebase-compatible internal email.
const usernameToAuthEmail = (username) =>
  `${username.trim().toLowerCase()}@billbox-login.com`;

const wait = (milliseconds) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export default function Login() {
  const navigate = useNavigate();
  const { startLoading, stopLoading } = useGlobalLoading();

  // Page and form states
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Button loading state only
  const [loading, setLoading] = useState(false);

  // Full-screen loader states
  const [assetsReady, setAssetsReady] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [registrationSubmitted, setRegistrationSubmitted] =
    useState(false);
  const [logoUploadWarning, setLogoUploadWarning] = useState("");

  // Registration fields
  const [shopName, setShopName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [address, setAddress] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // --------------------------------------------------
  // INITIAL PAGE LOADER + IMAGE PRELOADING
  // --------------------------------------------------

  useEffect(() => {
    let cancelled = false;
    let timeoutId = null;
    let loadingReleased = false;

    // Keep the existing global PageLoader visible while the login artwork loads.
    startLoading("Preparing your workspace...");

    const releaseLoading = () => {
      if (!loadingReleased) {
        loadingReleased = true;
        stopLoading();
      }
    };

    const preloadImages = async () => {
      const imagePromises = jewelleryImages.map(
        (item) =>
          new Promise((resolve) => {
            const image = new Image();

            image.onload = resolve;
            image.onerror = resolve;
            image.src = item.src;

            if (image.complete) resolve();
          })
      );

      await Promise.race([
        Promise.all(imagePromises),
        new Promise((resolve) => {
          timeoutId = window.setTimeout(resolve, 8000);
        }),
      ]);

      if (!cancelled) {
        setAssetsReady(true);
      }

      releaseLoading();
    };

    preloadImages();

    return () => {
      cancelled = true;

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }

      // Also balances the loading counter if React StrictMode replays the effect.
      releaseLoading();
    };
  }, [startLoading, stopLoading]);

  // --------------------------------------------------
  // FULL-SCREEN LOADER BEFORE DASHBOARD
  // --------------------------------------------------

  const openDashboard = async () => {
    setDashboardLoading(true);
    startLoading("Opening your workspace...");

    try {
      await wait(650);
      navigate("/dashboard", { replace: true });
    } finally {
      stopLoading();
    }
  };

  // --------------------------------------------------
  // SWITCH LOGIN / REGISTRATION MODE
  // --------------------------------------------------

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setSuccess("");
    setRegistrationSubmitted(false);
    setLogoUploadWarning("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  };

  // --------------------------------------------------
  // LOGIN
  // --------------------------------------------------

  const handleLogin = async (event) => {
    event.preventDefault();

    if (loading || dashboardLoading) return;

    setError("");
    setSuccess("");

    const cleanUsername = username.trim().toLowerCase();

    if (!cleanUsername || !password) {
      setError("Please enter your username and password.");
      return;
    }

    try {
      setLoading(true);

      const authEmail =
        cleanUsername === VALID_USERNAME
          ? ADMIN_EMAIL
          : usernameToAuthEmail(cleanUsername);

      // Step 1: Firebase Authentication
      const credential = await signInWithEmailAndPassword(
        auth,
        authEmail,
        password
      );

      const loggedInUser = credential.user;

      // Existing Kaniska admin account
      if (cleanUsername === VALID_USERNAME) {
        setLoading(false);
        await openDashboard();
        return;
      }

      // Step 2: Read shop document
      const shopRef = doc(db, "shops", loggedInUser.uid);
      const shopSnapshot = await getDoc(shopRef);

      if (!shopSnapshot.exists()) {
        await signOut(auth);

        setError(
          "Your shop registration details were not found. Please contact the BillBox Team on WhatsApp."
        );
        return;
      }

      const shopData = shopSnapshot.data();

      const shopStatus = String(shopData.status || "")
        .toLowerCase()
        .trim();

      // Pending account
      if (shopStatus === "pending") {
        await signOut(auth);

        setError(
          "⏳ Your account is awaiting activation! Your registration has been received successfully. Please wait for the BillBox Team to approve your account. For assistance, contact us on WhatsApp."
        );
        return;
      }

      // Rejected account
      if (shopStatus === "rejected") {
        await signOut(auth);

        setError(
          "Your registration has not been approved. Please contact the BillBox Team on WhatsApp for assistance."
        );
        return;
      }

      // Suspended account
      if (shopStatus === "suspended") {
        await signOut(auth);

        setError(
          "Your account is currently suspended. Please contact the BillBox Team on WhatsApp."
        );
        return;
      }

      // Only active account can enter Dashboard
      if (shopStatus === "active") {
        setLoading(false);
        await openDashboard();
        return;
      }

      // Unknown status
      await signOut(auth);

      setError(
        "Your account status could not be verified. Please contact the BillBox Team."
      );
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      console.error("LOGIN ERROR CODE:", err.code);

      if (auth.currentUser) {
        try {
          await signOut(auth);
        } catch (signOutError) {
          console.error("Sign out error:", signOutError);
        }
      }

      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password"
      ) {
        setError("Incorrect username or password. Please try again.");
      } else if (
        err.code === "permission-denied" ||
        err.code === "firestore/permission-denied"
      ) {
        setError(
          "Unable to verify your account activation status. Please contact the BillBox Team."
        );
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many login attempts. Please try again later.");
      } else if (err.code === "auth/network-request-failed") {
        setError(
          "Network connection failed. Please check your internet and try again."
        );
      } else {
        setError(
          "Something went wrong while signing in. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // SHOP REGISTRATION
  // --------------------------------------------------

  const handleRegister = async (event) => {
    event.preventDefault();

    if (loading || dashboardLoading) return;

    setError("");
    setSuccess("");
    setLogoUploadWarning("");

    const cleanUsername = registerUsername.trim().toLowerCase();
    const cleanShopName = shopName.trim();
    const cleanEmail = ownerEmail.trim().toLowerCase();
    const cleanAddress = address.trim();

    // Required fields
    if (!cleanShopName || !cleanEmail || !cleanAddress) {
      setError("Please complete all required shop details.");
      return;
    }

    // Username validation
    if (!/^[a-z0-9._]{4,20}$/.test(cleanUsername)) {
      setError(
        "Username must be 4–20 characters. Use lowercase letters, numbers, dot or underscore."
      );
      return;
    }

    if (cleanUsername === VALID_USERNAME) {
      setError(
        "This username is reserved. Please choose another username."
      );
      return;
    }

    // Password validation
    if (registerPassword.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (registerPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // Logo validation
    if (logoFile && !logoFile.type.startsWith("image/")) {
      setError("Please select a valid image for your shop logo.");
      return;
    }

    if (logoFile && logoFile.size > 5 * 1024 * 1024) {
      setError("Logo size must be less than 5 MB.");
      return;
    }

    try {
      setLoading(true);

      // Step 1: Create Firebase Authentication account
      const credential = await createUserWithEmailAndPassword(
        auth,
        usernameToAuthEmail(cleanUsername),
        registerPassword
      );

      const createdUser = credential.user;

      // Step 2: Upload optional logo
      // Logo upload failure will not stop registration.
      let logoUrl = "";

      if (logoFile) {
        try {
          const logoRef = ref(
            storage,
            `shop-logos/${createdUser.uid}/logo-${Date.now()}`
          );

          await uploadBytes(logoRef, logoFile, {
            contentType: logoFile.type,
          });

          logoUrl = await getDownloadURL(logoRef);
        } catch (logoError) {
          console.error(
            "Optional shop logo upload failed:",
            logoError
          );

          setLogoUploadWarning(
            "Your registration was submitted, but the logo could not be uploaded. You can share it with our team on WhatsApp."
          );
        }
      }

      // Step 3: Create shop document
      // Collection: shops
      // Document ID: Firebase Authentication UID
      await setDoc(doc(db, "shops", createdUser.uid), {
        uid: createdUser.uid,
        shopName: cleanShopName,
        shopNameLower: cleanShopName
          .trim()
          .toLowerCase()
          .replace(/\s+/g, " "),
        username: cleanUsername,
        email: cleanEmail,
        address: cleanAddress,
        logoUrl: logoUrl || "",
        theme: "dark",
        language: "en",

        status: "pending",
        createdAt: serverTimestamp(),
      });

      // Step 4: Sign out after successful registration
      await signOut(auth);

      // Step 5: Clear registration fields
      setShopName("");
      setOwnerEmail("");
      setAddress("");
      setLogoFile(null);
      setRegisterUsername("");
      setRegisterPassword("");
      setConfirmPassword("");

      // Step 6: Return to login mode
      setMode("login");
      setUsername(cleanUsername);
      setPassword("");
      setShowPassword(false);

      setRegistrationSubmitted(true);

      setSuccess(
        "Your registration request has been successfully submitted. Please wait for account activation."
      );
    } catch (err) {
      console.error("BillBox registration error:", err);
      console.error("Registration error code:", err.code);
      console.error("Registration error message:", err.message);

      // Sign out if registration failed after Auth account creation
      if (auth.currentUser) {
        try {
          await signOut(auth);
        } catch (signOutError) {
          console.error(
            "Registration cleanup error:",
            signOutError
          );
        }
      }

      if (err.code === "auth/email-already-in-use") {
        setError(
          "This username is already registered. If you previously tried registering and did not receive confirmation, contact the BillBox team on WhatsApp to complete your pending registration."
        );
      } else if (err.code === "auth/weak-password") {
        setError(
          "Please choose a stronger password (at least 6 characters)."
        );
      } else if (err.code === "auth/invalid-email") {
        setError(
          "Unable to create this username. Please try another."
        );
      } else if (
        err.code === "permission-denied" ||
        err.code === "firestore/permission-denied"
      ) {
        setError(
          "Firebase blocked the shop profile save. Please check Firestore Rules and ensure the shops document fields match the registration data."
        );
      } else if (err.code === "auth/network-request-failed") {
        setError(
          "Network connection failed. Please check your internet and try again."
        );
      } else {
        setError(
          `${err.code || "Registration error"}: ${err.message ||
          "Registration could not be completed. Please contact the BillBox team."
          }`
        );
      }
    } finally {
      setLoading(false);
    }
  };



  if (!assetsReady || dashboardLoading) {
    return null;
  }

  // --------------------------------------------------
  // LOGIN / REGISTRATION PAGE
  // --------------------------------------------------

  return (
    <main className="billbox-login">
      {/* LEFT SHOWCASE */}
      <section className="billbox-showcase">
        <div className="showcase-glow showcase-glow-one" />
        <div className="showcase-glow showcase-glow-two" />

        <div
          className="jewellery-marquee showcase-image-background"
          aria-label="Jewellery gallery"
        >
          <div className="marquee-track">
            {[...jewelleryImages, ...jewelleryImages].map(
              (item, index) => (
                <div
                  className="jewellery-card"
                  key={`${item.src}-${index}`}
                >
                  <img
                    src={item.src}
                    alt={item.alt}
                    loading="eager"
                    decoding="async"
                    draggable="false"
                  />

                  <span className="jewellery-card-shine" />
                </div>
              )
            )}
          </div>

          <div className="marquee-edge marquee-edge-left" />
          <div className="marquee-edge marquee-edge-right" />
        </div>

        <header className="showcase-header">
          <div className="billbox-wordmark">
            <strong>
              BillBox<span>.</span>
            </strong>

            <span>SMART BILLING. SIMPLE BUSINESS.</span>
          </div>

          <div className="showcase-status">
            <span />
            BUSINESS EDITION
          </div>
        </header>

        <div className="showcase-copy">
          <h1>
            Billing made
            <br />
            <span>beautifully simple.</span>
          </h1>

          <p>Create bills. Track sales. Grow smarter.</p>
        </div>

        <footer className="showcase-bottom">
          <div className="showcase-caption">
            <span className="caption-line" />
            <span>BUILT FOR BETTER BUSINESS</span>
          </div>

          <div className="showcase-powered">
            <span>CRAFTED BY</span>
            <strong>TechSez</strong>
          </div>
        </footer>

        <div className="showcase-decoration" />
      </section>

      {/* RIGHT LOGIN PANEL */}
      <section className="billbox-login-panel">
        <div className="login-panel-glow" />

        <div className="login-content">
          {/* WHATSAPP SUPPORT */}
          <a
            className="billbox-whatsapp-top"
            href={getWhatsAppUrl(
              "Hello BillBox Team, I need help with payment, shop registration or account activation."
            )}
            target="_blank"
            rel="noreferrer"
          >
            <span className="whatsapp-icon" aria-hidden="true">
              <svg viewBox="0 0 32 32" role="img" focusable="false">
                <path d="M16.02 3.2A12.7 12.7 0 0 0 5.1 22.38L3.3 28.8l6.58-1.73A12.7 12.7 0 1 0 16.02 3.2Zm0 23.1c-2 0-3.96-.54-5.67-1.57l-.4-.24-3.9 1.02 1.04-3.8-.26-.42a10.35 10.35 0 1 1 9.19 5.01Zm5.68-7.75c-.31-.16-1.83-.9-2.12-1-.28-.1-.49-.16-.7.16-.2.31-.8 1-.98 1.2-.18.2-.49.23-.67.08-.31-.16-1.3-.48-2.47-1.52-.91-.81-1.53-1.82-1.71-2.13-.31-.31-.02-.48.14-.64.14-.14.31-.36.46-.54.16-.18.21-.31.31-.52.1-.2.05-.39-.02-.54-.08-.16-.7-1.68-.96-2.3-.25-.6-.51-.52-.7-.53h-.6c-.2 0-.54.08-.82.39-.28.31-1.08 1.05-1.08 2.56s1.1 2.97 1.25 3.18c.16.2 2.16 3.3 5.23 4.62.73.31 1.3.5 1.75.64.74.23 1.41.2 1.94.12.59-.09 1.83-.75 2.09-1.48.26-.72.26-1.34.18-1.47-.08-.13-.28-.2-.59-.36Z" />
              </svg>
            </span>

            <span className="whatsapp-copy">
              <strong>WhatsApp BillBox</strong>
              <small>Payment & registration assistance</small>
            </span>

            <span className="whatsapp-arrow" aria-hidden="true">
              ↗
            </span>
          </a>

          {/* HEADING */}
          <div className="login-heading">
            <h2>
              {mode === "login"
                ? "Welcome back"
                : "Create your shop"}
              <span>.</span>
            </h2>

            <p>
              {mode === "login"
                ? "Sign in to manage your business."
                : "Register your business on BillBox."}
            </p>
          </div>

          {/* REGISTRATION SUCCESS */}
          {registrationSubmitted && (
            <section
              className="registration-success-card"
              role="status"
              aria-live="polite"
            >
              <div className="registration-success-icon">✓</div>

              <span className="registration-success-eyebrow">
                REQUEST RECEIVED
              </span>

              <h3>Your shop is in the queue.</h3>

              <p>
                Thank you for choosing BillBox. Your registration
                has been submitted successfully. Please wait for
                the BillBox Team to activate your account. You can
                sign in after your account is activated.
              </p>

              <div className="activation-steps">
                <div className="activation-step">
                  <span className="activation-step-done">1</span>

                  <span>
                    <strong>Registration submitted</strong>
                    <small>
                      Your shop details have been received.
                    </small>
                  </span>
                </div>

                <div className="activation-step">
                  <span className="activation-step-pending">2</span>

                  <span>
                    <strong>Team verification</strong>
                    <small>
                      Our team will review your information.
                    </small>
                  </span>
                </div>

                <div className="activation-step">
                  <span className="activation-step-pending">3</span>

                  <span>
                    <strong>Account activation</strong>
                    <small>
                      Sign in once your account is active.
                    </small>
                  </span>
                </div>
              </div>

              {logoUploadWarning && (
                <p className="registration-warning">
                  {logoUploadWarning}
                </p>
              )}

              <a
                className="registration-whatsapp-button"
                href={getWhatsAppUrl(
                  `Hello BillBox Team, I have submitted a shop registration request. Username: ${username}. Please help me with account activation and payment information.`
                )}
                target="_blank"
                rel="noreferrer"
              >
                <svg
                  className="whatsapp-inline-icon"
                  viewBox="0 0 32 32"
                  aria-hidden="true"
                >
                  <path d="M16.02 3.2A12.7 12.7 0 0 0 5.1 22.38L3.3 28.8l6.58-1.73A12.7 12.7 0 1 0 16.02 3.2Zm0 23.1c-2 0-3.96-.54-5.67-1.57l-.4-.24-3.9 1.02 1.04-3.8-.26-.42a10.35 10.35 0 1 1 9.19 5.01Zm5.68-7.75c-.31-.16-1.83-.9-2.12-1-.28-.1-.49-.16-.7.16-.2.31-.8 1-.98 1.2-.18.2-.49.23-.67.08-.31-.16-1.3-.48-2.47-1.52-.91-.81-1.53-1.82-1.71-2.13-.31-.31-.02-.48.14-.64.14-.14.31-.36.46-.54.16-.18.21-.31.31-.52.1-.2.05-.39-.02-.54-.08-.16-.7-1.68-.96-2.3-.25-.6-.51-.52-.7-.53h-.6c-.2 0-.54.08-.82.39-.28.31-1.08 1.05-1.08 2.56s1.1 2.97 1.25 3.18c.16.2 2.16 3.3 5.23 4.62.73.31 1.3.5 1.75.64.74.23 1.41.2 1.94.12.59-.09 1.83-.75 2.09-1.48.26-.72.26-1.34.18-1.47-.08-.13-.28-.2-.59-.36Z" />
                </svg>

                <span>Contact BillBox on WhatsApp</span>
                <span>↗</span>
              </a>

              <button
                className="registration-back-button"
                type="button"
                onClick={() => {
                  setRegistrationSubmitted(false);
                  setSuccess("");
                  setError("");
                }}
              >
                Back to sign in
              </button>
            </section>
          )}

          {/* SUCCESS MESSAGE */}
          {success && !registrationSubmitted && (
            <div className="login-success" role="status">
              <span>✓</span>
              <p>{success}</p>
            </div>
          )}

          {/* LOGIN FORM */}
          {!registrationSubmitted &&
            (mode === "login" ? (
              <form
                className="billbox-form"
                onSubmit={handleLogin}
              >
                <div className="form-field">
                  <label htmlFor="billbox-username">
                    Username
                  </label>

                  <div className="form-input">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="8" r="3.5" />
                      <path d="M5 20c.5-3.5 3.1-5.5 7-5.5s6.5 2 7 5.5" />
                    </svg>

                    <input
                      id="billbox-username"
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(event) =>
                        setUsername(event.target.value)
                      }
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck="false"
                      required
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="billbox-password">
                    Password
                  </label>

                  <div className="form-input">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <rect
                        x="5"
                        y="10"
                        width="14"
                        height="10"
                        rx="2"
                      />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                    </svg>

                    <input
                      id="billbox-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(event) =>
                        setPassword(event.target.value)
                      }
                      autoComplete="current-password"
                      required
                    />

                    <button
                      className="password-toggle"
                      type="button"
                      onClick={() =>
                        setShowPassword((value) => !value)
                      }
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {showPassword ? (
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.5 4.5 9.5 7-.4 1-1.2 2.1-2.2 3M6.2 6.3C3.9 7.8 2.8 9.7 2.5 12c.6 1.5 2.1 3.7 4.8 5.1A10.6 10.6 0 0 0 12 18c.8 0 1.6-.1 2.3-.3" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* ERROR MESSAGE */}
                {error && (
                  <div className="login-error" role="alert">
                    <span>!</span>
                    <p>{error}</p>
                  </div>
                )}

                <button
                  className="billbox-submit"
                  type="submit"
                  disabled={loading || dashboardLoading}
                >
                  <span>
                    {loading
                      ? "Signing in..."
                      : "Sign in to BillBox"}
                  </span>

                  {loading ? (
                    <span className="login-spinner" />
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 12h14m-6-6 6 6-6 6" />
                    </svg>
                  )}
                </button>

                <p className="form-privacy">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 3 20 6v5c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6l8-3Z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>

                  Your business data deserves privacy.
                </p>
              </form>
            ) : (
              // REGISTRATION FORM
              <form
                className="billbox-form billbox-register-form"
                onSubmit={handleRegister}
              >
                <div className="form-field">
                  <label htmlFor="register-shop-name">
                    Shop name *
                  </label>

                  <div className="form-input">
                    <input
                      id="register-shop-name"
                      type="text"
                      placeholder="e.g. Sharma Jewellers"
                      value={shopName}
                      onChange={(event) =>
                        setShopName(event.target.value)
                      }
                      required
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="register-username">
                    Choose username *
                  </label>

                  <div className="form-input">
                    <input
                      id="register-username"
                      type="text"
                      placeholder="e.g. sharmajewellers"
                      value={registerUsername}
                      onChange={(event) =>
                        setRegisterUsername(
                          event.target.value.toLowerCase()
                        )
                      }
                      autoCapitalize="none"
                      autoComplete="username"
                      required
                    />
                  </div>

                  <small className="register-hint">
                    4–20 characters: letters, numbers, dot and
                    underscore.
                  </small>
                </div>

                <div className="form-field">
                  <label htmlFor="register-email">
                    Contact email *
                  </label>

                  <div className="form-input">
                    <input
                      id="register-email"
                      type="email"
                      placeholder="your@email.com"
                      value={ownerEmail}
                      onChange={(event) =>
                        setOwnerEmail(event.target.value)
                      }
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="register-address">
                    Shop address *
                  </label>

                  <div className="form-input">
                    <input
                      id="register-address"
                      type="text"
                      placeholder="Enter complete shop address"
                      value={address}
                      onChange={(event) =>
                        setAddress(event.target.value)
                      }
                      required
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="register-logo">
                    Shop logo (optional)
                  </label>

                  <div className="form-input register-file-input">
                    <input
                      id="register-logo"
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        setLogoFile(
                          event.target.files?.[0] || null
                        )
                      }
                    />
                  </div>

                  {logoFile && (
                    <small className="register-hint">
                      Selected: {logoFile.name}
                    </small>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor="register-password">
                    Create password *
                  </label>

                  <div className="form-input">
                    <input
                      id="register-password"
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={registerPassword}
                      onChange={(event) =>
                        setRegisterPassword(event.target.value)
                      }
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="register-confirm-password">
                    Confirm password *
                  </label>

                  <div className="form-input">
                    <input
                      id="register-confirm-password"
                      type="password"
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="login-error" role="alert">
                    <span>!</span>
                    <p>{error}</p>
                  </div>
                )}

                {/* No registration spinner or full-screen loader */}
                <button
                  className="billbox-submit"
                  type="submit"
                  disabled={loading || dashboardLoading}
                  aria-busy={loading}
                >
                  <span>Submit registration</span>

                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12h14m-6-6 6 6-6 6" />
                  </svg>
                </button>

                <p className="form-privacy">
                  Your account will be activated after admin
                  approval.
                </p>
              </form>
            ))}

          {/* LOGIN / REGISTRATION SWITCH */}
          {!registrationSubmitted && (
            <div className="login-mode-switch">
              {mode === "login" ? (
                <>
                  <span>New to BillBox?</span>

                  <button
                    type="button"
                    onClick={() => switchMode("register")}
                  >
                    Register your shop
                  </button>
                </>
              ) : (
                <>
                  <span>Already registered?</span>

                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                  >
                    Back to sign in
                  </button>
                </>
              )}
            </div>
          )}

          {/* LOGIN SECURITY INFO */}
          {!registrationSubmitted && mode === "login" && (
            <div className="login-security">
              <div className="security-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect
                    x="5"
                    y="10"
                    width="14"
                    height="10"
                    rx="2"
                  />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </svg>
              </div>

              <div className="security-copy">
                <strong>
                  A secure place for your business.
                </strong>

                <p>
                  Sign in to manage bills, items and records.
                </p>
              </div>

              <svg
                className="security-arrow"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M7 17 17 7M8 7h9v9" />
              </svg>
            </div>
          )}

          {/* HELP LINE */}
          <div className="billbox-help-line">
            Need help with payment or activation?

            <a
              href={getWhatsAppUrl(
                "Hello BillBox Team, I need help with payment or account activation."
              )}
              target="_blank"
              rel="noreferrer"
            >
              Chat with our team
            </a>
          </div>

          {/* FOOTER */}
          <footer className="login-footer">
            <span>© {new Date().getFullYear()} BillBox</span>

            <span className="footer-separator">/</span>

            <span>
              An initiative by <strong>TechSez</strong>
            </span>
          </footer>
        </div>

        <div className="login-panel-decoration" />
      </section>
    </main>
  );
}
