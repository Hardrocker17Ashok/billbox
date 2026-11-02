import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";

import PageLoader from "../components/PageLoader";

const LoadingContext = createContext(null);

export function LoadingProvider({ children }) {
  const [bootLoading, setBootLoading] = useState(true);
  const [loadingCount, setLoadingCount] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState(
    "Preparing your BillBox experience..."
  );
  const [visible, setVisible] = useState(true);

  const hideTimer = useRef(null);

  const startLoading = useCallback((message) => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }

    if (message) setLoadingMessage(message);

    setVisible(true);
    setLoadingCount((count) => count + 1);
  }, []);

  const stopLoading = useCallback(() => {
    setLoadingCount((count) => Math.max(0, count - 1));
  }, []);

  const runWithLoading = useCallback(
    async (callback, message) => {
      startLoading(message);

      try {
        return await callback();
      } finally {
        stopLoading();
      }
    },
    [startLoading, stopLoading]
  );

  const isLoading = bootLoading || loadingCount > 0;

  useEffect(() => {
    if (isLoading) {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }

      setVisible(true);
      return;
    }

    hideTimer.current = setTimeout(() => {
      setVisible(false);
      hideTimer.current = null;
    }, 250);

    return () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    };
  }, [isLoading]);

  useEffect(() => {
    return () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
      }
    };
  }, []);

  return (
    <LoadingContext.Provider
      value={{
        setBootLoading,
        startLoading,
        stopLoading,
        runWithLoading,
        isLoading,
      }}
    >
      {children}

      <PageLoader
        loading={visible}
        message={loadingMessage}
        fullScreen
      />
    </LoadingContext.Provider>
  );
}

export function useGlobalLoading() {
  const context = useContext(LoadingContext);

  if (!context) {
    throw new Error(
      "useGlobalLoading must be used inside LoadingProvider"
    );
  }

  return context;
}