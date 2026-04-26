const fs = require('fs');
const path = require('path');
const BEAUTIFUL_CLASS = `"p-2.5 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 shadow-md border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all hover:scale-105"`;

function walkDir(dir) {
    for (const f of fs.readdirSync(dir)) {
        let p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) walkDir(p);
        else if (p.endsWith('.jsx')) {
            let content = fs.readFileSync(p, 'utf8');
            let orig = content;

            let parts = content.split('<ArrowLeft');
            if (parts.length > 1) {
                for (let i = 0; i < parts.length - 1; i++) {
                    let textBefore = parts[i];
                    let btnStartMatch = textBefore.lastIndexOf('<button');
                    if (btnStartMatch !== -1) {
                        let btnContent = textBefore.substring(btnStartMatch);
                        if (!btnContent.includes('>') || textBefore.substring(textBefore.lastIndexOf('>') + 1).trim() === '') {
                            // ArrowLeft is inside this element!
                            let classNameMatch = btnContent.match(/className=(["`][^"`]*?["`])/);
                            if (classNameMatch && !classNameMatch[1].includes('w-full') && !classNameMatch[1].includes('absolute')) {
                                let newBtnContent = btnContent.replace(classNameMatch[1], BEAUTIFUL_CLASS);
                                parts[i] = textBefore.substring(0, btnStartMatch) + newBtnContent;
                            }
                        }
                    }
                }
                content = parts.join('<ArrowLeft');
            }

            let partsChevron = content.split('<ChevronLeft');
            if (partsChevron.length > 1) {
                for (let i = 0; i < partsChevron.length - 1; i++) {
                    let textBefore = partsChevron[i];
                    let btnStartMatch = textBefore.lastIndexOf('<button');
                    if (btnStartMatch !== -1) {
                        let btnContent = textBefore.substring(btnStartMatch);
                        if (!btnContent.includes('>') || textBefore.substring(textBefore.lastIndexOf('>') + 1).trim() === '') {
                            let classNameMatch = btnContent.match(/className=(["`][^"`]*?["`])/);
                            if (classNameMatch && !classNameMatch[1].includes('w-full') && !classNameMatch[1].includes('absolute')) {
                                let newBtnContent = btnContent.replace(classNameMatch[1], BEAUTIFUL_CLASS);
                                partsChevron[i] = textBefore.substring(0, btnStartMatch) + newBtnContent;
                            }
                        }
                    }
                }
                content = partsChevron.join('<ChevronLeft');
            }

            if (content !== orig) {
                fs.writeFileSync(p, content, 'utf8');
                console.log('Fixed', path.basename(p));
            }
        }
    }
}
walkDir(path.join(__dirname, 'src/components/screens'));
