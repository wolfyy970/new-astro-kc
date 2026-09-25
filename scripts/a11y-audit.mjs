import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import assert from "node:assert/strict";
import puppeteer from "puppeteer";
import { AxePuppeteer } from "@axe-core/puppeteer";

const BASE = "http://localhost:4321";
const PAGES = [
  "/login",
  "/",
  "/work",
  "/projects",
  "/org-chart-studio",
  "/references",
  "/design",
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
const browserCandidates = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
].filter((candidate) => candidate && existsSync(candidate));
const browser = await puppeteer.launch({
  headless: true,
  ...(browserCandidates[0] ? { executablePath: browserCandidates[0] } : {}),
});
const summary = [];

for (const path of PAGES) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  if (path !== "/login") {
    await page.browserContext().setCookie({
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

  if (path === "/projects") {
    const projectPage = await page.evaluate(() => {
      const contentsLinks = Array.from(
        document.querySelectorAll(".projects-contents a"),
      ).map((link) => ({
        href: link.getAttribute("href"),
        label: link.textContent?.replace(/\s+/g, " ").trim(),
      }));
      const contentTargetsExist = contentsLinks.every(({ href }) =>
        href?.startsWith("#") ? Boolean(document.querySelector(href)) : false,
      );
      const screenshots = Array.from(
        document.querySelectorAll(".project-screenshots img"),
      ).map((image) => ({
        alt: image.getAttribute("alt"),
        src: image.getAttribute("src"),
      }));
      const motion = document.querySelector(".project-motion video");
      const source = motion?.querySelector("source");

      return {
        contentsLinks,
        contentTargetsExist,
        orgChartLink: document.querySelector(
          '.project-entry--org a[href="/org-chart-studio"]',
        )?.textContent,
        unreelLink: document.querySelector(
          '.project-entry--unreel a[href="https://www.unreel.recipes/"]',
        )?.textContent,
        unreelWordmark: document
          .querySelector(
            ".project-entry--unreel .project-entry-title--wordmark",
          )
          ?.textContent?.replace(/\s+/g, " ")
          .trim(),
        screenshots,
        video: motion
          ? {
              controls: motion.hasAttribute("controls"),
              muted: motion.hasAttribute("muted"),
              playsinline: motion.hasAttribute("playsinline"),
              label: motion.getAttribute("aria-label"),
              source: source?.getAttribute("src"),
              poster: motion.getAttribute("poster"),
              caption:
                motion.parentElement?.querySelector("figcaption")?.textContent,
            }
          : null,
      };
    });

    assert.deepEqual(
      projectPage.contentsLinks.map(({ href }) => href),
      ["#org-chart-studio", "#unreel-recipes", "#designer"],
      "The Projects table of contents must preserve the requested order.",
    );
    assert.ok(
      projectPage.contentTargetsExist,
      "Every Projects contents link must point to a section on the page.",
    );
    assert.match(
      projectPage.orgChartLink ?? "",
      /Explore the case study/,
      "Org Chart Studio must expose its internal case-study link.",
    );
    assert.match(
      projectPage.unreelLink ?? "",
      /Visit Unreel Recipes/,
      "Unreel Recipes must expose its live product link.",
    );
    assert.equal(projectPage.unreelWordmark, "Unreel Recipes");
    assert.equal(projectPage.screenshots.length, 4);
    assert.ok(
      projectPage.screenshots.every(({ alt, src }) => alt?.trim() && src),
      "Each Unreel Recipes screen needs a source and descriptive alternative text.",
    );
    assert.deepEqual(projectPage.video, {
      controls: true,
      muted: true,
      playsinline: true,
      label: "The Unreel Recipes pot-stirring processing animation",
      source: "/media/unreel-recipes/stirring-pot.mp4",
      poster: "/images/projects/unreel-recipes/stirring-pot-poster.webp",
      caption:
        "The pot-stirring animation plays while a recipe is being built.",
    });

    await page.setViewport({ width: 390, height: 844 });
    const mobileDocumentWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    assert.ok(
      mobileDocumentWidth <= 390,
      `The Projects page must not overflow a 390px viewport (document is ${mobileDocumentWidth}px wide).`,
    );

    await page.goto(`${BASE}/projects`, { waitUntil: "networkidle0" });
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0" }),
      page.click('.project-entry--org a[href="/org-chart-studio"]'),
    ]);
    assert.equal(
      new URL(page.url()).pathname,
      "/org-chart-studio",
      "The Org Chart Studio case-study link must navigate to its page.",
    );
    console.log(
      "Projects flow      PASS (contents, links, screens, motion, mobile, route)",
    );
  }

  if (path === "/org-chart-studio") {
    const storyPage = await page.evaluate(() => ({
      title: document.querySelector(".hero-title")?.textContent?.trim(),
      composition: document
        .querySelector(".hero")
        ?.getAttribute("data-composition"),
      logoAlt: document.querySelector(".hero-brand-mark")?.getAttribute("alt"),
      currentNavigation: document
        .querySelector('.site-nav a[aria-current="page"]')
        ?.getAttribute("href"),
    }));
    assert.deepEqual(storyPage, {
      title: "Org Chart Studio",
      composition: "product",
      logoAlt: "Org Chart Studio four-color tile mark",
      currentNavigation: "/projects",
    });
  }

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
    console.log(
      `  [${v.impact ?? "n/a"}] ${v.id}: ${v.help} (${v.nodes} nodes)`,
    );
  }
}

if (failed.length) process.exitCode = 1;
