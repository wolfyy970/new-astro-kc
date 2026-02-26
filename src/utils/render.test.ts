import { describe, it, expect } from 'vitest';
import { renderHotspots } from './render';

describe('renderHotspots', () => {
  it('should convert hotspot tags to span elements', () => {
    const input = 'This is a <hotspot key="test">hotspot</hotspot>.';
    const output = renderHotspots(input);
    expect(output).toBe('This is a <span class="hotspot" data-popover="test" tabindex="0" role="button" aria-expanded="false" aria-controls="popover">hotspot</span>.');
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
});
