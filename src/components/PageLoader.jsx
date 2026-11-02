
import "./PageLoader.css";

function PageLoader({
  loading = true,
  message = "Preparing your experience...",
  fullScreen = true,
}) {
  if (!loading) return null;

  return (
    <div
      className={`bb-loader-overlay ${fullScreen ? "bb-loader-fullscreen" : "bb-loader-inline"}`}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="bb-loader-content">

        <div className="bb-loader-animation">

          <div className="bb-loader-orbit bb-orbit-one" />
          <div className="bb-loader-orbit bb-orbit-two" />

          <div className="bb-loader-logo">
            <span>B</span>
            <div className="bb-loader-logo-dot" />
          </div>

        </div>

        <div className="bb-loader-brand">
          <span className="bb-loader-brand-name">
            Bill<span>Box</span>
          </span>

          <span className="bb-loader-powered">
            POWERED BY TECHSEZ
          </span>
        </div>

        <div className="bb-loader-progress">
          <span />
        </div>

        <p className="bb-loader-message">
          {message}
        </p>

      </div>
    </div>
  );
}

export default PageLoader;





