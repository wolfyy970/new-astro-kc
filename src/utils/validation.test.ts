import { describe, it, expect } from 'vitest';
import { extractHotspotKeys } from './validation';

describe('extractHotspotKeys', () => {
    it('should extract single hotspot key from a string', () => {
        const input = 'Hello <hotspot key="test">world</hotspot>';
        const keys = extractHotspotKeys(input);
        expect(keys.has('test')).toBe(true);
        expect(keys.size).toBe(1);
    });

    it('should extract multiple unique hotspot keys from a string', () => {
        const input = '<hotspot key="one">One</hotspot> and <hotspot key="two">Two</hotspot>';
        const keys = extractHotspotKeys(input);
        expect(keys.has('one')).toBe(true);
        expect(keys.has('two')).toBe(true);
        expect(keys.size).toBe(2);
    });

    it('should extract keys from nested objects and arrays', () => {
        const input = {
            summary: 'This is <hotspot key="sum">summary</hotspot>',
            details: [
                'Item with <hotspot key="i1">key1</hotspot>',
                { text: 'Nested <hotspot key="i2">key2</hotspot>' }
            ]
        };
        const keys = extractHotspotKeys(input);
        expect(keys.has('sum')).toBe(true);
        expect(keys.has('i1')).toBe(true);
        expect(keys.has('i2')).toBe(true);
        expect(keys.size).toBe(3);
    });

    it('should handle duplicates by returning a unique set', () => {
        const input = '<hotspot key="dup">One</hotspot> <hotspot key="dup">Two</hotspot>';
        const keys = extractHotspotKeys(input);
        expect(keys.has('dup')).toBe(true);
        expect(keys.size).toBe(1);
    });

    it('should return an empty set if no hotspots are found', () => {
        const input = 'No hotspots here';
        const keys = extractHotspotKeys(input);
        expect(keys.size).toBe(0);
    });
});
