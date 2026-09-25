import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type JsonObject = Record<string, unknown>;

const readRepositoryJson = (relativePath: string): JsonObject =>
  JSON.parse(
    readFileSync(new URL(relativePath, import.meta.url), "utf8"),
  ) as JsonObject;

const asObject = (value: unknown): JsonObject | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : undefined;

function findConditionalBranch(
  node: unknown,
  target: string,
): JsonObject | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findConditionalBranch(child, target);
      if (found) return found;
    }
    return undefined;
  }

  const object = asObject(node);
  if (!object) return undefined;

  const condition = asObject(object.if);
  const conditionProperties = asObject(condition?.properties);
  const typeCondition = asObject(conditionProperties?.type);
  if (typeCondition?.const === target) return asObject(object.then);

  for (const child of Object.values(object)) {
    const found = findConditionalBranch(child, target);
    if (found) return found;
  }
  return undefined;
}

describe("VS Code case-study authoring schema", () => {
  const settings = readRepositoryJson("../../.vscode/settings.json");
  const schema = readRepositoryJson("../../.vscode/case-study.schema.json");

  it("registers the complete case-study file inventory", () => {
    const mappings = settings["json.schemas"] as Array<{
      fileMatch: string[];
      url: string;
    }>;
    const caseStudyMapping = mappings.find(
      ({ url }) => url === "./.vscode/case-study.schema.json",
    );

    expect(caseStudyMapping?.fileMatch).toContain(
      "/src/content/case-studies/bolt.json",
    );
  });

  it("matches runtime product-hero mark requirements", () => {
    const properties = asObject(asObject(schema.properties)?.hero);
    const heroProperties = asObject(properties?.properties);
    const composition = asObject(heroProperties?.composition);

    expect(composition?.enum).toEqual(["immersive", "product"]);
    expect(asObject(heroProperties?.brandMark)?.pattern).toBe("^/images/.*");
    expect(asObject(heroProperties?.brandMarkAlt)?.minLength).toBe(1);
    expect(properties?.dependencies).toEqual({
      brandMark: ["brandMarkAlt"],
      brandMarkAlt: ["brandMark"],
    });
    expect(properties?.allOf).toEqual([
      {
        if: {
          required: ["composition"],
          properties: { composition: { const: "product" } },
        },
        then: { required: ["brandMark", "brandMarkAlt"] },
      },
    ]);
  });

  it("exposes WebVTT paths for native video sections", () => {
    const videoBranch = findConditionalBranch(
      asObject(schema.definitions)?.Section,
      "video",
    );
    const captions = asObject(asObject(videoBranch?.properties)?.captions);

    expect(captions?.type).toBe("string");
    expect(captions?.pattern).toBe("^/");
  });
});
