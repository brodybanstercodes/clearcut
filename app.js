/**
 * ClearCut — Free, private, client-side background remover
 * Uses @imgly/background-removal (runs entirely in the browser)
 */

import { removeBackground, preload } from "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm";

// DOM refs
const uploadZone = document.getElementById("uploadZone");
const fileInput = document.getElementById("fileInput");
const browseBtn = document.getElementById("browseBtn");
const workspace = document.getElementById("workspace");
const originalImg = document.getElementById("originalImg");
const resultImg = document.getElementById("resultImg");
const resultPlaceholder = document.getElementById("resultPlaceholder");
const statusText = document.getElementById("statusText");
const progressFill = document.getElementById("progressFill");
const spinner = document.getElementById("spinner");
const downloadBtn = document.getElementById("downloadBtn");
const newBtn = document.getElementById("newBtn");

let currentResultBlob = null;
let currentObjectUrl = null;
let originalObjectUrl = null;

// Config for highest quality transparent PNG
const config = {
  model: "isnet_fp16", // best quality
  output: {
    format: "image/png",
    quality: 1.0,
  },
  progress: (key, current, total) => {
    if (!total) return;
    const pct = Math.round((current / total) * 100);
    progressFill.style.width = `${pct}%`;

    const labels = {
      "fetch:model": "Downloading AI model…",
      "fetch:wasm": "Loading runtime…",
      "compute:inference": "Removing background…",
      "compute:mask": "Refining edges…",
    };
    statusText.textContent = labels[key] || `Processing… ${pct}%`;
  },
};

// Preload model in background for faster first use
preload(config).catch(() => {
  // silent — will load on demand
});

// ——— Event listeners ———

browseBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  fileInput.click();
});

uploadZone.addEventListener("click", () => fileInput.click());

uploadZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadZone.classList.add("dragover");
});

uploadZone.addEventListener("dragleave", () => {
  uploadZone.classList.remove("dragover");
});

uploadZone.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadZone.classList.remove("dragover");
  const file = e.dataTransfer.files?.[0];
  if (file && file.type.startsWith("image/")) {
    handleFile(file);
  }
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (file) handleFile(file);
});

newBtn.addEventListener("click", reset);

downloadBtn.addEventListener("click", () => {
  if (!currentResultBlob) return;
  const a = document.createElement("a");
  a.href = currentObjectUrl;
  a.download = `clearcut-${Date.now()}.png`;
  a.click();
});

// ——— Core logic ———

async function handleFile(file) {
  // Show workspace, hide upload
  uploadZone.classList.add("hidden");
  workspace.classList.remove("hidden");

  // Reset result area
  resultImg.classList.add("hidden");
  resultPlaceholder.classList.remove("hidden");
  downloadBtn.disabled = true;
  progressFill.style.width = "0%";
  statusText.textContent = "Loading image…";
  spinner.style.display = "block";

  // Clean previous URLs
  if (originalObjectUrl) URL.revokeObjectURL(originalObjectUrl);
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  currentResultBlob = null;

  // Show original
  originalObjectUrl = URL.createObjectURL(file);
  originalImg.src = originalObjectUrl;

  try {
    statusText.textContent = "Starting…";
    progressFill.style.width = "5%";

    const blob = await removeBackground(file, config);

    // Success
    currentResultBlob = blob;
    currentObjectUrl = URL.createObjectURL(blob);
    resultImg.src = currentObjectUrl;
    resultImg.classList.remove("hidden");
    resultPlaceholder.classList.add("hidden");
    downloadBtn.disabled = false;
    progressFill.style.width = "100%";
  } catch (err) {
    console.error(err);
    statusText.textContent = "Something went wrong. Try another image.";
    spinner.style.display = "none";
    progressFill.style.width = "0%";
  }
}

function reset() {
  workspace.classList.add("hidden");
  uploadZone.classList.remove("hidden");
  fileInput.value = "";
  if (originalObjectUrl) {
    URL.revokeObjectURL(originalObjectUrl);
    originalObjectUrl = null;
  }
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
  currentResultBlob = null;
  resultImg.src = "";
  originalImg.src = "";
  downloadBtn.disabled = true;
}
