import fs from 'fs';

async function inspectDeepAssets() {
    const files = [
        'grammarDeepApi-NIi9EuKR.js',
        'drillBank-BJRXwrLy.js',
        'N3DeepDive-gZPlfLDg.js',
        'n5GrammarStory-CSo8H5uf.js',
        'WorksheetDrills-5a4VBsdk.js'
    ];

    for (const f of files) {
        console.log(`\n================== ${f} ==================`);
        try {
            const res = await fetch(`https://openjlpt.com/assets/${f}`);
            const text = await res.text();
            console.log(`Size: ${text.length} chars`);
            console.log(text.slice(0, 500));
        } catch (e) {
            console.error(e.message);
        }
    }
}

inspectDeepAssets();
