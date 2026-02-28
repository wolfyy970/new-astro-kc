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

/**
 * Returns a list of hotspot keys that are used more than once.
 */
export function findDuplicateHotspots(obj: unknown): string[] {
    const keyCounts = new Map<string, number>();
    const hotspotRegex = /<hotspot key="([^"]+)">/g;

    function countHotspots(o: unknown) {
        if (typeof o === 'string') {
            let match;
            while ((match = hotspotRegex.exec(o)) !== null) {
                const key = match[1];
                keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
            }
        } else if (Array.isArray(o)) {
            o.forEach(countHotspots);
        } else if (typeof o === 'object' && o !== null) {
            Object.values(o).forEach(countHotspots);
        }
    }

    countHotspots(obj);

    return Array.from(keyCounts.entries())
        .filter(([_, count]) => count > 1)
        .map(([key, _]) => key);
}
