async function test() {
    const url = 'https://sepay-webhook.lynguyennhattrung1706.workers.dev/';
    console.log(`Sending POST request with dummy auth to: ${url}`);
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': 'wrong_secret'
            },
            body: JSON.stringify({ test: true })
        });
        console.log(`Status: ${res.status}`);
        const text = await res.text();
        console.log(`Response Text:`, text);
    } catch (err) {
        console.error(`Error:`, err);
    }
}

test();
