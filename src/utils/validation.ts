import type { ResumeData } from '../types/content.ts';

/**
 * Recursively find all <hotspot> keys in any string in a JSON-like object.
 */
export function extractHotspotKeys(obj: unknown): Set<string> {
    const foundKeys = new Set<string>();
    const hotspotRegex = /<hotspot key="([^"]+)">/g;

    function findHotspots(o: unknown) {
        if (typeof o === 'string') {
            let match;
            while ((match = hotspotRegex.exec(o)) !== null) {
                foundKeys.add(match[1]);
            }
        } else if (Array.isArray(o)) {
            o.forEach(findHotspots);
        } else if (typeof o === 'object' && o !== null) {
            Object.values(o).forEach(findHotspots);
        }
    }

    findHotspots(obj);
    return foundKeys;
}
