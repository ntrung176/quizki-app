async function test() {
    const url = 'https://sepay-webhook.lynguyennhattrung1706.workers.dev/';
    console.log(`Sending GET request to: ${url}`);
    try {
        const res = await fetch(url, { method: 'GET' });
        console.log(`Status: ${res.status}`);
        console.log(`Headers:`, Object.fromEntries(res.headers.entries()));
        const text = await res.text();
        console.log(`Response Text:`, text);
    } catch (err) {
        console.error(`Error:`, err);
    }
}

test();
