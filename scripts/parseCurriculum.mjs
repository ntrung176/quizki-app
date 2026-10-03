import fs from 'fs';

async function parseAllCurriculum() {
    const minnaText = fs.readFileSync('scripts/minna-curriculum-BD-rv0kL.js', 'utf8');
    const skmText = fs.readFileSync('scripts/skm-curriculum-patterns-BGvCT5Cm.js', 'utf8');

    // Parse minna lessons
    const minnaStart = minnaText.indexOf('[{bai:1');
    const minnaEnd = minnaText.lastIndexOf('}]');
    const minnaObjStr = minnaText.slice(minnaStart, minnaEnd + 2);
    const minnaLessons = (new Function(`return (${minnaObjStr});`))();

    console.log(`Minna Lessons parsed: ${minnaLessons.length}`);
    console.log('Sample Minna lesson 1:', minnaLessons[0]);
    console.log('Sample Minna lesson 25 (N5 end):', minnaLessons[24]);
    console.log('Sample Minna lesson 50 (N4 end):', minnaLessons[49]);

    // Parse SKM patterns
    const skmStart = skmText.indexOf('{51:[');
    const skmEnd = skmText.lastIndexOf(']}');
    const skmObjStr = skmText.slice(skmStart, skmEnd + 2);
    const skmPatterns = (new Function(`return (${skmObjStr});`))();
    console.log(`SKM Pattern keys: ${Object.keys(skmPatterns).length}`);
    console.log('Sample SKM lesson 51:', skmPatterns['51']?.slice(0, 2));
}

parseAllCurriculum();
