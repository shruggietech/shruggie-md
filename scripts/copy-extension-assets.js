/**
 * Post-build script: copies static extension assets into extension/dist/
 * so the output directory is a loadable Chrome extension.
 */

import { cpSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const dist = resolve(root, "extension/dist");

// Copy manifest.json
cpSync(resolve(root, "extension/manifest.json"), resolve(dist, "manifest.json"));
console.log("Copied manifest.json");

// Copy popup.html
cpSync(resolve(root, "extension/popup.html"), resolve(dist, "popup.html"));
console.log("Copied popup.html");

// Copy icons
mkdirSync(resolve(dist, "icons"), { recursive: true });
for (const size of [16, 48, 128]) {
  const name = `icon-${size}.png`;
  cpSync(resolve(root, "extension/icons", name), resolve(dist, "icons", name));
  console.log(`Copied icons/${name}`);
}

// Create empty content.css (styles are inlined in shadow DOM)
writeFileSync(resolve(dist, "content.css"), "/* Styles are injected via shadow DOM in content.js */\n");
console.log("Created content.css (placeholder)");

console.log("Extension assets copied to extension/dist/");
