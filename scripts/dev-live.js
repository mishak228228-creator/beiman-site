#!/usr/bin/env node
"use strict";

const { spawn } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });
const projectRoot = path.resolve(__dirname, "..");

const processes = [];
let shuttingDown = false;

function startProcess(name, command, args, options = {}) {
  const { fatalOnExit = true } = options;
  const child = spawn(command, args, {
    stdio: "pipe",
    cwd: projectRoot,
    env: process.env,
    windowsHide: true,
  });

  child.stdout.on("data", (chunk) => {
    process.stdout.write(`[${name}] ${chunk}`);
  });

  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[${name}] ${chunk}`);
  });

  child.on("exit", (code) => {
    if (shuttingDown) return;
    const exitCode = typeof code === "number" ? code : 0;
    console.error(`[${name}] exited with code ${exitCode}`);
    if (fatalOnExit) {
      shutdown(exitCode || 1);
    }
  });

  child.on("error", (error) => {
    if (shuttingDown) return;
    console.error(`[${name}] failed to start: ${error.message}`);
    shutdown(1);
  });

  processes.push(child);
  return child;
}

function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", (error) => {
      if (error && error.code === "EADDRINUSE") {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    server.once("listening", () => {
      server.close(() => resolve(false));
    });
    // Intentionally no host: this catches conflicts with IPv4/IPv6 bindings on Windows.
    server.listen(port);
  });
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of processes) {
    if (!child.killed) {
      try {
        child.kill("SIGINT");
      } catch {
        // Ignore kill errors.
      }
    }
  }
  setTimeout(() => process.exit(exitCode), 250);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

console.log("Starting live dev mode (server + render auto-deploy watcher)...");
console.log("Press Ctrl+C to stop both processes.");

async function main() {
  const configuredPort = Number(process.env.PORT || 3000);
  if (Number.isFinite(configuredPort) && configuredPort > 0) {
    const busy = await isPortInUse(configuredPort);
    if (busy) {
      console.warn(`[server] Port ${configuredPort} is already in use. Skipping local server start.`);
      console.warn("[server] Keep existing server running, deploy watcher will continue working.");
    } else {
      startProcess("server", process.execPath, ["server.js"], { fatalOnExit: false });
    }
  } else {
    startProcess("server", process.execPath, ["server.js"], { fatalOnExit: false });
  }

  if (process.env.RENDER_DEPLOY_HOOK_URL) {
    startProcess("deploy", process.execPath, ["scripts/render-auto-deploy.js"]);
  } else {
    console.warn("[deploy] RENDER_DEPLOY_HOOK_URL is not set, deploy watcher is skipped.");
    console.warn("[deploy] Add it to .env to enable automatic Render deploy.");
  }
}

void main();
