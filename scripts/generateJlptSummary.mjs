import fs from 'fs';
import path from 'path';

const levels = ['n5', 'n4', 'n3', 'n2', 'n1'];
const summary = [];

levels.forEach((lvl) => {
    const filePath = path.join(process.cwd(), 'public', 'data', 'jlpt', `${lvl}.json`);
    if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${filePath}`);
        return;
    }

    console.log(`Processing ${lvl}...`);
    const tests = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    tests.forEach((t) => {
        let questionCount = 0;
        const sectionsCount = Array.isArray(t.sections) ? t.sections.length : 0;

        if (t.sections && Array.isArray(t.sections)) {
            t.sections.forEach((s) => {
                if (s && s.questions && Array.isArray(s.questions)) {
                    s.questions.forEach((q) => {
                        if (q && Array.isArray(q.subQuestions) && q.subQuestions.length > 0) {
                            questionCount += q.subQuestions.length;
                        } else {
                            questionCount += 1;
                        }
                    });
                }
            });
        }

        summary.push({
            id: t.id,
            title: t.title,
            baiNumber: t.baiNumber,
            level: t.level,
            timeLimit: t.timeLimit,
            isSkillTest: t.isSkillTest,
            skillType: t.skillType,
            isRoadmapTest: t.isRoadmapTest,
            isPremium: t.isPremium,
            strategy: t.strategy,
            strategyData: t.strategyData,
            description: t.description,
            bookSlug: t.bookSlug,
            bookTitle: t.bookTitle,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            questionCount,
            sectionsCount
        });
    });
});

const outPath = path.join(process.cwd(), 'public', 'data', 'jlpt', 'summary.json');
fs.writeFileSync(outPath, JSON.stringify(summary), 'utf8');

const stat = fs.statSync(outPath);
console.log(`✅ Successfully generated ${summary.length} tests in summary.json!`);
console.log(`📁 File size: ${(stat.size / 1024 / 1024).toFixed(2)} MB (${Math.round(stat.size / 1024)} KB)`);

