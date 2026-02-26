import fs from 'fs';
import path from 'path';

const resumePath = path.join(process.cwd(), 'src/content/resume.json');
const popoversPath = path.join(process.cwd(), 'src/content/popovers.json');

const emptyResume = {
    "name": "Your Legal Name",
    "displayName": "Your Display Name",
    "titleLine": "Your Title / Profession",
    "contact": {
        "email": "you@example.com",
        "phone": "555.555.5555",
        "linkedin": "linkedin.com/in/yourprofile",
        "linkedinUrl": "https://linkedin.com/in/yourprofile",
        "location": "Your City, State"
    },
    "hero": {
        "tagline": "A concise headline describing your unique value proposition.",
        "credentials": [
            "Credential 1",
            "Credential 2"
        ]
    },
    "summary": "Your professional summary goes here. Use <hotspot key=\"example\">highlighted keywords</hotspot> to create interactive popovers that provide more context without cluttering the page.",
    "keyAchievements": [
        {
            "heading": "Example Achievement Cluster",
            "items": [
                "A major achievement with a <hotspot key=\"metric\">measurable impact metric</hotspot>."
            ]
        }
    ],
    "experience": [
        {
            "company": "Company Name",
            "dates": "2020 - Present",
            "title": "Your Role",
            "bullets": [
                "Responsibility or achievement 1."
            ]
        }
    ],
    "education": [
        {
            "degree": "Your Degree",
            "school": "University Name",
            "focus": "Optional Focus Area"
        }
    ],
    "patentsAndRecognition": {
        "patents": "Any patents or publications",
        "awards": "Any awards",
        "certifications": "Any certifications"
    }
};

const emptyPopovers = {
    "example": {
        "label": "Example Popover",
        "text": "This is the expanded text that appears when someone clicks the hotspot."
    },
    "metric": {
        "label": "Impact Metric",
        "text": "Detailing the context of the metric mentioned in the achievement.",
        "stat": "100%"
    }
};

fs.writeFileSync(resumePath, JSON.stringify(emptyResume, null, 2) + '\n');
fs.writeFileSync(popoversPath, JSON.stringify(emptyPopovers, null, 2) + '\n');

console.log('✅ Template content successfully reset!');
console.log('You can now start adding your own details to src/content/resume.json and src/content/popovers.json.');
