const fs = require('fs');
const https = require('https');

const config = JSON.parse(fs.readFileSync('C:\\Users\\lyngu\\.config\\configstore\\firebase-tools.json', 'utf8'));
const token = config.tokens?.access_token;

function patchRequest(url, body) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const data = JSON.stringify(body);
        const options = {
            hostname: u.hostname,
            path: u.pathname + u.search,
            method: 'PATCH',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };
        const req = https.request(options, (res) => {
            let resBody = '';
            res.on('data', chunk => resBody += chunk);
            res.on('end', () => resolve(JSON.parse(resBody)));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function restoreUser(userId, xp, level, title) {
    console.log(`Restoring user ${userId} to XP: ${xp}, Level: ${level}, Title: ${title}...`);
    
    // 1. Update settings/profile document
    const profileUrl = `https://firestore.googleapis.com/v1/projects/quizki-988e9/databases/(default)/documents/artifacts/1:28989364918:web:a2a99ad33fc0c23fca6417/users/${userId}/settings/profile?updateMask.fieldPaths=xp&updateMask.fieldPaths=level&updateMask.fieldPaths=title`;
    const profileBody = {
        fields: {
            xp: { integerValue: String(xp) },
            level: { integerValue: String(level) },
            title: { stringValue: title }
        }
    };
    const profileRes = await patchRequest(profileUrl, profileBody);
    console.log(` -> Profile update result:`, profileRes.error ? 'FAILED' : 'SUCCESS');

    // 2. Update publicStats document
    const statsUrl = `https://firestore.googleapis.com/v1/projects/quizki-988e9/databases/(default)/documents/artifacts/1:28989364918:web:a2a99ad33fc0c23fca6417/public/data/userStats/${userId}?updateMask.fieldPaths=xp&updateMask.fieldPaths=level&updateMask.fieldPaths=title`;
    const statsBody = {
        fields: {
            xp: { integerValue: String(xp) },
            level: { integerValue: String(level) },
            title: { stringValue: title }
        }
    };
    const statsRes = await patchRequest(statsUrl, statsBody);
    console.log(` -> Public stats update result:`, statsRes.error ? 'FAILED' : 'SUCCESS');
}

async function main() {
    // lynguyennhattrung1706@gmail.com
    await restoreUser('NxAcEvtk70Ti9fNjkzCsLh5xvmB3', 32270, 15, '📖 Học giả tập sự');
    // ntrungforwork@gmail.com
    await restoreUser('cKaoe0SnScaX4IxoTaSY4xldySa2', 12840, 10, '📖 Học giả tập sự');
}

main().catch(console.error);
