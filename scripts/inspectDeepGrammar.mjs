async function inspectDeepGrammar() {
    const list = [
        'grammarSheetSearchIndex-CFN6mmTH.js',
        'n3GrammarDeep-Coi7H98v.js',
        'n3GrammarDeep-CMdHpsYW.js',
        'contentLive-U71wAU_x.js',
        'KeigoSheet-B6UJWnHn.js',
        'ParticleSheet-uYk8Y_NO.js'
    ];

    for (const f of list) {
        console.log(`\n================== ${f} ==================`);
        try {
            const res = await fetch(`https://openjlpt.com/assets/${f}`);
            const text = await res.text();
            console.log(`Size: ${text.length} characters`);
            console.log('Preview:', text.slice(0, 1000));
        } catch (e) {
            console.error(e.message);
        }
    }
}

inspectDeepGrammar();
