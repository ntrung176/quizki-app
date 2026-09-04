import fs from 'fs';
import path from 'path';

// Read .env
const envContent = fs.readFileSync('.env', 'utf-8');
function getEnv(key) {
    const match = envContent.match(new RegExp(`${key}=(.+)`));
    return match ? match[1].trim() : '';
}

const OPENROUTER_API_KEY = getEnv('VITE_OPENROUTER_API_KEY');
const OUTPUT_PATH = path.join(process.cwd(), 'public/data/grammar_data.json');
const CACHE_DIR = path.join(process.cwd(), 'scripts/.grammar_cache');

if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Call Gemini via OpenRouter to translate or enrich batch of sentences/meanings
async function callGeminiBatch(prompts) {
    if (!OPENROUTER_API_KEY) return null;
    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`
            },
            body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                messages: [
                    {
                        role: 'system',
                        content: 'Bạn là chuyên gia dịch thuật ngữ pháp tiếng Nhật JLPT sang tiếng Việt. Trả về định dạng JSON mảng các chuỗi tiếng Việt dịch nghĩa ngắn gọn, tự nhiên, chính xác.'
                    },
                    {
                        role: 'user',
                        content: prompts
                    }
                ],
                temperature: 0.2
            })
        });

        if (!response.ok) return null;
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim() || '';
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return null;
    } catch (e) {
        console.warn('AI call failed:', e.message);
        return null;
    }
}

// Fetch grammar list from Mazii
async function fetchGrammarList(level) {
    const cacheFile = path.join(CACHE_DIR, `list_${level}.json`);
    if (fs.existsSync(cacheFile)) {
        try {
            return JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
        } catch (e) {}
    }

    console.log(`[${level}] Đang lấy danh sách ngữ pháp từ Mazii API...`);
    try {
        const res = await fetch('https://mazii.net/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: '', dict: 'javi', type: 'grammar', level: level, page: 1, limit: 600 })
        });
        const data = await res.json();
        const items = data.results || [];
        fs.writeFileSync(cacheFile, JSON.stringify(items, null, 2), 'utf-8');
        console.log(`[${level}] Đã lấy ${items.length} mẫu ngữ pháp.`);
        return items;
    } catch (e) {
        console.error(`[${level}] Lỗi fetch danh sách:`, e.message);
        return [];
    }
}

// Fetch grammar detail
async function fetchGrammarDetail(id) {
    const cacheFile = path.join(CACHE_DIR, `detail_${id}.json`);
    if (fs.existsSync(cacheFile)) {
        try {
            return JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
        } catch (e) {}
    }

    try {
        const res = await fetch(`https://mazii.net/api/grammar/${id}`);
        if (!res.ok) return null;
        const data = await res.json();
        if (data.grammar) {
            fs.writeFileSync(cacheFile, JSON.stringify(data.grammar, null, 2), 'utf-8');
            return data.grammar;
        }
    } catch (e) {
        console.warn(`Lỗi fetch detail ${id}:`, e.message);
    }
    return null;
}

// Parse structure
function parseStructure(synopsis) {
    if (!synopsis) return [];
    // Convert <br/> and tags to clean text
    const clean = synopsis.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!clean) return [];

    return clean.split(/[/+]/).map(part => {
        const t = part.trim();
        if (t.startsWith('N') || t.startsWith('Danh')) return { text: t, type: 'noun' };
        if (t.startsWith('V') || t.startsWith('Động')) return { text: t, type: 'verb' };
        if (t.startsWith('A') || t.startsWith('Tính')) return { text: t, type: 'adjective' };
        return { text: t, type: 'connector' };
    }).filter(p => p.text);
}

// Clean HTML in explanations
function cleanHtml(str) {
    if (!str) return '';
    return str
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
}

