const TOKEN = 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJseW5ndXllbm5oYXR0cnVuZzE3MCIsImlhdCI6MTc5MDk1NzQwOCwiZXhwIjoxNzkwOTU4MzA4LCJ0eXBlIjoiYWNjZXNzIiwianRpIjoiZGJlMmVhNjYtZWMzYi00YWVlLTkxMzAtNjVjN2FkNGM5NjVhIn0.1WpoWB8RmHSgJ1X3iYrhDcrqPhEx64ihrKahqS7daE09_t4Qe3uT4Va5KeUB412zdi1sWMRMGdLSLHsGon5q0w';

const headers = {
    'Authorization': `Bearer ${TOKEN}`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*'
};

async function testAll() {
    console.log('--- 1. Testing Yomimono Structure ---');
    try {
        const res = await fetch('https://openjlpt.com/api/content/dojo/yomimono/structure', { headers });
        console.log('Status:', res.status);
        if (res.ok) {
            const data = await res.json();
            console.log(`Yomimono articles count: ${data.length}`);
            console.log('Sample Yomimono structure:', data.slice(0, 3));
        }
    } catch (e) {
        console.error(e.message);
    }

    console.log('\n--- 2. Testing JLPT Worksheet 139 (N2) ---');
    try {
        const res = await fetch('https://openjlpt.com/api/content/dojo/jlpt-worksheet/139', { headers });
        console.log('Status:', res.status);
        if (res.ok) {
            const data = await res.json();
            console.log('JLPT Worksheet 139 keys:', Object.keys(data));
            console.log('Sample group:', JSON.stringify(data.groups?.[0], null, 2)?.slice(0, 600));
        }
    } catch (e) {
        console.error(e.message);
    }

    console.log('\n--- 3. Testing Yomimono 1 ---');
    try {
        const res = await fetch('https://openjlpt.com/api/content/dojo/yomimono/1', { headers });
        console.log('Status:', res.status);
        if (res.ok) {
            const data = await res.json();
            console.log('Yomimono 1 keys:', Object.keys(data));
            console.log('Sample passage:', JSON.stringify(data.passages?.[0], null, 2)?.slice(0, 600));
        }
    } catch (e) {
        console.error(e.message);
    }

    console.log('\n--- 4. Testing Drill 1 ---');
    try {
        const res = await fetch('https://openjlpt.com/api/content/dojo/drill/1', { headers });
        console.log('Status:', res.status);
        if (res.ok) {
            const data = await res.json();
            console.log('Drill 1 keys:', Object.keys(data));
            console.log('Sample drill:', JSON.stringify(data, null, 2)?.slice(0, 600));
        }
    } catch (e) {
        console.error(e.message);
    }
}

testAll();
