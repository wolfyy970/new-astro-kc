import fs from 'fs';
import path from 'path';
import { extractHotspotKeys, findDuplicateHotspots } from '../src/utils/validation.js';

const resumePath = path.join(process.cwd(), 'src/content/resume.json');
const popoversPath = path.join(process.cwd(), 'src/content/popovers.json');
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

    const resume = JSON.parse(fs.readFileSync(resumePath, 'utf-8'));
    const popovers = JSON.parse(fs.readFileSync(popoversPath, 'utf-8'));

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
    });

    // 6. Report Results
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
