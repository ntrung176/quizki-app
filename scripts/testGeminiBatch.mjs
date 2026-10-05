import fs from 'fs';

async function testGeminiBatch() {
    const data = JSON.parse(fs.readFileSync('public/data/grammar_nuances.json', 'utf8'));
    const englishWordRegex = /\b(the|is|are|was|were|a|an|to|and|of|in|for|with|this|that|these|those|use|used|it|pattern|means|meaning|polite|noun|verb|adjective|sentence|speaker|listener|when|after|before|because|although|express|expresses|expressing|used to|indicates|indicates that)\b/i;

    const sampleStrings = [];
    for (const nodes of Object.values(data)) {
        for (const n of nodes) {
            if (sampleStrings.length >= 15) break;
            ['title', 'coreMeaning', 'definition'].forEach(f => {
                if (n[f] && englishWordRegex.test(n[f]) && !sampleStrings.includes(n[f])) {
                    sampleStrings.push(n[f]);
                }
            });
        }
    }

    const payload = {};
    sampleStrings.forEach((s, idx) => payload[String(idx)] = s);

    console.log(`Sending ${sampleStrings.length} strings to Gemini Flash...`);
    const start = Date.now();

    const proxyUrl = 'https://quizki-ai-proxy.lynguyennhattrung1706.workers.dev/';
    const res = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'google/gemini-2.0-flash-001',
            temperature: 0.1,
            max_tokens: 4096,
            messages: [
                {
                    role: 'system',
                    content: 'You are an elite Japanese-Vietnamese linguist for JLPT grammar. Translate the given English grammar descriptions, definitions, and titles into natural, pedagogically accurate Vietnamese for Vietnamese learners of Japanese. Maintain Markdown bolding (**...**) and grammatical symbols (N, V, A, Na, ～). Return a JSON object with the exact same keys.'
                },
                {
                    role: 'user',
                    content: JSON.stringify(payload)
                }
            ]
        })
    });

    console.log('Status:', res.status, 'Time:', Date.now() - start, 'ms');
    const json = await res.json();
    const content = json.choices[0].message.content;
    const cleanContent = content.replace(/```json\s*|\s*```/g, '').trim();
    const parsed = JSON.parse(cleanContent);
    console.log('Translated sample successfully:', Object.keys(parsed).length, 'items');
    for (const [k, v] of Object.entries(parsed)) {
        console.log(`[${k}] ${sampleStrings[Number(k)].slice(0, 40)}... => ${v.slice(0, 60)}...`);
    }
}

testGeminiBatch();
