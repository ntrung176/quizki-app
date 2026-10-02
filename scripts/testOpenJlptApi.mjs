const TOKEN = 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJseW5ndXllbm5oYXR0cnVuZzE3MCIsImlhdCI6MTc5MDk1NzQwOCwiZXhwIjoxNzkwOTU4MzA4LCJ0eXBlIjoiYWNjZXNzIiwianRpIjoiZGJlMmVhNjYtZWMzYi00YWVlLTkxMzAtNjVjN2FkNGM5NjVhIn0.1WpoWB8RmHSgJ1X3iYrhDcrqPhEx64ihrKahqS7daE09_t4Qe3uT4Va5KeUB412zdi1sWMRMGdLSLHsGon5q0w';

async function scanWorksheets() {
    console.log('Scanning worksheet IDs 1 to 100...');
    const found = [];
    for (let i = 1; i <= 100; i++) {
        try {
            const res = await fetch(`https://openjlpt.com/api/content/dojo/worksheet/${i}`, {
                headers: {
                    'Authorization': `Bearer ${TOKEN}`,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*'
                }
            });
            if (res.ok) {
                const data = await res.json();
                const totalQ = (data.bunpou?.length || 0) + (data.joshi?.length || 0) + (data.katsuyou?.length || 0) + (data.narabe?.length || 0) + (data.choukai?.length || 0) + (data.honyaku?.length || 0);
                console.log(`✅ Worksheet ${i}: OK (Keys: ${Object.keys(data).filter(k => Array.isArray(data[k]) && data[k].length).join(', ')}) - Total ~${totalQ} questions`);
                found.push(i);
            } else if (res.status === 401) {
                console.log(`❌ Token expired on ID ${i}`);
                break;
            }
        } catch (e) {
            console.error(`Error on ID ${i}:`, e.message);
        }
    }
    console.log(`\nFound ${found.length} active worksheets:`, found);
}

scanWorksheets();
