async function testAiProxy() {
    const proxyUrl = 'https://quizki-ai-proxy.lynguyennhattrung1706.workers.dev/';
    try {
        const res = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-001',
                messages: [
                    { role: 'system', content: 'You are a professional Japanese-Vietnamese translator.' },
                    { role: 'user', content: 'Translate to Vietnamese in JSON format: {"0": "N is N — polite assertion"}' }
                ]
            })
        });
        console.log('Proxy status:', res.status);
        const data = await res.json();
        console.log('AI response:', JSON.stringify(data, null, 2));
    } catch(e) {
        console.error('Error:', e.message);
    }
}
testAiProxy();
