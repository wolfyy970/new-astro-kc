import { describe, it, expect } from 'vitest';
import { renderHotspots } from './render';
import { SEL_HOTSPOT, ID_POPOVER } from '../scripts/constants';

const HOTSPOT_CLASS = SEL_HOTSPOT.replace(/^\./, '');

describe('renderHotspots', () => {
  it('should convert hotspot tags to span elements', () => {
    const input = 'This is a <hotspot key="test">hotspot</hotspot>.';
    const output = renderHotspots(input);
    expect(output).toBe(`This is a <span class="${HOTSPOT_CLASS}" data-popover="test" tabindex="0" role="button" aria-expanded="false" aria-controls="${ID_POPOVER}">hotspot</span>.`);
  });

  it('should use the class name derived from SEL_HOTSPOT constant', () => {
    const output = renderHotspots('<hotspot key="x">text</hotspot>');
    expect(output).toContain(`class="${HOTSPOT_CLASS}"`);
  });

  it('should use the ID from ID_POPOVER constant for aria-controls', () => {
    const output = renderHotspots('<hotspot key="x">text</hotspot>');
    expect(output).toContain(`aria-controls="${ID_POPOVER}"`);
  });

  it('should handle multiple hotspots', () => {
    const input = '<hotspot key="one">One</hotspot> and <hotspot key="two">Two</hotspot>.';
    const output = renderHotspots(input);
    expect(output).toContain('data-popover="one"');
    expect(output).toContain('data-popover="two"');
  });

  it('should return original text if no hotspots are present', () => {
    const input = 'No hotspots here.';
    const output = renderHotspots(input);
    expect(output).toBe(input);
  });

  it('output spans should have correct accessibility attributes', () => {
    const output = renderHotspots('<hotspot key="k">label</hotspot>');
    expect(output).toContain('tabindex="0"');
    expect(output).toContain('role="button"');
    expect(output).toContain('aria-expanded="false"');
  });
});
