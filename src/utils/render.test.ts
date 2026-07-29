import { describe, it, expect } from "vitest";
import {
  createHotspotRenderer,
  markVariant,
  MARK_VARIANT_COUNT,
} from "./render";
import { SEL_HOTSPOT, ID_POPOVER } from "../scripts/constants";

const HOTSPOT_CLASS = SEL_HOTSPOT.replace(/^\./, "");
const renderHotspots = (
  text: string,
  destinations: Record<string, { link?: string }> = {},
) => createHotspotRenderer(destinations)(text);

describe("renderHotspots", () => {
  it("should leave marginalia-only controls free of redundant icons", () => {
    const input = 'This is a <hotspot key="test">hotspot</hotspot>.';
    const output = renderHotspots(input);
    expect(output).toMatch(
      new RegExp(
        `<span class="${HOTSPOT_CLASS} hs-mark-\\d" data-popover="test"`,
      ),
    );
    expect(output).not.toContain('class="hotspot-ref"');
    expect(output).not.toContain("data-hint");
    expect(output).not.toContain("data-folio");
  });

  it("should use the class name derived from SEL_HOTSPOT constant", () => {
    const output = renderHotspots('<hotspot key="x">text</hotspot>');
    expect(output).toContain(`class="${HOTSPOT_CLASS} `);
  });

  it("should use the ID from ID_POPOVER constant for aria-controls", () => {
    const output = renderHotspots('<hotspot key="x">text</hotspot>');
    expect(output).toContain(`aria-controls="${ID_POPOVER}"`);
  });

  it("should handle multiple hotspots", () => {
    const input =
      '<hotspot key="one">One</hotspot> and <hotspot key="two">Two</hotspot>.';
    const output = renderHotspots(input);
    expect(output).toContain('data-popover="one"');
    expect(output).toContain('data-popover="two"');
  });

  it("should return original text if no hotspots are present", () => {
    const input = "No hotspots here.";
    const output = renderHotspots(input);
    expect(output).toBe(input);
  });

  it("output spans should have correct accessibility attributes", () => {
    const output = renderHotspots('<hotspot key="k">label</hotspot>');
    expect(output).toContain('tabindex="0"');
    expect(output).toContain('role="button"');
    expect(output).toContain('aria-label="label. Marginalia."');
    expect(output).toContain('aria-expanded="false"');
  });

  it("should hide the visual marker from assistive tech", () => {
    const output = renderHotspots('<hotspot key="k">label</hotspot>', {
      k: { link: "/case-study" },
    });
    expect(output).toContain('data-hint="Case study" aria-hidden="true"');
  });

  it("should add the case-study marker when a deeper page is available", () => {
    const output = renderHotspots('<hotspot key="project">Project</hotspot>', {
      project: { link: "/project" },
    });
    expect(output).toContain('class="hotspot-ref"');
    expect(output).toContain('data-hint="Case study"');
    expect(output).toContain('aria-label="Project. Case study available."');
  });

  it("should escape quotation marks in the accessible label", () => {
    const output = renderHotspots(
      '<hotspot key="quoted">CNN "Magic Wall"</hotspot>',
    );
    expect(output).toContain(
      'aria-label="CNN &quot;Magic Wall&quot;. Marginalia."',
    );
  });
});

describe("marker variance", () => {
  it("assigns a stroke variant class to every hotspot", () => {
    const output = renderHotspots('<hotspot key="merger">term</hotspot>');
    expect(output).toMatch(/class="hotspot hs-mark-[1-6]"/);
  });

  it("is deterministic — same key, same stroke, across renders", () => {
    const a = renderHotspots('<hotspot key="delta">Delta</hotspot>');
    const b = renderHotspots('<hotspot key="delta">Delta</hotspot>');
    expect(a).toBe(b);
  });

  it("marks project-backed terms with the green ink family", () => {
    const output = renderHotspots('<hotspot key="k">label</hotspot>', {
      k: { link: "/truist" },
    });
    expect(output).toMatch(/class="hotspot hs-mark-\d hs-project"/);
  });

  it("keeps marginalia-only terms in the yellow ink family", () => {
    const output = renderHotspots('<hotspot key="k">label</hotspot>');
    expect(output).not.toContain("hs-project");
  });

  it("stays within the declared variant range for every real key shape", () => {
    const keys = [
      "gpc-revenue",
      "bolt",
      "agentic",
      "merger",
      "truist-products",
      "delta",
      "clients",
      "upwave",
      "a",
      "long-key-with-many-segments-and-length",
    ];
    for (const key of keys) {
      const v = markVariant(key);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(MARK_VARIANT_COUNT);
    }
  });

  it("spreads variants across the real popover inventory", () => {
    // The point of the system: neighbouring terms shouldn't all share one
    // stroke. The real key set must land in at least three of the six shapes.
    const keys = [
      "gpc-revenue",
      "bolt",
      "agentic",
      "merger",
      "truist-products",
      "delta",
      "clients",
      "upwave",
    ];
    const distinct = new Set(keys.map(markVariant));
    expect(distinct.size).toBeGreaterThanOrEqual(3);
  });
});

describe("createHotspotRenderer", () => {
  it("should preserve destination semantics across separate calls", () => {
    const render = createHotspotRenderer({
      a: { link: "/a" },
      b: {},
    });
    const first = render('<hotspot key="a">A</hotspot>');
    const second = render('<hotspot key="b">B</hotspot>');
    expect(first).toContain('class="hotspot-ref"');
    expect(second).not.toContain('class="hotspot-ref"');
  });
});
