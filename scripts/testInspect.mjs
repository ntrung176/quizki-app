async function inspectFiles() {
    const res = await fetch('https://openjlpt.com/assets/dojoContent.service-B9u5OMK3.js');
    const text = await res.text();
    console.log('=== dojoContent.service-B9u5OMK3.js ===');
    console.log(text);
}
inspectFiles();
