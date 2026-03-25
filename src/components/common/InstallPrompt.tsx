import { useState, useEffect, useCallback } from "react";

const DISMISS_KEY = "shruggie-md-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if previously dismissed
    if (localStorage.getItem(DISMISS_KEY) === "true") return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setDeferredPrompt(null);
    localStorage.setItem(DISMISS_KEY, "true");
  }, []);

  if (!visible) return null;

  return (
    <div
      data-testid="install-prompt"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "var(--space-4, 16px)",
        backgroundColor: "var(--color-bg-secondary)",
        borderTop: "1px solid var(--color-border-primary)",
        zIndex: 1000,
        gap: "var(--space-4, 16px)",
      }}
    >
      <span
        style={{
          color: "var(--color-text-primary)",
          fontSize: "var(--font-size-sm, 14px)",
        }}
      >
        Install Shruggie Markdown for offline use
      </span>
      <div style={{ display: "flex", gap: "var(--space-2, 8px)" }}>
        <button
          data-testid="install-prompt-dismiss"
          onClick={handleDismiss}
          style={{
            padding: "var(--space-2, 8px) var(--space-4, 16px)",
            background: "transparent",
            color: "var(--color-text-secondary)",
            border: "1px solid var(--color-border-primary)",
            borderRadius: "var(--radius-md, 6px)",
            cursor: "pointer",
            fontSize: "var(--font-size-sm, 14px)",
          }}
        >
          Dismiss
        </button>
        <button
          data-testid="install-prompt-install"
          onClick={handleInstall}
          style={{
            padding: "var(--space-2, 8px) var(--space-4, 16px)",
            backgroundColor: "var(--color-accent, #8b5cf6)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius-md, 6px)",
            cursor: "pointer",
            fontSize: "var(--font-size-sm, 14px)",
          }}
        >
          Install
        </button>
      </div>
    </div>
  );
}
