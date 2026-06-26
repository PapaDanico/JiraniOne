#!/usr/bin/env node
// Postinstall guard.
//
// Background: Render is running `npm install --omit=dev` as the build
// command (a dashboard override that we can't fix from source). With dev
// deps omitted, the start command (`node dist/server/index.js`) crashes
// because the dist artifact was never built — vite and esbuild are
// effectively missing.
//
// This script forces the build to run during `npm install` *only* when
// we detect we're on Render (or when the caller explicitly opts in via
// BUILD_ON_INSTALL=1). Local developers running `npm install` to add a
// package don't have to sit through a Vite build.
//
// Pair this with the deps shuffle in package.json that moves the build
// toolchain (vite/esbuild/etc.) from devDependencies to dependencies, so
// that `--omit=dev` still installs them.

import { existsSync } from "node:fs";
import { execSync } from "node:child_process";

const onRender = process.env.RENDER === "true";
const explicit = process.env.BUILD_ON_INSTALL === "1";
const distMissing = !existsSync("dist/server/index.js");

if (!onRender && !explicit) {
  // Local install — silent no-op. Devs invoke `npm run build` themselves.
  process.exit(0);
}

if (!distMissing && process.env.FORCE_REBUILD !== "1") {
  console.log(
    "[postinstall] dist/server/index.js already present — skipping rebuild.",
  );
  process.exit(0);
}

console.log("[postinstall] Building (Render deploy detected)…");
try {
  execSync("npm run build", { stdio: "inherit" });
} catch (err) {
  console.error("[postinstall] Build failed:", err.message ?? err);
  process.exit(1);
}
