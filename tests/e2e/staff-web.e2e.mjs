import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const CLIENT_DIR = path.join(REPO_ROOT, "apps/staff-web/build/client");
const CHROME_PATH = process.env.CHROME_EXECUTABLE_PATH || "/home/mahdi/.local/bin/google-chrome";
const SCREENSHOT_DIR = process.env.E2E_SCREENSHOT_DIR || "";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon",
};

function startStaticServer(rootDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const reqUrl = new URL(req.url || "/", "http://127.0.0.1");
      let filePath = path.join(rootDir, decodeURIComponent(reqUrl.pathname));
      if (!filePath.startsWith(rootDir)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(rootDir, "index.html");
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
      fs.createReadStream(filePath).pipe(res);
    });
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      resolve({ server, url: `http://127.0.0.1:${addr.port}` });
    });
  });
}

async function runAxeCheck(page, routeLabel) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const critical = results.violations.filter((v) => v.impact === "critical");
  if (critical.length > 0) {
    console.error(`[AXE CRITICAL] ${routeLabel}:`, JSON.stringify(critical, null, 2));
  }
  assert.equal(critical.length, 0, `Expected 0 critical axe-core violations on ${routeLabel}, got ${critical.length}`);
  console.log(`  [axe-core] ${routeLabel}: 0 critical (${results.violations.length} total non-critical)`);
}

async function maybeScreenshot(page, name) {
  if (!SCREENSHOT_DIR) return;
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const target = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: target, fullPage: false });
  console.log(`  [screenshot] saved ${target}`);
}

