const fs = require('fs');
const https = require('https');

const configPath = 'C:\\Users\\lyngu\\.config\\configstore\\firebase-tools.json';
if (!fs.existsSync(configPath)) {
    console.error('Config file not found');
    process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const refreshToken = config.tokens?.refresh_token;

if (!refreshToken) {
    console.error('Refresh token not found');
    process.exit(1);
}

function postRequest(url, data) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const options = {
            hostname: u.hostname,
            path: u.pathname + u.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, body }));
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

function getRequest(url, token) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const options = {
            hostname: u.hostname,
            path: u.pathname + u.search,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, body }));
        });

        req.on('error', reject);
        req.end();
    });
}

async function run() {
    try {
        console.log('Exchanging refresh token for access token...');
        const tokenParams = new URLSearchParams({
            client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
            grant_type: 'refresh_token',
            refresh_token: refreshToken
        });
        const tokenRes = await postRequest('https://oauth2.googleapis.com/token', tokenParams.toString());
        const tokenData = JSON.parse(tokenRes.body);
        const accessToken = tokenData.access_token;
        if (!accessToken) {
            console.error('Failed to get access token:', tokenRes.body);
            return;
        }
        console.log('Successfully got access token.');

        const userId = 'cKaoe0SnScaX4IxoTaSY4xldySa2';
        const docPath = `https://firestore.googleapis.com/v1/projects/quizki-988e9/databases/(default)/documents/artifacts/1:28989364918:web:a2a99ad33fc0c23fca6417/users/${userId}/settings/profile`;

        console.log(`Fetching profile document: ${docPath}`);
        const docRes = await getRequest(docPath, accessToken);
        console.log('Response status:', docRes.statusCode);
        console.log('Profile Document:');
        console.log(JSON.stringify(JSON.parse(docRes.body), null, 2));

    } catch (e) {
        console.error('Error:', e);
    }
}

run();
