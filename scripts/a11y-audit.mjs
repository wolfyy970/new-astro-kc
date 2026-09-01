import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import puppeteer from "puppeteer";
import { AxePuppeteer } from "@axe-core/puppeteer";

const BASE = "http://localhost:4321";
const PAGES = [
  "/login",
  "/",
  "/bolt",
  "/truist",
  "/upwave",
  "/sparks-grove",
  "/two-way-tv",
  "/felix",
  "/fusionfall",
  "/magic-wall",
  "/armchair-manager",
];

function readPassword() {
  const env = readFileSync(".env.local", "utf8");
  const match = env.match(/^SITE_PASSWORD=(.*)$/m);
  if (!match?.[1]) {
    throw new Error("SITE_PASSWORD missing from .env.local");
  }
  return match[1].trim();
}

const password = readPassword();
const browser = await puppeteer.launch({ headless: true });
const summary = [];

for (const path of PAGES) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  if (path !== "/login") {
    await page.setCookie({
      name: "portfolio_session",
      value: password,
      domain: "localhost",
      path: "/",
    });
  }

  const url = `${BASE}${path}`;
  try {
    await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
  } catch {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  const title = await page.title();
  const axe = new AxePuppeteer(page)
    .exclude("iframe")
    .withTags([
      "wcag2a",
      "wcag2aa",
      "wcag21a",
      "wcag21aa",
      "wcag22aa",
      "best-practice",
    ]);
  const results = await axe.analyze();

  const violations = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    tags: v.tags,
    description: v.description,
    help: v.help,
    helpUrl: v.helpUrl,
    nodes: v.nodes.map((n) => ({
      target: n.target,
      html: n.html.slice(0, 280),
      failureSummary: n.failureSummary,
    })),
  }));

  const incomplete = results.incomplete.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.length,
  }));

  summary.push({
    path,
    url,
    title,
    violationCount: results.violations.length,
    nodeCount: violations.reduce((n, v) => n + v.nodes.length, 0),
    violations,
    incomplete,
  });

  console.log(
    `${path.padEnd(20)} ${results.violations.length === 0 ? "PASS" : "FAIL"} (${results.violations.length} rules / ${violations.reduce((n, v) => n + v.nodes.length, 0)} nodes, ${incomplete.length} needs-review) — ${title}`,
  );

  await page.close();
}

await browser.close();

mkdirSync(".tmp", { recursive: true });
writeFileSync(".tmp/a11y-audit.json", JSON.stringify(summary, null, 2));

const failed = summary.filter((r) => r.violationCount > 0);
console.log("\n--- Summary ---");
console.log(`Pages audited: ${summary.length}`);
console.log(`Clean pages: ${summary.length - failed.length}`);
console.log(`Pages with violations: ${failed.length}`);

if (failed.length) {
  for (const page of failed) {
    console.log(`\n${page.path}`);
    for (const v of page.violations) {
      console.log(
        `  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nodes)`,
      );
      for (const node of v.nodes.slice(0, 4)) {
        console.log(`    → ${node.target.join(" ")}`);
      }
      if (v.nodes.length > 4) {
        console.log(`    … +${v.nodes.length - 4} more`);
      }
    }
  }
}

console.log("\n--- Needs review (incomplete) ---");
for (const page of summary) {
  if (!page.incomplete.length) continue;
  console.log(`\n${page.path}`);
  for (const v of page.incomplete) {
    console.log(`  [${v.impact ?? "n/a"}] ${v.id}: ${v.help} (${v.nodes} nodes)`);
  }
}

if (failed.length) process.exitCode = 1;
