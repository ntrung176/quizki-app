const fs = require('fs');
const path = require('path');

function getFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
                results = results.concat(getFiles(fullPath));
            }
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
            results.push(fullPath);
        }
    }
    return results;
}

const files = getFiles('./src');
let changedFilesCount = 0;
let totalReplacements = 0;

for (const f of files) {
    // Never modify dictionary definitions
    if (f.includes('jotobaKanjiData.js')) continue;

    let content = fs.readFileSync(f, 'utf8');
    const original = content;

    // 1. Custom indigo numbered classes
    content = content.replace(/indigo-305/g, 'emerald-400');
    content = content.replace(/indigo-550/g, 'emerald-500');
    content = content.replace(/indigo-555/g, 'emerald-500');
    content = content.replace(/indigo-605/g, 'emerald-600');
    content = content.replace(/indigo-650/g, 'emerald-600');
    content = content.replace(/indigo-855/g, 'emerald-800');
    content = content.replace(/indigo-150/g, 'emerald-100');

    // 2. Standard Tailwind classes
    // Replace purple- with teal-
    content = content.replace(/\bpurple-/g, 'teal-');
    // Replace indigo- with emerald-
    content = content.replace(/\bindigo-/g, 'emerald-');
    // Replace violet- with sky-
    content = content.replace(/\bviolet-/g, 'sky-');

    // 3. String literals for colors
    content = content.replace(/(['"`])indigo\1/g, '$1emerald$1');
    content = content.replace(/(['"`])purple\1/g, '$1teal$1');
    content = content.replace(/(['"`])violet\1/g, '$1sky$1');
    content = content.replace(/(['"`])Indigo\1/g, '$1Emerald$1');
    content = content.replace(/(['"`])Purple\1/g, '$1Teal$1');
    content = content.replace(/(['"`])Violet\1/g, '$1Sky$1');

    // 4. Hex colors
    content = content.replace(/#6366f1/gi, '#10b981');
    content = content.replace(/#4f46e5/gi, '#059669');
    content = content.replace(/#4338ca/gi, '#047857');
    content = content.replace(/#a855f7/gi, '#14b8a6');
    content = content.replace(/#9333ea/gi, '#0d9488');
    content = content.replace(/#7e22ce/gi, '#0f766e');
    content = content.replace(/#8b5cf6/gi, '#14b8a6');
    content = content.replace(/#eef2ff/gi, '#ecfdf5');
    content = content.replace(/#493fcf/gi, '#059669');
    content = content.replace(/#5550ea/gi, '#10b981');
    content = content.replace(/#5956ec/gi, '#10b981');
    content = content.replace(/#93a0fa/gi, '#34d399');
    content = content.replace(/#342fa0/gi, '#065f46');

    // 5. Clean up duplicate identical gradient endpoints (e.g. from-emerald-600 to-emerald-600 -> from-emerald-600 to-teal-600)
    content = content.replace(/from-emerald-([0-9]+)\s+to-emerald-\1/g, 'from-emerald-$1 to-teal-$1');
    content = content.replace(/from-teal-([0-9]+)\s+to-teal-\1/g, 'from-teal-$1 to-emerald-$1');

    if (content !== original) {
        fs.writeFileSync(f, content, 'utf8');
        changedFilesCount++;
    }
}

console.log(`Successfully processed. Updated ${changedFilesCount} files.`);

