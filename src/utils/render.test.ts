import { describe, it, expect } from "vitest";
import { renderHotspots, createHotspotRenderer } from "./render";
import { SEL_HOTSPOT, ID_POPOVER } from "../scripts/constants";

const HOTSPOT_CLASS = SEL_HOTSPOT.replace(/^\./, "");

describe("renderHotspots", () => {
  it("should convert hotspot tags to numbered span elements", () => {
    const input = 'This is a <hotspot key="test">hotspot</hotspot>.';
    const output = renderHotspots(input);
    expect(output).toBe(
      `This is a <span class="${HOTSPOT_CLASS}" data-popover="test" data-folio="1"` +
        ` tabindex="0" role="button" aria-expanded="false" aria-controls="${ID_POPOVER}">` +
        `hotspot<sup class="hotspot-ref" aria-hidden="true">1</sup></span>.`,
    );
  });

  it("should use the class name derived from SEL_HOTSPOT constant", () => {
    const output = renderHotspots('<hotspot key="x">text</hotspot>');
    expect(output).toContain(`class="${HOTSPOT_CLASS}"`);
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
    expect(output).toContain('aria-expanded="false"');
  });

  it("should hide the decorative folio marker from assistive tech", () => {
    const output = renderHotspots('<hotspot key="k">label</hotspot>');
    expect(output).toContain(
      '<sup class="hotspot-ref" aria-hidden="true">1</sup>',
    );
  });

  it("should number hotspots sequentially within one string", () => {
    const output = renderHotspots(
      '<hotspot key="a">A</hotspot> <hotspot key="b">B</hotspot> <hotspot key="c">C</hotspot>',
    );
    expect(output).toContain('data-folio="1"');
    expect(output).toContain('data-folio="2"');
    expect(output).toContain('data-folio="3"');
  });
});

describe("createHotspotRenderer", () => {
  it("should continue the folio sequence across separate calls", () => {
    const render = createHotspotRenderer();
    const first = render('<hotspot key="a">A</hotspot>');
    const second = render('<hotspot key="b">B</hotspot>');
    const third = render('<hotspot key="c">C</hotspot>');

    expect(first).toContain('data-folio="1"');
    expect(second).toContain('data-folio="2"');
    expect(third).toContain('data-folio="3"');
  });

  it("should give each renderer its own independent sequence", () => {
    // Guards the server-rendering hazard: a module-scoped counter would leak
    // across requests and the next visitor would start mid-sequence.
    const a = createHotspotRenderer();
    const b = createHotspotRenderer();

    a('<hotspot key="x">x</hotspot>');
    a('<hotspot key="y">y</hotspot>');

    expect(b('<hotspot key="z">z</hotspot>')).toContain('data-folio="1"');
  });

  it("renderHotspots should always start a fresh sequence", () => {
    renderHotspots('<hotspot key="a">A</hotspot>');
    expect(renderHotspots('<hotspot key="b">B</hotspot>')).toContain(
      'data-folio="1"',
    );
  });
});
