#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const projectRoot = path.resolve(__dirname, "..");
const hookUrl = process.env.RENDER_DEPLOY_HOOK_URL || "";
const debounceMs = Number(process.env.RENDER_DEPLOY_DEBOUNCE_MS || 2500);
const requestTimeoutMs = Number(process.env.RENDER_DEPLOY_TIMEOUT_MS || 15000);
const ignoredPathRules = String(
  process.env.RENDER_DEPLOY_IGNORE_PATHS ||
    "data/orders.json,data/orders.backup.json,data/orders.json.lock,.env,.env.local,.env.production,.env.development"
)
  .split(",")
  .map((item) => item.trim().replace(/\\/g, "/"))
  .filter(Boolean);

const ignoredDirectories = new Set([
  ".git",
  ".idea",
  ".vscode",
  "node_modules",
  "coverage",
  "dist",
  "build",
  "tmp",
]);

const ignoredExtensions = new Set([
  ".log",
  ".tmp",
  ".swp",
  ".DS_Store",
]);

let deployTimer = null;
let deployInFlight = false;
let queuedTrigger = null;
let lastTriggerAt = 0;
let watchCount = 0;
const watchedDirectories = new Set();

if (!hookUrl) {
  console.error("RENDER_DEPLOY_HOOK_URL is required.");
  console.error("Set it in your shell or .env and rerun: npm run auto-deploy");
  process.exit(1);
}

if (typeof fetch !== "function") {
  console.error("Global fetch is unavailable in current Node.js version.");
  process.exit(1);
}

let parsedHookUrl;
try {
  parsedHookUrl = new URL(hookUrl);
  if (parsedHookUrl.protocol !== "https:") {
    throw new Error("RENDER_DEPLOY_HOOK_URL must use https");
  }
} catch (error) {
  console.error(`Invalid RENDER_DEPLOY_HOOK_URL: ${error.message}`);
  process.exit(1);
}

function normalizeRelative(absolutePath) {
  return path.relative(projectRoot, absolutePath).replace(/\\/g, "/");
}

function isIgnoredByRule(relativePath) {
  const normalized = relativePath.replace(/\\/g, "/");
  return ignoredPathRules.some((rule) => {
    if (rule.endsWith("/")) return normalized.startsWith(rule);
    return normalized === rule || normalized.endsWith(`/${rule}`);
  });
}

function shouldIgnore(absolutePath) {
  const relativePath = normalizeRelative(absolutePath);
  if (relativePath.startsWith("..")) return true;
  if (relativePath === "") return false;
  if (isIgnoredByRule(relativePath)) return true;
  const parts = relativePath.split("/");
  if (parts.some((part) => ignoredDirectories.has(part))) return true;
  const ext = path.extname(absolutePath);
  return ignoredExtensions.has(ext);
}

function scheduleDeploy(reason) {
  queuedTrigger = reason;
  if (deployTimer) clearTimeout(deployTimer);
  deployTimer = setTimeout(() => {
    deployTimer = null;
    triggerDeploy(queuedTrigger || "unknown");
    queuedTrigger = null;
  }, Number.isFinite(debounceMs) ? Math.max(1000, debounceMs) : 2500);
}

async function triggerDeploy(reason) {
  if (deployInFlight) {
    scheduleDeploy(reason);
    return;
  }

  deployInFlight = true;
  const now = Date.now();
  const sinceLast = lastTriggerAt ? `${Math.round((now - lastTriggerAt) / 1000)}s` : "first run";
  lastTriggerAt = now;
  const startedAt = new Date().toLocaleTimeString();

  try {
    console.log(`[${startedAt}] Deploy trigger: ${reason} (${sinceLast})`);
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), Math.max(3000, requestTimeoutMs));
    const response = await fetch(parsedHookUrl, {
      method: "POST",
      signal: abortController.signal,
    }).finally(() => clearTimeout(timeout));
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status}${body ? `: ${body.slice(0, 180)}` : ""}`);
    }
    console.log(`[${new Date().toLocaleTimeString()}] Render deploy started`);
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    console.error(`[${new Date().toLocaleTimeString()}] Deploy failed: ${message}`);
  } finally {
    deployInFlight = false;
  }
}

function watchDirectory(absoluteDir) {
  if (shouldIgnore(absoluteDir)) return;
  const normalizedDir = path.resolve(absoluteDir);
  if (watchedDirectories.has(normalizedDir)) return;
  watchedDirectories.add(normalizedDir);

  watchCount += 1;
  try {
    const watcher = fs.watch(absoluteDir, { persistent: true }, (eventType, fileName) => {
      if (!fileName) return;
      const absolutePath = path.join(absoluteDir, String(fileName));
      if (shouldIgnore(absolutePath)) return;

      // If a new directory appears, start watching it too.
      try {
        const stat = fs.statSync(absolutePath);
        if (stat.isDirectory()) {
          watchDirectory(absolutePath);
          return;
        }
      } catch {
        // File might be deleted between events.
      }

      scheduleDeploy(`${eventType}: ${normalizeRelative(absolutePath)}`);
    });

    watcher.on("error", (err) => {
      console.error(`Watcher error in ${absoluteDir}: ${err.message}`);
    });
  } catch (err) {
    console.error(`Cannot watch directory ${absoluteDir}: ${err.message}`);
  }

  let entries = [];
  try {
    entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
  } catch (err) {
    console.error(`Cannot read directory ${absoluteDir}: ${err.message}`);
    return;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    watchDirectory(path.join(absoluteDir, entry.name));
  }
}

console.log("Render auto-deploy watcher started");
console.log(`Project: ${projectRoot}`);
console.log(`Debounce: ${debounceMs}ms`);
console.log(`Request timeout: ${Math.max(3000, requestTimeoutMs)}ms`);
if (ignoredPathRules.length) {
  console.log(`Ignored paths: ${ignoredPathRules.join(", ")}`);
}
console.log("Waiting for file changes...");

watchDirectory(projectRoot);
console.log(`Watching directories: ${watchCount}`);

process.on("SIGINT", () => {
  console.log("\nStopped by user");
  process.exit(0);
});

process.on("SIGTERM", () => {
  process.exit(0);
});