async function main() {
    console.log('🚀 Bắt đầu quá trình lấy và chuẩn hóa toàn bộ Ngữ pháp JLPT N5 -> N1...');

    const levels = ['N5', 'N4', 'N3', 'N2', 'N1'];
    const textbooks = [];
    const allGrammarPoints = [];

    for (const level of levels) {
        const rawList = await fetchGrammarList(level);
        const points = [];

        console.log(`[${level}] Đang xử lý chi tiết từng mẫu ngữ pháp...`);
        let count = 0;

        for (const item of rawList) {
            count++;
            if (count % 25 === 0 || count === rawList.length) {
                console.log(`[${level}] Tiến độ: ${count}/${rawList.length}`);
            }

            // Extract pattern and meaningVi from title
            // Title format: "から見ると/から見れば => Nếu nhìn từ"
            let pattern = item.title || '';
            let meaningVi = '';
            if (pattern.includes('=>')) {
                const parts = pattern.split('=>');
                pattern = parts[0].trim();
                meaningVi = parts[1].trim();
            } else if (pattern.includes(':')) {
                const parts = pattern.split(':');
                pattern = parts[0].trim();
                meaningVi = parts[1].trim();
            }

            // Clean pattern
            pattern = pattern.replace(/^\.\.\.\s*/, '〜').replace(/^\.\.\s*/, '〜').replace(/^~\s*/, '〜');

            const detail = await fetchGrammarDetail(item._id);
            await sleep(30); // slight rate limit

            let structure = [];
            let examples = [];
            let explanation = '';
            let tips = [];

            if (detail && detail.usages && detail.usages.length > 0) {
                const primaryUsage = detail.usages[0];
                structure = parseStructure(primaryUsage.synopsis || '');
                explanation = cleanHtml(primaryUsage.explain || '');
                if (primaryUsage.note) {
                    tips.push({ icon: '💡', text: cleanHtml(primaryUsage.note) });
                }

                // Process examples
                if (Array.isArray(primaryUsage.examples)) {
                    examples = primaryUsage.examples.slice(0, 5).map(ex => ({
                        ja: ex.content || '',
                        furigana: ex.transcription || ex.content || '',
                        vi: ex.mean || ''
                    }));
                }
            }

            // Fallback meaning if empty
            if (!meaningVi && detail?.title && detail.title.includes('=>')) {
                meaningVi = detail.title.split('=>')[1].trim();
            }

            const gp = {
                id: `master_${item._id || item.mobileId || Math.random().toString(36).slice(2)}`,
                pattern: pattern,
                level: level,
                category: item.category || '',
                meaningShort: meaningVi,
                meaning: meaningVi,
                meaningFull: explanation || meaningVi,
                structure: structure.length > 0 ? structure : [{ text: pattern, type: 'connector' }],
                tips: tips,
                examples: examples,
                exercises: [],
                quizzes: []
            };

            points.push(gp);
            allGrammarPoints.push(gp);
        }

        console.log(`✅ Hoàn thành ${level}: Đã xử lý ${points.length} mẫu ngữ pháp.`);
    }

    // Build the master_bank textbook format expected by QuizKi
    const masterBankTextbook = {
        id: 'master_bank',
        title: 'Kho Ngữ Pháp Gốc',
        titleVi: 'Kho Ngữ Pháp Trung Tâm',
        levels: ['N5', 'N4', 'N3', 'N2', 'N1'],
        category: 'system',
        lessons: [
            {
                id: 'master_lesson_n5',
                title: 'Kho Ngữ Pháp N5',
                sectionLabel: 'N5',
                points: allGrammarPoints.filter(p => p.level === 'N5')
            },
            {
                id: 'master_lesson_n4',
                title: 'Kho Ngữ Pháp N4',
                sectionLabel: 'N4',
                points: allGrammarPoints.filter(p => p.level === 'N4')
            },
            {
                id: 'master_lesson_n3',
                title: 'Kho Ngữ Pháp N3',
                sectionLabel: 'N3',
                points: allGrammarPoints.filter(p => p.level === 'N3')
            },
            {
                id: 'master_lesson_n2',
                title: 'Kho Ngữ Pháp N2',
                sectionLabel: 'N2',
                points: allGrammarPoints.filter(p => p.level === 'N2')
            },
            {
                id: 'master_lesson_n1',
                title: 'Kho Ngữ Pháp N1',
                sectionLabel: 'N1',
                points: allGrammarPoints.filter(p => p.level === 'N1')
            }
        ]
    };

    const finalOutput = [masterBankTextbook];
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalOutput, null, 2), 'utf-8');

    console.log(`\n🎉 THÀNH CÔNG RỰC RỠ!`);
    console.log(`📁 Đã lưu file dữ liệu: ${OUTPUT_PATH}`);
    console.log(`📊 Tổng số ngữ pháp đã nạp: ${allGrammarPoints.length} mẫu.`);
    levels.forEach(lvl => {
        const count = allGrammarPoints.filter(p => p.level === lvl).length;
        console.log(`   - ${lvl}: ${count} mẫu`);
    });
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
