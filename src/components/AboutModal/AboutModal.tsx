import { Modal } from "../common";
import { getPlatform } from "@/platform/platform";
import { useState, useEffect } from "react";

export interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const appVersion = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "0.0.0";

  const [platformName, setPlatformName] = useState("Web");

  useEffect(() => {
    let cancelled = false;
    getPlatform().then((adapter) => {
      if (cancelled) return;
      const caps = adapter.getPlatformCapabilities();
      if (caps.hasFilesystem && caps.hasNativeDialogs) {
        setPlatformName("Tauri (Desktop)");
      } else if (caps.hasFilesystem) {
        setPlatformName("Chrome Extension");
      } else {
        setPlatformName("PWA");
      }
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="About Shruggie Markdown">
      <div
        data-testid="about-modal-content"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--space-3)",
          textAlign: "center",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "var(--font-size-lg)",
            fontFamily: "var(--font-ui)",
            fontWeight: 600,
            color: "var(--color-text-primary)",
          }}
        >
          Shruggie Markdown
        </p>

        <p
          data-testid="about-version"
          style={{
            margin: 0,
            fontSize: "var(--font-size-base)",
            fontFamily: "var(--font-ui)",
            color: "var(--color-text-secondary)",
          }}
        >
          Version {appVersion}
        </p>

        <p
          style={{
            margin: 0,
            fontSize: "var(--font-size-sm)",
            fontFamily: "var(--font-ui)",
            color: "var(--color-text-secondary)",
          }}
        >
          Platform: {platformName}
        </p>

        <p
          style={{
            margin: 0,
            fontSize: "var(--font-size-sm)",
            fontFamily: "var(--font-ui)",
            color: "var(--color-text-tertiary)",
          }}
        >
          Built by Shruggie LLC (DBA ShruggieTech)
        </p>

        <a
          href="https://github.com/shruggietech/shruggie-md"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: "var(--font-size-sm)",
            fontFamily: "var(--font-ui)",
            color: "var(--color-accent)",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.textDecoration = "underline";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.textDecoration = "none";
          }}
        >
          GitHub Repository
        </a>

        <p
          style={{
            margin: 0,
            fontSize: "var(--font-size-xs)",
            fontFamily: "var(--font-ui)",
            color: "var(--color-text-tertiary)",
          }}
        >
          License: Apache-2.0
        </p>
      </div>
    </Modal>
  );
}
