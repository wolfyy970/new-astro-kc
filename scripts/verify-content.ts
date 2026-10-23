import path from "node:path";
import { verifyContent } from "./content-verifier.ts";
import { checkDisplayImages } from "./generate-display-images.ts";

console.log("🔍 Starting Content Integrity Verification...");

const result = verifyContent(process.cwd());
result.errors.push(
  ...(await checkDisplayImages(path.join(process.cwd(), "public"))),
);

console.log("📋 Validating schemas...");
console.log(`📡 Checking ${result.stats.hotspotCount} unique hotspots...`);
console.log("🖼️ Verifying résumé, project, and case-study media paths...");
console.log("📄 Verifying the downloadable résumé...");
console.log("🪟 Verifying display-image variants...");

if (result.errors.length > 0) {
  console.error("\n❌ Integrity Verification Failed:");
  result.errors.forEach((error) => console.error(`   - ${error}`));
  process.exitCode = 1;
} else {
  console.log("\n✅ Content Integrity Verified. All systems whole.");
}
