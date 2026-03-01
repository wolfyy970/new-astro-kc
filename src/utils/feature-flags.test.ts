import { describe, it, expect, afterEach, vi } from 'vitest';
import { isCaseStudyLinkEnabled, applyFeatureFlags } from './feature-flags';
import type { PopoverMap } from '../types/content';

describe('isCaseStudyLinkEnabled', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('returns false when CASE_STUDY_LINKS is empty', () => {
        vi.stubEnv('CASE_STUDY_LINKS', '');
        expect(isCaseStudyLinkEnabled('/two-way-tv')).toBe(false);
    });

    it('returns true for a matching absolute path slug', () => {
        vi.stubEnv('CASE_STUDY_LINKS', 'two-way-tv');
        expect(isCaseStudyLinkEnabled('/two-way-tv')).toBe(true);
    });

    it('returns true for a matching bare slug (no leading slash)', () => {
        vi.stubEnv('CASE_STUDY_LINKS', 'two-way-tv');
        expect(isCaseStudyLinkEnabled('two-way-tv')).toBe(true);
    });

    it('is case-insensitive on both the env var and the path', () => {
        vi.stubEnv('CASE_STUDY_LINKS', 'Two-Way-TV');
        expect(isCaseStudyLinkEnabled('/two-way-tv')).toBe(true);
        expect(isCaseStudyLinkEnabled('/TWO-WAY-TV')).toBe(true);
    });

    it('trims whitespace around slugs in the env var', () => {
        vi.stubEnv('CASE_STUDY_LINKS', ' two-way-tv , another-slug ');
        expect(isCaseStudyLinkEnabled('/two-way-tv')).toBe(true);
        expect(isCaseStudyLinkEnabled('/another-slug')).toBe(true);
    });

    it('returns false for a slug not in the enabled list', () => {
        vi.stubEnv('CASE_STUDY_LINKS', 'two-way-tv');
        expect(isCaseStudyLinkEnabled('/some-other-page')).toBe(false);
    });

    it('returns false when CASE_STUDY_LINKS is the literal string "false"', () => {
        vi.stubEnv('CASE_STUDY_LINKS', 'false');
        expect(isCaseStudyLinkEnabled('/two-way-tv')).toBe(false);
    });

    it('returns true for any slug when CASE_STUDY_LINKS is the literal string "true"', () => {
        vi.stubEnv('CASE_STUDY_LINKS', 'true');
        expect(isCaseStudyLinkEnabled('/truist')).toBe(true);
        expect(isCaseStudyLinkEnabled('/sparks-grove')).toBe(true);
        expect(isCaseStudyLinkEnabled('/some-future-page')).toBe(true);
    });

    it('is case-insensitive for the "true" shorthand', () => {
        vi.stubEnv('CASE_STUDY_LINKS', 'TRUE');
        expect(isCaseStudyLinkEnabled('/truist')).toBe(true);
    });
});

describe('applyFeatureFlags', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('strips link and linkText from entries whose slug is not enabled', () => {
        vi.stubEnv('CASE_STUDY_LINKS', '');
        const popovers: PopoverMap = {
            bafta: { label: 'BAFTA', text: 'Won a BAFTA.', link: '/two-way-tv', linkText: 'View project →' },
        };
        const result = applyFeatureFlags(popovers);
        expect(result.bafta.link).toBeUndefined();
        expect(result.bafta.linkText).toBeUndefined();
        expect(result.bafta.label).toBe('BAFTA');
        expect(result.bafta.text).toBe('Won a BAFTA.');
    });

    it('preserves link and linkText for entries whose slug is enabled', () => {
        vi.stubEnv('CASE_STUDY_LINKS', 'two-way-tv');
        const popovers: PopoverMap = {
            bafta: { label: 'BAFTA', text: 'Won a BAFTA.', link: '/two-way-tv', linkText: 'View project →' },
        };
        const result = applyFeatureFlags(popovers);
        expect(result.bafta.link).toBe('/two-way-tv');
        expect(result.bafta.linkText).toBe('View project →');
    });

    it('does not mutate the original popovers map', () => {
        vi.stubEnv('CASE_STUDY_LINKS', '');
        const original: PopoverMap = {
            bafta: { label: 'BAFTA', text: 'Won a BAFTA.', link: '/two-way-tv', linkText: 'View project →' },
        };
        applyFeatureFlags(original);
        expect(original.bafta.link).toBe('/two-way-tv');
    });

    it('leaves entries without links untouched regardless of flag state', () => {
        vi.stubEnv('CASE_STUDY_LINKS', '');
        const popovers: PopoverMap = {
            magicwall: { label: 'CNN Magic Wall', text: 'Big screens.' },
        };
        const result = applyFeatureFlags(popovers);
        expect(result.magicwall).toEqual(popovers.magicwall);
    });

    it('preserves all links when CASE_STUDY_LINKS is "true"', () => {
        vi.stubEnv('CASE_STUDY_LINKS', 'true');
        const popovers: PopoverMap = {
            bafta: { label: 'BAFTA', text: 'Won a BAFTA.', link: '/two-way-tv', linkText: 'View →' },
            other: { label: 'Other', text: 'Other text.', link: '/some-page', linkText: 'View →' },
        };
        const result = applyFeatureFlags(popovers);
        expect(result.bafta.link).toBe('/two-way-tv');
        expect(result.other.link).toBe('/some-page');
    });

    it('handles a mixed map — strips disabled, preserves enabled', () => {
        vi.stubEnv('CASE_STUDY_LINKS', 'two-way-tv');
        const popovers: PopoverMap = {
            bafta: { label: 'BAFTA', text: 'Won a BAFTA.', link: '/two-way-tv', linkText: 'View →' },
            other: { label: 'Other', text: 'Other text.', link: '/not-enabled', linkText: 'View →' },
            plain: { label: 'Plain', text: 'No link.' },
        };
        const result = applyFeatureFlags(popovers);
        expect(result.bafta.link).toBe('/two-way-tv');
        expect(result.other.link).toBeUndefined();
        expect(result.plain.link).toBeUndefined();
    });
});