async function main() {
  assert.ok(fs.existsSync(path.join(CLIENT_DIR, "index.html")), `Missing built client at ${CLIENT_DIR}`);
  assert.ok(fs.existsSync(CHROME_PATH), `Missing Chromium binary at ${CHROME_PATH}`);

  const { server, url: baseUrl } = await startStaticServer(CLIENT_DIR);
  const consoleErrors = [];
  const pageErrors = [];
  const externalRequests = [];

  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: "fa-IR",
    });
    const page = await context.newPage();

    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => {
      pageErrors.push(String(err));
    });
    page.on("request", (req) => {
      const u = req.url();
      if (!u.startsWith("http://127.0.0.1:") && !u.startsWith("data:") && !u.startsWith("blob:")) {
        externalRequests.push(u);
      }
    });

    // 1. Login Page (explicit demo mode + RTL + Persian)
    console.log("1. Navigating to /login ...");
    await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
    const htmlMeta = await page.evaluate(() => ({
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
    }));
    assert.equal(htmlMeta.lang, "fa-IR", "html lang must be fa-IR");
    assert.equal(htmlMeta.dir, "rtl", "html dir must be rtl");

    await page.getByText(/محیط نمایشی — داده آزمایشی/).waitFor({ timeout: 5000 });
    await page.getByRole("button", { name: /دکتر علیرضا مرادی/ }).click();
    await page.locator('button[type="submit"]').click();

    // 2. Overview Dashboard (Light + Dark + axe-core)
    console.log("2. Verifying /overview (Light & Dark + axe-core) ...");
    await page.waitForURL("**/overview", { timeout: 8000 });
    await page.getByRole("heading", { name: "داشبورد کلینیک" }).waitFor({ timeout: 8000 });
    await maybeScreenshot(page, "01-overview-light");
    await runAxeCheck(page, "/overview (light)");

    // Toggle Dark Theme via header theme button
    const themeToggle = page.locator("header button[aria-label*='تم']").first();
    await themeToggle.click();
    const darkAttr = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    assert.equal(darkAttr, "dark", "Theme toggle must set data-theme=dark");
    await page.waitForTimeout(250);
    await maybeScreenshot(page, "02-overview-dark");
    await themeToggle.click();
    await page.waitForTimeout(200);

    // 3. Diagnostics Active CNV Study + OCT Viewer + Auxiliary Grad-CAM Guard (via SPA navigation)
    console.log("3. Verifying /diagnostics active CNV study & OCT viewer ...");
    await page.locator('aside a[href="/diagnostics"]').first().click();
    await page.waitForURL("**/diagnostics", { timeout: 8000 });
    await page.locator('a[href="/diagnostics/66666666-6666-4666-8666-666666666601"]').first().click();
    await page.waitForURL("**/diagnostics/66666666-6666-4666-8666-666666666601", { timeout: 8000 });
    await page.getByText(/کف فوریت قطعی فعال است/).waitFor({ timeout: 8000 });
    await page.getByRole("tab", { name: /OCT \/ OCT-A/ }).click();
    await page.locator('svg[aria-label="ماسک سگمنتیشن اولیه"]').waitFor({ timeout: 8000 });

    const gradCamBefore = await page
      .locator('svg[aria-label="راهنمای توجه مدل — غیرقابل استفاده به‌جای سگمنتیشن دقیق"]')
      .count();
    assert.equal(gradCamBefore, 0, "Auxiliary Grad-CAM must be OFF by default");

    const gradCamCheckbox = page.getByRole("checkbox", {
      name: /راهنمای توجه مدل — غیرقابل استفاده به‌جای سگمنتیشن دقیق/,
    });
    await gradCamCheckbox.check();
    await page
      .locator('svg[aria-label="راهنمای توجه مدل — غیرقابل استفاده به‌جای سگمنتیشن دقیق"]')
      .waitFor({ timeout: 5000 });
    await maybeScreenshot(page, "03-oct-viewer");
    await runAxeCheck(page, "/diagnostics/:studyId (OCT viewer)");

    // 4. Patient 360 (via SPA navigation)
    console.log("4. Verifying /patients & Patient 360 ...");
    await page.locator('aside a[href="/patients"]').first().click();
    await page.waitForURL("**/patients", { timeout: 8000 });
    await page.locator('a[href="/patients/44444444-4444-4444-8444-444444444401"]').first().click();
    await page.waitForURL("**/patients/44444444-4444-4444-8444-444444444401", { timeout: 8000 });
    await page.getByText(/چشم راست \(OD\)/).first().waitFor({ timeout: 8000 });
    await maybeScreenshot(page, "04-patient-360");
    await runAxeCheck(page, "/patients/:patientId");

    // 5. Post-op Care Operations & Print+Phone Queue
    console.log("5. Verifying /care and /care/print-phone ...");
    await page.locator('aside a[href="/care"]').first().click();
    await page.waitForURL("**/care", { timeout: 8000 });
    await page.locator('a[href="/care/print-phone"]').first().click();
    await page.waitForURL("**/care/print-phone", { timeout: 8000 });

    // 6. Triage Queue
    console.log("6. Verifying /triage ...");
    await page.locator('aside a[href="/triage"]').first().click();
    await page.waitForURL("**/triage", { timeout: 8000 });
    await page.getByRole("heading", { name: /صف یکپارچه تریاژ و هشدارها/ }).waitFor({ timeout: 8000 });
    await maybeScreenshot(page, "05-triage-queue");
    await runAxeCheck(page, "/triage");

    // 7. Remote Vision Monitoring & Pilot Scorecard Analytics at 1600x1000
    console.log("7. Verifying /monitoring and /analytics (1600x1000) ...");
    await page.locator('aside a[href="/monitoring"]').first().click();
    await page.waitForURL("**/monitoring", { timeout: 8000 });

    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.locator('aside a[href="/analytics"]').first().click();
    await page.waitForURL("**/analytics", { timeout: 8000 });
    await page.getByRole("heading", { level: 2, name: /کارت امتیاز پایلوت/ }).waitFor({ timeout: 8000 });
    await runAxeCheck(page, "/analytics (1600x1000)");

    // 8. Verify zero tokens / PHI in storage and zero external CDN requests
    const storageDump = await page.evaluate(() => ({
      local: JSON.stringify(window.localStorage),
      session: JSON.stringify(window.sessionStorage),
    }));
    assert.ok(!/token|Bearer|dev-oidc|فاطمه|مرادی/i.test(storageDump.local), "No auth tokens or PHI in localStorage");
    assert.equal(storageDump.session, "{}", "sessionStorage must remain empty");
    assert.equal(externalRequests.length, 0, `External CDN requests forbidden: ${externalRequests.join(", ")}`);
    assert.equal(consoleErrors.length, 0, `Console errors found: ${consoleErrors.join(" | ")}`);
    assert.equal(pageErrors.length, 0, `Uncaught page errors found: ${pageErrors.join(" | ")}`);

    console.log("ALL STAFF-WEB E2E + AXE-CORE WCAG 2.2 AA CHECKS PASSED!");
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
