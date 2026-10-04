// Helper to cache and extract Deep Grammar information for any pattern

let cachedDeepData = null;
let deepDataPromise = null;
let cachedNuances = null;
let nuancesPromise = null;

export const loadDeepGrammarData = async () => {
    if (cachedDeepData) return cachedDeepData;
    if (!deepDataPromise) {
        deepDataPromise = fetch('/data/deep_grammar_data.json')
            .then(res => res.ok ? res.json() : {})
            .then(data => {
                cachedDeepData = data;
                return data;
            })
            .catch(err => {
                console.warn('Failed to load deep grammar data:', err);
                return {};
            });
    }
    return deepDataPromise;
};

export const loadGrammarNuancesData = async () => {
    if (cachedNuances) return cachedNuances;
    if (!nuancesPromise) {
        nuancesPromise = fetch('/data/grammar_nuances.json')
            .then(res => res.ok ? res.json() : {})
            .then(data => {
                cachedNuances = data;
                return data;
            })
            .catch(err => {
                console.warn('Failed to load grammar nuances:', err);
                return {};
            });
    }
    return nuancesPromise;
};

export const findNuancesForPattern = async (rawPattern) => {
    if (!rawPattern) return [];
    const data = await loadGrammarNuancesData();
    if (!data) return [];

    const cleanP = cleanPatternString(rawPattern);
    if (data[cleanP]) return data[cleanP];
    if (data[rawPattern]) return data[rawPattern];

    for (const [k, v] of Object.entries(data)) {
        const cleanK = cleanPatternString(k);
        if (cleanK && (cleanP === cleanK || cleanP.includes(cleanK) || cleanK.includes(cleanP))) {
            return v;
        }
    }
    return [];
};


// Normalize pattern helper
export const cleanPatternString = (p) => {
    if (!p) return '';
    return p.replace(/^[〜～~]/, '').replace(/[〜～~]$/, '').trim();
};

export const findDeepGrammarForPattern = async (rawPattern) => {
    if (!rawPattern) return null;
    const data = await loadDeepGrammarData();
    if (!data) return null;

    // 1. Direct match
    if (data[rawPattern]) return data[rawPattern];

    // 2. Cleaned match
    const targetClean = cleanPatternString(rawPattern);
    for (const [key, val] of Object.entries(data)) {
        if (cleanPatternString(key) === targetClean) {
            return val;
        }
    }

    // 3. Substring match
    for (const [key, val] of Object.entries(data)) {
        const cleanK = cleanPatternString(key);
        if (cleanK && (targetClean.includes(cleanK) || cleanK.includes(targetClean))) {
            return val;
        }
    }

    return null;
};

// Extract structured blocks from deep data
export const parseDeepSections = (deepObj) => {
    if (!deepObj || !deepObj.sections) return null;

    let mentalModel = null;
    let explanation = '';
    let speechType = '';
    let formality = '';
    let nuanceComparisons = [];
    let cultureNotes = [];
    let cultureExamples = [];
    let dialogues = [];
    let exercises = [];
    let summaryTable = { headers: ['Mục', 'Tóm tắt'], rows: [], keySentence: '' };

    deepObj.sections.forEach(sec => {
        const title = (sec.title || '').toLowerCase();

        // 1. Nghĩa chính / Mental Model
        if (title.includes('nghĩa') || title.includes('ý nghĩa')) {
            sec.blocks?.forEach(b => {
                if (b.type === 'p') {
                    explanation += (explanation ? '\n\n' : '') + b.text;
                    if (b.text.includes('khẩu ngữ')) speechType = 'Khẩu ngữ';
                    else if (b.text.includes('văn viết')) speechType = 'Văn viết';
                    else if (b.text.includes('trang trọng')) formality = 'Trang trọng';
                    else if (b.text.includes('thân mật')) formality = 'Thân mật';
                } else if (b.type === 'callout' && (b.kind === 'key' || b.text.includes('Công thức tâm lý'))) {
                    mentalModel = b.text.replace(/🔑\s*Công thức tâm lý:\s*/i, '').replace(/["']/g, '');
                }
            });
        }

        // 2. Phân biệt sắc thái / Nuance
        if (title.includes('sắc thái') || title.includes('phân biệt') || title.includes('so sánh')) {
            sec.blocks?.forEach(b => {
                if (b.type === 'table') {
                    (b.rows || []).forEach(row => {
                        nuanceComparisons.push({
                            pattern: row[0],
                            formality: row[1],
                            note: row[2] || row[1]
                        });
                    });
                } else if (b.type === 'callout') {
                    cultureNotes.push(b.text);
                }
            });
        }

        // 3. Lưu ý văn hóa / Traps
        if (title.includes('văn hóa') || title.includes('lưu ý')) {
            sec.blocks?.forEach(b => {
                if (b.type === 'callout') {
                    cultureNotes.push(b.text);
                } else if (b.type === 'examples') {
                    cultureExamples.push(...(b.items || []));
                }
            });
        }

        // 4. Hội thoại / Dialogue
        if (title.includes('hội thoại') || title.includes('giao tiếp')) {
            sec.blocks?.forEach(b => {
                if (b.type === 'dialogue') {
                    dialogues.push(b);
                }
            });
        }

        // 5. Luyện tập / Drills
        if (title.includes('luyện tập') || title.includes('bài tập')) {
            sec.blocks?.forEach(b => {
                if (b.type === 'practice') {
                    exercises.push(...(b.exercises || []));
                }
            });
        }

        // 6. Tổng kết nhanh
        if (title.includes('tổng kết') || title.includes('bảng')) {
            sec.blocks?.forEach(b => {
                if (b.type === 'table') {
                    summaryTable.headers = b.headers || ['Mục', 'Tóm tắt'];
                    summaryTable.rows = b.rows || [];
                } else if (b.type === 'callout' && b.text.includes('câu')) {
                    summaryTable.keySentence = b.text.replace(/^[^\w\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uffef\u4e00-\u9faf]*/, '').replace(/✅\s*Học thuộc 1 câu "đinh":\s*/i, '');
                }
            });
        }
    });

    return {
        mentalModel,
        explanation,
        speechType,
        formality,
        nuanceComparisons,
        cultureNotes,
        cultureExamples,
        dialogues,
        exercises,
        summaryTable
    };
};
