/// <reference types="chrome" />
/**
 * Shruggie Markdown — Chrome Extension Popup Script
 *
 * Handles the browser-action popup UI: URL input, render button, settings link.
 */

const MD_EXTENSIONS = [".md", ".markdown", ".mdown", ".mkdn", ".mkd"];

/**
 * Validates that the given string is a plausible markdown URL.
 */
export function isValidMarkdownUrl(input: string): boolean {
  try {
    const url = new URL(input);
    const pathname = url.pathname.toLowerCase();
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      MD_EXTENSIONS.some((ext) => pathname.endsWith(ext))
    );
  } catch {
    return false;
  }
}

function init(): void {
  const urlInput = document.getElementById("url-input") as HTMLInputElement | null;
  const renderBtn = document.getElementById("render-btn") as HTMLButtonElement | null;
  const settingsBtn = document.getElementById("settings-btn") as HTMLButtonElement | null;
  const errorMsg = document.getElementById("error-msg") as HTMLParagraphElement | null;

  if (!urlInput || !renderBtn || !settingsBtn || !errorMsg) {
    return;
  }

  renderBtn.addEventListener("click", () => {
    const value = urlInput.value.trim();
    if (!isValidMarkdownUrl(value)) {
      errorMsg.style.display = "block";
      return;
    }
    errorMsg.style.display = "none";

    // Open the URL in a new tab — the content script will pick it up
    if (typeof chrome !== "undefined" && chrome.tabs?.create) {
      chrome.tabs.create({ url: value });
    } else {
      window.open(value, "_blank");
    }
  });

  // Hide error when user types
  urlInput.addEventListener("input", () => {
    errorMsg.style.display = "none";
  });

  settingsBtn.addEventListener("click", () => {
    if (typeof chrome !== "undefined" && chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    }
  });
}

// Wait for DOM
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
