import fs from 'fs';

async function inspectAllCurriculumFiles() {
    const list = [
        'minna-curriculum-BD-rv0kL.js',
        'skm-curriculum-patterns-BGvCT5Cm.js',
        'SkmN3BunpouPage-BAQ1izI7.js',
        'GrammarN1Page-Cv3qPwDE.js',
        'grammarPatterns-O02TNAWK.js',
        'N3DeepDive-gZPlfLDg.js'
    ];

    for (const f of list) {
        console.log(`\n================== ${f} ==================`);
        let text = '';
        if (fs.existsSync(`scripts/${f}`)) {
            text = fs.readFileSync(`scripts/${f}`, 'utf8');
        } else {
            const res = await fetch(`https://openjlpt.com/assets/${f}`);
            text = await res.text();
            fs.writeFileSync(`scripts/${f}`, text, 'utf8');
        }
        console.log(`Size: ${(text.length / 1024).toFixed(1)} KB`);
        console.log('Preview:', text.slice(0, 400));
    }
}

inspectAllCurriculumFiles();
