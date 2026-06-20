

async function run() {
    const urls = [
        `https://firestore.googleapis.com/v1/projects/quizki-988e9/databases/(default)/documents/artifacts/1:28989364918:web:a2a99ad33fc0c23fca6417/creditRequests/QKO0DQWQMQM2Z63Z`,
        `https://firestore.googleapis.com/v1/projects/quizki-988e9/databases/(default)/documents/artifacts/quizki-app/creditRequests/QKO0DQWQMQM2Z63Z`
    ];

    for (const url of urls) {
        console.log(`Fetching: ${url}`);
        try {
            const res = await fetch(url);
            console.log(`Status: ${res.status}`);
            const data = await res.json();
            console.log(`Response:`, JSON.stringify(data, null, 2));
        } catch (err) {
            console.error(`Error:`, err);
        }
    }
}

run();
