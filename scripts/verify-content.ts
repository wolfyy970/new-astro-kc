import { verifyContent } from "./content-verifier.ts";

console.log("🔍 Starting Content Integrity Verification...");

const result = verifyContent(process.cwd());

console.log("📋 Validating schemas...");
console.log(`📡 Checking ${result.stats.hotspotCount} unique hotspots...`);
console.log("🖼️ Verifying image paths...");
console.log("🖼️ Verifying case study image paths...");

if (result.errors.length > 0) {
  console.error("\n❌ Integrity Verification Failed:");
  result.errors.forEach((error) => console.error(`   - ${error}`));
  process.exitCode = 1;
} else {
  console.log("\n✅ Content Integrity Verified. All systems whole.");
}
