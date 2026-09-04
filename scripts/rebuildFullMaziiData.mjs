import fs from 'fs';
import path from 'path';

const cacheDir = path.join(process.cwd(), 'scripts/.grammar_cache');
const dataPath = path.join(process.cwd(), 'public/data/grammar_data.json');

if (!fs.existsSync(dataPath)) {
    console.error('Không tìm thấy file public/data/grammar_data.json');
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

const PHRASE_TRANSLATIONS = [
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

function translateStructureLine(str) {
    if (!str) return '';
    let result = str;
    for (const [regex, replacement] of PHRASE_TRANSLATIONS) {
        result = result.replace(regex, replacement);
    }
    return result;
}

function cleanSynopsis(syn) {
    if (!syn) return [];
    // Convert line breaks while preserving <s>...</s> and other inline styling tags
    return syn
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/div>\s*<div[^>]*>/gi, '\n')
        .replace(/<\/p>\s*<p[^>]*>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/?(?:b|strong|i|em|span|div|p|ruby|rb|rt|rp)[^>]*>/gi, '') // remove container & formatting tags except <s> and <del>
        .replace(/&nbsp;/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .split(/\n+/)
        .map(s => s.replace(/^[✦•\-\*🔹]\s*/, '').trim())
        .map(s => translateStructureLine(s))
        .filter(Boolean);
}

function cleanExplain(exp) {
    if (!exp) return '';
    return exp
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

let totalPoints = 0;
let updatedStructure = 0;

for (const tb of data) {
    for (const ls of tb.lessons || []) {
        for (const pt of ls.points || []) {
            totalPoints++;
            const rawId = pt.id ? pt.id.replace(/^master_/, '') : '';
            const detailFile = path.join(cacheDir, `detail_${rawId}.json`);
            if (fs.existsSync(detailFile)) {
                try {
                    const detail = JSON.parse(fs.readFileSync(detailFile, 'utf-8'));
                    if (detail && detail.usages && detail.usages.length > 0) {
                        const u = detail.usages[0];
                        // Structure / Connection
                        const synLines = cleanSynopsis(u.synopsis);
                        if (synLines.length > 0) {
                            pt.connection = synLines;
                            pt.structureRaw = synLines.join('\n');
                            pt.structure = synLines.map(line => ({ text: line, type: 'connector' }));
                            updatedStructure++;
                        }

                        // Examples with furigana & translation
                        if (Array.isArray(u.examples) && u.examples.length > 0) {
                            pt.examples = u.examples.map((ex, exIdx) => {
                                const currentEx = (pt.examples || [])[exIdx];
                                return {
                                    ja: (ex.content || '').trim(),
                                    furigana: (ex.transcription || '').trim(),
                                    vi: (currentEx && currentEx.vi) ? currentEx.vi : (ex.mean || '').trim()
                                };
                            }).filter(ex => ex.ja);
                        }

                        if (u.explain && (!pt.meaningFull || pt.meaningFull.length < 20)) {
                            pt.meaningFull = cleanExplain(u.explain);
                        }
                    }
                } catch (err) {
                    console.warn(`Lỗi xử lý ${rawId}:`, err.message);
                }
            } else if (pt.connection && pt.connection.length > 0) {
                pt.connection = pt.connection.map(translateStructureLine);
                pt.structureRaw = pt.connection.join('\n');
                pt.structure = pt.connection.map(line => ({ text: line, type: 'connector' }));
                updatedStructure++;
            }
        }
    }
}

console.log(`Đã xử lý: Tổng = ${totalPoints}, Cập nhật cấu trúc tiếng Việt chuẩn = ${updatedStructure}`);
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
console.log('✅ Đã lưu xong public/data/grammar_data.json!');
