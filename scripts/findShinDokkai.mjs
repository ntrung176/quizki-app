import fs from 'fs';

const data = JSON.parse(fs.readFileSync('public/data/jlpt/n1.json', 'utf8'));
console.log(`Loaded ${data.length} tests in n1.json`);

const matching = data.filter(t => (t.title || '').toLowerCase().includes('dokkai') || (t.id || '').toLowerCase().includes('dokkai'));
console.log(`Found ${matching.length} dokkai tests`);

if (matching.length > 0) {
    console.log('Sample test 0:', JSON.stringify({
        id: matching[0].id,
        title: matching[0].title,
        level: matching[0].level,
        sections: matching[0].sections?.map(s => ({
            title: s.title,
            type: s.type,
            passages: s.passages,
            questionsCount: s.questions?.length,
            sampleQ: s.questions?.[0]
        }))
    }, null, 2));
} else {
    // Check first 5 tests in n1.json
    console.log('First 5 tests in n1.json:');
    data.slice(0, 5).forEach(t => {
        console.log(`ID: ${t.id} | Title: ${t.title}`);
    });
}
