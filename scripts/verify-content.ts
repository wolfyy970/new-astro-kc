import fs from 'fs';
import path from 'path';
import { extractHotspotKeys, findDuplicateHotspots } from '../src/utils/validation.js';

const resumePath = path.join(process.cwd(), 'src/content/resume.json');
const popoversPath = path.join(process.cwd(), 'src/content/popovers.json');
const caseStudiesDir = path.join(process.cwd(), 'src/content/case-studies');
const caseStudiesManifestPath = path.join(caseStudiesDir, 'manifest.json');
const publicDir = path.join(process.cwd(), 'public');

function verify() {
    console.log('🔍 Starting Content Integrity Verification...');
    let errors: string[] = [];

    // 1. Load Files
    if (!fs.existsSync(resumePath)) {
        console.error('❌ Error: resume.json not found');
        process.exit(1);
    }
    if (!fs.existsSync(popoversPath)) {
        console.error('❌ Error: popovers.json not found');
        process.exit(1);
    }

    let resume, popovers, caseStudyManifest: Array<{ slug: string }>;
    try {
        resume = JSON.parse(fs.readFileSync(resumePath, 'utf-8'));
        popovers = JSON.parse(fs.readFileSync(popoversPath, 'utf-8'));
        caseStudyManifest = JSON.parse(fs.readFileSync(caseStudiesManifestPath, 'utf-8'));
    } catch (e) {
        console.error(`❌ Failed to parse JSON: ${(e as Error).message}`);
        process.exit(1);
    }

    // 2. Schema Validation
    console.log('📋 Validating schemas...');

    const validateResume = (data: any) => {
        const errs: string[] = [];
        const req = ['name', 'displayName', 'summary', 'experience', 'education'];
        req.forEach(f => { if (!data[f]) errs.push(`Resume: Missing required field "${f}"`); });
        return errs;
    };

    const validatePopovers = (data: any) => {
        const errs: string[] = [];
        Object.keys(data).forEach(k => {
            const item = data[k];
            if (!item.label) errs.push(`Popover "${k}": Missing required field "label"`);
            if (!item.text) errs.push(`Popover "${k}": Missing required field "text"`);
        });
        return errs;
    };

    errors.push(...validateResume(resume));
    errors.push(...validatePopovers(popovers));

    // 3. Use utility to find all <hotspot> keys
    const foundKeys = extractHotspotKeys(resume);

    // 4. Verify Hotspots in Popovers
    console.log(`📡 Checking ${foundKeys.size} unique hotspots...`);
    foundKeys.forEach(key => {
        if (!popovers[key]) {
            errors.push(`Missing data for hotspot key: "${key}" in popovers.json`);
        }
    });

    const duplicates = findDuplicateHotspots(resume);
    if (duplicates.length > 0) {
        duplicates.forEach(key => errors.push(`Duplicate hotspot key found in resume: "${key}"`));
    }

    // 5. Verify Images in Popovers
    console.log(`🖼️ Verifying image paths...`);
    Object.keys(popovers).forEach(key => {
        const item = popovers[key];
        if (item.img) {
            // Remove leading slash if present for path join
            const relativePath = item.img.startsWith('/') ? item.img.slice(1) : item.img;
            const fullPath = path.join(publicDir, relativePath);

            if (!fs.existsSync(fullPath)) {
                errors.push(`Missing image file for "${key}": "${item.img}"`);
            }
        }

        if (Array.isArray(item.media)) {
            item.media.forEach((mediaPath: string) => {
                if (typeof mediaPath !== 'string') return;
                const relativePath = mediaPath.startsWith('/') ? mediaPath.slice(1) : mediaPath;
                const fullPath = path.join(publicDir, relativePath);
                if (!fs.existsSync(fullPath)) {
                    errors.push(`Missing media file for "${key}": "${mediaPath}"`);
                }
            });
        }
    });

    // 6. Verify Case Study Files and Images
    console.log(`🖼️ Verifying case study image paths...`);
    const checkImagePath = (imagePath: string, context: string) => {
        if (!imagePath) return;
        const relative = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
        const full = path.join(publicDir, relative);
        if (!fs.existsSync(full)) {
            errors.push(`Missing image for ${context}: "${imagePath}"`);
        }
    };

    for (const { slug } of caseStudyManifest) {
        const studyPath = path.join(caseStudiesDir, `${slug}.json`);
        if (!fs.existsSync(studyPath)) {
            errors.push(`Case study manifest references "${slug}" but ${slug}.json not found in case-studies/`);
            continue;
        }

        let study: any;
        try {
            study = JSON.parse(fs.readFileSync(studyPath, 'utf-8'));
        } catch (e) {
            errors.push(`Failed to parse case-studies/${slug}.json: ${(e as Error).message}`);
            continue;
        }

        const prefix = `case-studies/${slug}.json`;
        if (study.meta?.ogImage) checkImagePath(study.meta.ogImage, `${prefix} meta.ogImage`);
        if (study.hero?.image) checkImagePath(study.hero.image, `${prefix} hero.image`);
        if (study.hero?.background) checkImagePath(study.hero.background, `${prefix} hero.background`);

        for (const section of (study.sections ?? []) as Array<any>) {
            const sp = `${prefix} sections[${section.key ?? section.type}]`;
            if (section.image) checkImagePath(section.image, `${sp}.image`);
            for (const card of section.cards ?? []) checkImagePath(card.image, `${sp}.cards[]`);
            if (section.primaryCard?.image) checkImagePath(section.primaryCard.image, `${sp}.primaryCard.image`);
            for (const card of section.secondaryCards ?? []) checkImagePath(card.image, `${sp}.secondaryCards[]`);
        }
    }

    // 7. Report Results
    if (errors.length > 0) {
        console.error('\n❌ Integrity Verification Failed:');
        errors.forEach(err => console.error(`   - ${err}`));
        process.exit(1);
    } else {
        console.log('\n✅ Content Integrity Verified. All systems whole.');
        process.exit(0);
    }
}

verify();
