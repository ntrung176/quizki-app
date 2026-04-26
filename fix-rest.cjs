const fs = require('fs');
const files = ['JLPTAdminScreen.jsx', 'ImportScreen.jsx', 'HelpScreen.jsx', 'ForumScreen.jsx', 'FeedbackScreen.jsx', 'PrivacyScreen.jsx', 'TermsScreen.jsx', 'TestScreen.jsx'];
const cls = 'p-2.5 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 shadow-md border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all hover:scale-105';

files.forEach(f => {
    let p = 'src/components/screens/' + f;
    if (fs.existsSync(p)) {
        let c = fs.readFileSync(p, 'utf8');
        // This regex will find `className="..."` followed by optional newlines and `>` then `<ArrowLeft`
        c = c.replace(/className=(["`]).*?\1(\s*>\s*<ArrowLeft)/g, `className="${cls}"$2`);
        fs.writeFileSync(p, c, 'utf8');
        console.log('Fixed', f);
    }
});
