async function testBatch() {
    const sentences = [
        "I would like to visit Japan at least once before I graduate from university.",
        "When I travel to Vietnam, I definitely want to try Pho.",
        "I would love to go to Okinawa.",
        "Mount Everest is higher than Mount Fuji.",
        "Americans are taller than Japanese."
    ];

    const joined = sentences.join('\n');
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=' + encodeURIComponent(joined);
    const res = await fetch(url);
    const data = await res.json();
    const result = data[0].map(item => item[0]).join('');
    console.log(result.split('\n'));
}

testBatch();
