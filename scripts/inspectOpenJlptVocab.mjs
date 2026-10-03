import fs from 'fs';

async function testEndpoints() {
    const urls = [
        'https://openjlpt.com/api/content/sets/51',
        'https://openjlpt.com/api/public/sets/51',
        'https://openjlpt.com/api/cards?setId=51',
        'https://openjlpt.com/api/content/dojo/set/51',
        'https://openjlpt.com/api/content/dojo/vocab/51',
        'https://openjlpt.com/api/vocabulary/set/51',
        'https://openjlpt.com/api/sets/51/public'
    ];

    for (const u of urls) {
        try {
            const res = await fetch(u);
            console.log(u, '->', res.status);
            if (res.ok) {
                const data = await res.json();
                console.log('SUCCESS:', u, Object.keys(data));
            }
        } catch (e) {
            console.error(u, e.message);
        }
    }
}

testEndpoints().catch(console.error);
