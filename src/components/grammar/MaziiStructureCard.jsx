import React from 'react';

const TRANSLATIONS = [
    // Long phrases and descriptions first
    [/\bModifies\s+the\s+noun\s+that\s+follows\.?/gi, 'Bổ nghĩa cho danh từ đi liền sau.'],
    [/\bModify\s+the\s+noun\s+following\s+it\.?/gi, 'Bổ nghĩa cho danh từ đi liền sau.'],
    [/\bUsed\s+to\s+present\s+a\s+conclusion\s+drawn\s+as\s+a\s+result\s+of\s+the\s+event\s+expressed\s+in\s+the\s+preceding\s+clause[^\n]+/gi, 'Dùng để đưa ra kết luận từ nguyên nhân, lý do ở mệnh đề trước.'],
    [/\bThis\s+is\s+a\s+way\s+of\s+speaking\s+that\s+strongly\s+expresses\s+one's\s+assertion[^\n]+/gi, 'Cách nói khẳng định mạnh mẽ của người nói, có thể mang sắc thái áp đặt.'],
    [/\bThe\s+verb\s+conjugated\s+into\s+the\s+te-form[^\n]+/gi, 'Động từ thể「て」dùng để nối câu, liệt kê hành động liên tiếp.'],
    [/\bThe\s+verb\s+conjugated\s+into[^\n]+/gi, 'Động từ thể「て」dùng để nối câu, liệt kê hành động liên tiếp.'],
    [/\bSpecial\s+verbs\s+of\s+honorific\s+expressions\b/gi, 'Các động từ kính ngữ đặc biệt'],
    [/\bThe\s+verbs\s+have\s+special\s+humble\s+form\b/gi, 'Các động từ có dạng khiêm nhường ngữ đặc biệt'],
    [/\bThis\s+is\s+the\s+way\s+to\s+say\s+the\s+beginning\.?/gi, 'Cách mở đầu câu nói / câu chuyện.'],
    [/\bUsed\s+to\s+talk\s+about\s+something\s+in\s+the\s+future\.?/gi, 'Dùng để nói về điều gì đó trong tương lai.'],
    [/\bThis\s+is\s+a\s+way\s+of\s+speaking,\s+with\s+the\s+nature\s+of\s+writing\.?/gi, 'Cách diễn đạt mang tính văn viết.'],
    [/\bOften\s+used\s+in\s+journalistic\s+writing\s+or\s+essays,\s+that\s+is,\s+formal\s+writing\.?/gi, 'Thường dùng trong văn viết trang trọng, báo chí hoặc nghị luận.'],
    [/\bThe\s+following\s+sentence\s+is\s+a\s+sentence\s+expressing\s+conclusions\s+and\s+results\.?/gi, 'Vế câu sau thể hiện kết luận hoặc kết quả.'],
    [/\bExpressing\s+judgment\s+and\s+evaluation\s+of\s+an\s+issue\s+that\s+the\s+person\s+talking\s+about\s+has\s+witnessed\s+or\s+knows\s+about\.?/gi, 'Thể hiện phán đoán, đánh giá về một sự việc mà người nói đã chứng kiến hoặc biết.'],
    [/\bUsed\s+to\s+express\s+regret\s+or\s+blame\.?/gi, 'Dùng để thể hiện sự hối tiếc hoặc trách móc.'],
    [/\bIn\s+this\s+particular\s+case:?/gi, 'Trường hợp đặc biệt:'],
    [/\bUsed\s+as\s+a\s+speculative\s+expression\s+with\s+the\s+same\s+meaning\s+as\b/gi, 'Dùng như cách nói phỏng đoán với ý nghĩa tương tự như'],
    [/\bUsed\s+to\b/gi, 'Dùng để'],

    // Additional structure descriptions and pronouns
    [/\bare\s+all\s+positional\s+pronouns\.?/gi, 'đều là các đại từ chỉ vị trí, phương hướng.'],
    [/\ball\s+positional\s+pronouns\.?/gi, 'các đại từ chỉ vị trí, phương hướng.'],
    [/\bpositional\s+pronouns\.?/gi, 'đại từ chỉ vị trí, phương hướng'],
    [/\bpositional\s+pronoun\.?/gi, 'đại từ chỉ vị trí, phương hướng'],
    [/\bis\s+often\s+used\s+in\s+greetings\s+to\s+emphasize\s+thanks\s+or\s+apology\.?/gi, 'thường được dùng trong chào hỏi để nhấn mạnh lời cảm ơn hoặc xin lỗi.'],
    [/\bis\s+used\s+as\s+a\s+trợ\s+từ\s+in\s+a\s+Câu\.?/gi, 'được dùng làm trợ từ trong câu.'],
    [/\bis\s+used\s+as\s+a\s+particle\s+in\s+a\s+sentence\.?/gi, 'được dùng làm trợ từ trong câu.'],
    [/\bis\s+a\s+Nhóm\s+(\d+)\s+Động\s+từ\.?/gi, 'là các động từ nhóm $1.'],
    [/\bis\s+a\s+Group\s+(\d+)\s+Verb\.?/gi, 'là các động từ nhóm $1.'],
    [/\bis\s+a\s+liên\s+từ\.?/gi, 'là một liên từ.'],
    [/\bis\s+a\s+conjunction\.?/gi, 'là một liên từ.'],
    [/\bis\s+a\s+particle\.?/gi, 'là một trợ từ.'],
    [/\bis\s+a\s+trợ\s+từ\.?/gi, 'là một trợ từ.'],
    [/\bNote:?/gi, 'Chú ý:'],

    // Verb forms with adjectives/nouns
    [/\bV\s*\(\s*affirmative\s+(?:formal|plain)\s+form\s*\)/gi, 'V (thể thông thường dạng khẳng định)'],
    [/\bV\s*\(\s*affirmative\s+sentence\s*\)/gi, 'V (câu khẳng định)'],
    [/\baffirmative\s+(?:formal|plain)\s+form\b/gi, 'thể thông thường dạng khẳng định'],
    [/\baffirmative\s+form\b/gi, 'dạng khẳng định'],
    [/\baffirmative\b/gi, 'dạng khẳng định'],
    [/\bV\s*\(\s*root\s+form\s*\)/gi, 'V (thể từ điển)'],
    [/\bV\s*\(\s*dictionary\s+form\s*\)/gi, 'V (thể từ điển)'],
    [/\broot\s+form\b/gi, 'thể từ điển'],
    [/\bdictionary\s+form\b/gi, 'thể từ điển'],
    [/\bformal\s+form\b/gi, 'thể thông thường'],
    [/\bplain\s+form\b/gi, 'thể thông thường'],
    [/\bcasual\s+form\b/gi, 'thể thông thường'],
    [/\bordinary\s+form\b/gi, 'thể thông thường'],
    [/\bgeneral\s+form\b/gi, 'thể thông thường'],
    [/\bshort\s+form\b/gi, 'thể ngắn'],
    [/\bpast\s+form\b/gi, 'thể quá khứ (た)'],
    [/\bnegative\s+form\b/gi, 'thể phủ định (ない)'],
    [/\bnegative\s+expression\b/gi, 'dạng phủ định'],
    [/\bNegative\s+expression\b/gi, 'Dạng phủ định'],
    [/\bvolitional\s+form\b/gi, 'thể ý chí'],
    [/\bpotential\s+form\b/gi, 'thể khả năng'],
    [/\bintransitive\s+passive\s+form\b/gi, 'thể bị động của tự động từ'],
    [/\bpassive\s+form\b/gi, 'thể bị động'],
    [/\bcausative\s+passive\s+form\b/gi, 'thể sai khiến bị động'],
    [/\bcausative-passive\s+form\b/gi, 'thể sai khiến bị động'],
    [/\bcausative\s+form\b/gi, 'thể sai khiến'],
    [/\bimperative\s+form\b/gi, 'thể mệnh lệnh'],
    [/\bconditional\s+form\b/gi, 'thể điều kiện (ば)'],
    [/\bprohibitive\s+form\b/gi, 'thể cấm chỉ'],
    [/\bte-form\b/gi, 'thể て'],
    [/\bte\s+form\b/gi, 'thể て'],
    [/\bta-form\b/gi, 'thể た'],
    [/\bta\s+form\b/gi, 'thể た'],
    [/\bnai-form\b/gi, 'thể ない'],
    [/\bnai\s+form\b/gi, 'thể ない'],
    [/\bmasu-form\b/gi, 'thể ます'],
    [/\bmasu\s+form\b/gi, 'thể ます'],
    [/\bba-form\b/gi, 'thể ば'],
    [/\bba\s+form\b/gi, 'thể ば'],
    [/\btara-form\b/gi, 'thể たら'],
    [/\btara\s+form\b/gi, 'thể たら'],
    [/\bstem\s+form\b/gi, 'thể bỏ ます (stem)'],
    [/\bverb\s+stem\b/gi, 'thể bỏ ます (stem)'],
    [/\bReported\s+speech\b/gi, 'Câu tường thuật'],
    [/\bDirect\s+quote\b/gi, 'Trích dẫn trực tiếp'],
    [/\bIndirect\s+quote\b/gi, 'Trích dẫn gián tiếp'],
    [/\bInterrogative\s+words?\b/gi, 'Từ để hỏi'],
    [/\binterrogative\s+words?\b/gi, 'từ để hỏi'],
    [/\bInterrogative\s+sentence\b/gi, 'Câu hỏi'],
    [/\binterrogative\s+sentence\b/gi, 'câu hỏi'],
    [/\bGroup\s+I\b/gi, 'Nhóm 1'],
    [/\bGroup\s+II\b/gi, 'Nhóm 2'],
    [/\bGroup\s+III\b/gi, 'Nhóm 3'],
    [/\bGroup\s+1\b/gi, 'Nhóm 1'],
    [/\bGroup\s+2\b/gi, 'Nhóm 2'],
    [/\bGroup\s+3\b/gi, 'Nhóm 3'],
    [/\bClause\s*1\b/gi, 'Mệnh đề 1'],
    [/\bClause\s*2\b/gi, 'Mệnh đề 2'],
    [/\bClause\s*3\b/gi, 'Mệnh đề 3'],
    [/\bClause\b/gi, 'Mệnh đề'],
    [/\bSentence\s*1\b/gi, 'Câu 1'],
    [/\bSentence\s*2\b/gi, 'Câu 2'],
    [/\bSentence\s*3\b/gi, 'Câu 3'],
    [/\bSentence\b/gi, 'Câu'],
    [/\bParagraph\b/gi, 'Đoạn văn'],
    [/\bPhrase\b/gi, 'Cụm từ'],
    [/\bNoun\b/gi, 'Danh từ'],
    [/\bNouns\b/gi, 'Danh từ'],
    [/\bVerb\b/gi, 'Động từ'],
    [/\bVerbs\b/gi, 'Động từ'],
    [/\bAdjective\b/gi, 'Tính từ'],
    [/\bAdjectives\b/gi, 'Tính từ'],
    [/\bQuantifier\b/gi, 'Lượng từ'],
    [/\bQuantity\b/gi, 'Số lượng'],
    [/\bduration\s+of\s+time\b/gi, 'khoảng thời gian'],
    [/\bduration\b/gi, 'khoảng thời gian'],
    [/\bpeople\b/gi, 'người'],
    [/\bPerson\b/gi, 'Người'],
    [/\bThing\b/gi, 'Sự vật/Đồ vật'],
    [/\bThings\b/gi, 'Sự vật/Đồ vật'],
    [/\bPlace\b/gi, 'Địa điểm'],
    [/\bplace\b/gi, 'địa điểm'],
    [/\bTime\b/gi, 'Thời gian'],
    [/\btime\b/gi, 'thời gian'],
    [/\bGiver\b/gi, 'Người cho/tặng'],
    [/\bReceiver\b/gi, 'Người nhận'],
    [/\bhonorific\b/gi, 'kính ngữ'],
    [/\bhumble\b/gi, 'khiêm nhường ngữ'],
    [/\bparticle\b/gi, 'trợ từ'],
    [/\bAuxiliary\s+words\b/gi, 'trợ từ'],
    [/\bconjunction\b/gi, 'liên từ'],
    [/\bTopic\b/gi, 'Chủ đề'],
    [/\bSubject\b/gi, 'Chủ ngữ'],
    [/\bObject\b/gi, 'Tân ngữ'],
    [/\baction\b/gi, 'hành động'],
    [/\bactivity\b/gi, 'hoạt động'],
    [/\bwords\b/gi, 'từ'],
    [/\bword\b/gi, 'từ']
];

function translateText(str) {
    if (!str) return '';
    let result = str;
    for (const [regex, replacement] of TRANSLATIONS) {
        result = result.replace(regex, replacement);
    }
    return result;
}

/**
 * MaziiStructureCard
 * Renders structured grammar formulas with:
 * - Color-coded badge chips for Verbs, Nouns, Adjectives, Clauses
 * - Elegant framed card row with subtle border & shadow
 * - Strikethrough <s>...</s> / <del>...</del> / <strike>...</strike> support
 * - Clean operators (+, /, ➔) and bold Japanese pattern segments
 */
const MaziiStructureCard = ({ formula, structure, pattern, isFirst = true, index }) => {
    const rawFormula = formula || (typeof structure === 'string' ? structure : structure?.text) || '';
    if (!rawFormula || typeof rawFormula !== 'string') return null;

    let cleanFormula = rawFormula
        .replace(/^[✦•\-\*🔹]\s*/, '')
        .trim();

    cleanFormula = translateText(cleanFormula);
    if (!cleanFormula) return null;

    // Detect if this line starts with a number like "1." or "2."
    const numberMatch = cleanFormula.match(/^(\d+\.)\s*(.*)$/);
    const isNumbered = Boolean(numberMatch);
    const numberPrefix = numberMatch ? numberMatch[1] : null;
    const textContent = numberMatch ? numberMatch[2] : cleanFormula;

    // Standardize operators
    const normalizedText = textContent
        .replace(/✚/g, ' + ')
        .replace(/(?:➔|->)/g, ' ➔ ');

    // Protect HTML tags (<s>...</s>, <del>...</del>, <strike>...</strike>) so that / does not split them
    const tagPlaceholders = [];
    const protectedFormula = normalizedText.replace(/<(?:s|del|strike)>[\s\S]*?<\/(?:s|del|strike)>/gi, (match) => {
        const id = `__TAG_${tagPlaceholders.length}__`;
        tagPlaceholders.push(match);
        return id;
    });

    // Tokenize: Grammatical labels (requiring unicode letter boundaries), operators (+, /, ➔), placeholders
    const tokenRegex = /((?<![\p{L}\p{N}])V(?:__TAG_\d+__)?\d*(?:\s*\([^)]+\))?(?![\p{L}\p{N}])|(?<![\p{L}\p{N}])V-(?:る|ない|ている|てある|て|た|ます|stem|意向形|可能形|受身|使役|使役受身|条件形|ば|命令形|普通形|辞書形)(?![\p{L}\p{N}])|(?<![\p{L}\p{N}])(?:な|い)?adj(?:__TAG_\d+__)?(?:\s*\([^)]+\))?(?![\p{L}\p{N}])|(?<![\p{L}\p{N}])A-(?:い|な|く|stem|普通形)(?![\p{L}\p{N}])|(?<![\p{L}\p{N}])A[いな]?(?:__TAG_\d+__)?\d*(?:\s*\([^)]+\))?(?![\p{L}\p{N}])|(?<![\p{L}\p{N}])Na(?:__TAG_\d+__)?\d*(?![\p{L}\p{N}])|(?<![\p{L}\p{N}])N(?:__TAG_\d+__)?\d*(?:\s*\([^)]+\))?(?![\p{L}\p{N}])|(?<![\p{L}\p{N}])Danh từ(?![\p{L}\p{N}])|(?<![\p{L}\p{N}])Tính từ(?![\p{L}\p{N}])|(?<![\p{L}\p{N}])(?:Mệnh đề|Câu)\s*\d*(?:\s*\([^)]+\))?(?![\p{L}\p{N}])|__TAG_\d+__|\+|\/|／|➔)/giu;

    const rawParts = protectedFormula.split(tokenRegex).filter(p => p !== undefined && p !== '');

    // Restore protected tags into parts
    const parts = rawParts.map(part => {
        return part.replace(/__TAG_(\d+)__/g, (_, idx) => tagPlaceholders[Number(idx)] || '');
    });

    // Render HTML strikethrough inside a token
    const renderWithStrikethrough = (str, keyPrefix = '') => {
        if (!str) return null;
        const subparts = str.split(/(<\/?(?:s|del|strike)>)/gi);
        let inStrike = false;

        return subparts.map((sub, idx) => {
            if (/^<(?:s|del|strike)>$/i.test(sub)) {
                inStrike = true;
                return null;
            }
            if (/^<\/(?:s|del|strike)>$/i.test(sub)) {
                inStrike = false;
                return null;
            }
            if (!sub) return null;

            if (inStrike) {
                return (
                    <del key={`${keyPrefix}-${idx}`} className="line-through opacity-70 decoration-slate-400 dark:decoration-slate-500 font-medium px-0.5">
                        {sub}
                    </del>
                );
            }
            return <span key={`${keyPrefix}-${idx}`}>{sub}</span>;
        }).filter(Boolean);
    };

    const renderToken = (token, idx) => {
        const t = token.trim();
        if (!t) return <span key={idx}> </span>;

        // Operator +
        if (t === '+') {
            return (
                <span key={idx} className="text-slate-400 dark:text-slate-500 font-bold px-1 select-none text-xs">
                    +
                </span>
            );
        }

        // Operator /
        if (t === '/' || t === '／') {
            return (
                <span key={idx} className="text-slate-300 dark:text-slate-600 font-bold px-1.5 select-none text-xs">
                    /
                </span>
            );
        }

        // Operator ➔
        if (t === '➔') {
            return (
                <span key={idx} className="text-slate-400 dark:text-slate-500 font-bold px-1 select-none text-xs">
                    ➔
                </span>
            );
        }

        // Verb token
        if (/^V/i.test(t)) {
            return (
                <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs md:text-sm font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-japanese tracking-normal">
                    {renderWithStrikethrough(t, `v-${idx}`)}
                </span>
            );
        }

        // Noun token
        if (/^N\d*/i.test(t) || /^Danh từ/i.test(t)) {
            return (
                <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs md:text-sm font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 font-japanese tracking-normal">
                    {renderWithStrikethrough(t, `n-${idx}`)}
                </span>
            );
        }

        // Adjective token
        if (/^(?:(?:な|い)?adj|A[いな\d\-(]|Na|Tính từ)/i.test(t) || t === 'A' || t === 'Na') {
            return (
                <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs md:text-sm font-semibold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 font-japanese tracking-normal">
                    {renderWithStrikethrough(t, `a-${idx}`)}
                </span>
            );
        }

        // Clause / Sentence token
        if (/^(?:Mệnh đề|Câu)/i.test(t)) {
            return (
                <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs md:text-sm font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 tracking-normal">
                    {renderWithStrikethrough(t, `c-${idx}`)}
                </span>
            );
        }

        // Standard Japanese text and particles
        return (
            <span key={idx} className="font-japanese text-slate-800 dark:text-slate-100 font-medium text-sm md:text-[15px] leading-relaxed">
                {renderWithStrikethrough(token, `txt-${idx}`)}
            </span>
        );
    };

    return (
        <div className="group bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl p-3 md:p-3.5 flex items-center gap-3 transition-all duration-150 shadow-2xs hover:border-blue-300 dark:hover:border-blue-600/60 w-full">
            {/* Index badge or blue bullet */}
            {isNumbered ? (
                <span className="w-5 h-5 rounded-full bg-[#1d70b8]/15 dark:bg-sky-400/20 text-[#1d70b8] dark:text-sky-300 text-xs font-black flex items-center justify-center shrink-0 select-none">
                    {numberPrefix.replace('.', '')}
                </span>
            ) : (
                <span className="w-5 h-5 rounded-full bg-blue-50 dark:bg-slate-700/50 text-[#1d70b8] dark:text-sky-400 text-xs font-black flex items-center justify-center shrink-0 select-none">
                    ●
                </span>
            )}

            {/* Formula tokens container */}
            <div className="flex-1 flex items-center flex-wrap gap-1.5 font-japanese py-0.5">
                {parts.map((p, idx) => renderToken(p, idx))}
            </div>
        </div>
    );
};

export default MaziiStructureCard;
