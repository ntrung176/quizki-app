const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    try {
        await page.goto('http://localhost:5173/__/auth/action?mode=verifyEmail&oobCode=123');
        await page.waitForTimeout(1000); // wait for render
        const html = await page.content();
        if (html.includes('AuthActionScreen') || html.includes('Đang xử lý...') || html.includes('QuizKi')) {
            console.log('Success, rendered some part of AuthActionScreen or app');
            // Check specific text
            if (html.includes('Link không hợp lệ') || html.includes('xác thực')) {
                console.log('Route matched AuthActionScreen perfectly!');
            } else {
                console.log('Warning: rendered app but not AuthActionScreen text');
            }
        } else {
            console.log('Failed to render expected text. HTML snippet:', html.slice(0, 500));
        }
    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
