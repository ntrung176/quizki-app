import fs from 'fs';

async function testCurriculum() {
    // Check minnaN5
    if (fs.existsSync('scripts/minnaN5-C5ihH9tH.js')) {
        const text = fs.readFileSync('scripts/minnaN5-C5ihH9tH.js', 'utf8');
        console.log('minnaN5 size:', (text.length / 1024).toFixed(1), 'KB');
        console.log('minnaN5 preview:', text.slice(0, 500));
    }

    // Check minna-curriculum
    if (fs.existsSync('scripts/minna-curriculum-BD-rv0kL.js')) {
        const text = fs.readFileSync('scripts/minna-curriculum-BD-rv0kL.js', 'utf8');
        console.log('minna-curriculum size:', (text.length / 1024).toFixed(1), 'KB');
        console.log('minna-curriculum preview:', text.slice(0, 500));
    }

    // Check skm-curriculum-patterns
    if (fs.existsSync('scripts/skm-curriculum-patterns-BGvCT5Cm.js')) {
        const text = fs.readFileSync('scripts/skm-curriculum-patterns-BGvCT5Cm.js', 'utf8');
        console.log('skm-curriculum-patterns size:', (text.length / 1024).toFixed(1), 'KB');
        console.log('skm-curriculum-patterns preview:', text.slice(0, 500));
    }
}

testCurriculum();
