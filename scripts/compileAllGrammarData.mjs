import fs from 'fs';
import path from 'path';

// Helper to extract JSON/JS object from contentLive or raw bundle
function extractObjectFromBundle(jsText, varPattern) {
    // Some are `await a("...", "...", { ... })` or `await n("...", "...", { ... })` or `JSON.parse('...')`
    const jsonParseMatches = Array.from(jsText.matchAll(/JSON\.parse\('([^']+)'\)/g));
    if (jsonParseMatches.length > 0) {
        for (const m of jsonParseMatches) {
            try {
                const unescaped = m[1].replace(/\\'/g, "'").replace(/\\\\/g, "\\");
                return JSON.parse(unescaped);
            } catch (e) {}
        }
    }
    return null;
}

async function fetchAsset(fileName) {
    const res = await fetch(`https://openjlpt.com/assets/${fileName}`);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${fileName}`);
    return await res.text();
}

async function main() {
    console.log('=== STARTING GRAMMAR DATA COMPILATION ===\n');

    // 1. Fetch search index
    console.log('1. Fetching Grammar Sheet Search Index...');
    const searchJs = await fetchAsset('grammarSheetSearchIndex-CFN6mmTH.js');
    const searchFirstQuote = searchJs.indexOf("JSON.parse('") + "JSON.parse('".length;
    const searchLastQuote = searchJs.lastIndexOf("')");
    const searchJsonStr = searchJs.slice(searchFirstQuote, searchLastQuote).replace(/\\'/g, "'").replace(/\\\\/g, "\\");
    const searchIndex = JSON.parse(searchJsonStr);
    console.log(`-> Loaded ${searchIndex.length} search entries.`);

    // 2. Fetch Deep Grammar (N5, N4, N3, N2)
    const deepFiles = {
        N5: 'n5GrammarDeep-CgL_BzBr.js',
        N4: 'n4GrammarDeep-DxcLWTOX.js',
        N3: 'n3GrammarDeep-CMdHpsYW.js',
        N2: 'n2GrammarDeep-CAgaqBld.js'
    };

    const deepGrammarMap = {};
    let totalDeepPoints = 0;

    for (const [level, fileName] of Object.entries(deepFiles)) {
        console.log(`\n2. Fetching ${level} Deep Grammar (${fileName})...`);
        const js = await fetchAsset(fileName);
        
        // We can parse all patterns using regex or slicing object blocks
        // Pattern objects start with `{pattern:"..."`
        const patternIndices = [];
        const patternRegex = /\{pattern:\s*"([^"]+)"/g;
        let match;
        while ((match = patternRegex.exec(js)) !== null) {
            patternIndices.push({
                index: match.index,
                pattern: match[1]
            });
        }

        console.log(`-> Found ${patternIndices.length} points for ${level}`);

        for (let i = 0; i < patternIndices.length; i++) {
            const start = patternIndices[i].index;
            const end = i + 1 < patternIndices.length ? patternIndices[i + 1].index : js.lastIndexOf('})');
            const snippet = js.slice(start, end);
            
            // Clean snippet to parse as JS / JSON
            // If snippet ends with trailing comma or extra chars, trim to last closing bracket
            const lastBrace = snippet.lastIndexOf('}');
            if (lastBrace !== -1) {
                const objStr = snippet.slice(0, lastBrace + 1);
                try {
                    // Use Function to safely evaluate object literal in Node
                    const parsed = (new Function(`return (${objStr});`))();
                    if (parsed && parsed.pattern) {
                        const key = parsed.pattern.trim();
                        deepGrammarMap[key] = {
                            ...parsed,
                            level: level
                        };
                        totalDeepPoints++;
                    }
                } catch (err) {
                    // Try regex fallback for critical fields if Function fails
                    // console.warn(`Could not parse ${patternIndices[i].pattern}:`, err.message);
                }
            }
        }
    }

    console.log(`\n-> Successfully parsed ${totalDeepPoints} Deep Grammar points across N5-N2!`);

    // Save Deep Grammar Data
    const deepGrammarPath = path.resolve('public/data/deep_grammar_data.json');
    fs.writeFileSync(deepGrammarPath, JSON.stringify(deepGrammarMap, null, 2), 'utf8');
    console.log(`-> Saved deep grammar dataset to ${deepGrammarPath} (${(fs.statSync(deepGrammarPath).size / 1024).toFixed(1)} KB)`);
}

main().catch(console.error);
