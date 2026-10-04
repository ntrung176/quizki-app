/**
 * JLPT Explanation & Reading Passage Parser Utility
 * Cleanly parses raw explanations, extracts structured grammar, vocabulary,
 * sentence translations, option breakdowns, and builds interactive sentence breakdowns.
 */

/**
 * Strips HTML tags and normalizes whitespace
 */
export function cleanHtmlText(str) {
    if (!str) return '';
    return str.replace(/<\/?[a-z][\s\S]*>/gi, ' ').replace(/[ \t]+/g, ' ').trim();
}

/**
 * Strips scraper artifacts and cleans explanation text
 */
export function cleanRawExplanationText(raw) {
    if (!raw || typeof raw !== 'string') return '';
    let text = raw
        .replace(/\r/g, '')
        // Remove scraper junk tabs and legacy headers
        .replace(/^[ \t]*Tóm tắt[ \t]*\n+[ \t]*Dịch[ \t]*\n+[ \t]*Hint[ \t]*\n+[ \t]*Memo[ \t]*/i, '')
        .replace(/^[ \t]*Tóm tắt\s*Dịch\s*Hint\s*Memo\s*Từ vựng tổng\s*→?\s*/i, '')
        .replace(/^[ \t]*GIẢI THÍCH ĐÁP ÁN:?[ \t]*/i, '')
        .replace(/^[ \t]*❇[ \t]*TỔNG KẾT NGỮ PHÁP[ \t]*/i, '')
        .replace(/\(Đáp án đúng\s*\)/gi, '')
        .replace(/ĐÁP ÁN\s*:\s*[1-4A-D]/gi, '')
        // Clean excessive tabs and lines
        .replace(/\t+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    return text;
}

/**
 * Parses vocabulary list from explanation text
 * Formats supported:
 * 1. ⊳【Từ Kanji】・kana : nghĩa
 * 2. 📖 Từ vựng... \n • từ (đọc): nghĩa
 * 3. • từ: nghĩa
 */
export function extractVocabList(text) {
    if (!text) return [];
    const vocabList = [];
    const seen = new Set();

    // Pattern 1: ⊳【Từ Kanji】・kana : nghĩa
    const p1Regex = /⊳\s*【([^】]+)】(?:\s*[・:]\s*([^\s:：]+))?\s*[:：]\s*([^\n\r]+)/g;
    let m;
    while ((m = p1Regex.exec(text)) !== null) {
        const kanji = m[1].trim();
        const reading = (m[2] || '').trim();
        const meaning = m[3].trim();
        const key = `${kanji}-${reading}`;
        if (!seen.has(key) && kanji.length > 0) {
            seen.add(key);
            vocabList.push({
                w: kanji,
                read: reading || kanji,
                vi: meaning
            });
        }
    }

    // Pattern 2: • Kanji (reading): nghĩa OR • Từ: nghĩa (only at start of line or bullet)
    const p2Regex = /(?:^|\n)[ \t]*[•・*]\s*([^\s:：(（\n]+)(?:\s*[（(]([^)）]+)[)）])?\s*[:：]\s*([^\n\r]+)/g;
    while ((m = p2Regex.exec(text)) !== null) {
        const kanji = m[1].trim();
        const reading = (m[2] || '').trim();
        const meaning = m[3].trim();

        // Avoid capturing grammar labels, numbers, or header markers
        if (['Ý nghĩa', 'Cấu trúc', 'Cách dùng', 'Ví dụ', 'Lý do đúng', 'Lý do sai', 'Trích dẫn', 'Dịch', 'Mẹo', 'reading'].includes(kanji)) {
            continue;
        }

        const key = `${kanji}-${reading}`;
        if (!seen.has(key) && kanji.length > 0) {
            seen.add(key);
            vocabList.push({
                w: kanji,
                read: reading || kanji,
                vi: meaning
            });
        }
    }

    return vocabList;
}

/**
 * Parses grammar points from explanation text
 * Format: 【〜...】 with Ý nghĩa, Cấu trúc, Cách dùng, ví dụ
 */
export function extractGrammarPoints(text) {
    if (!text) return [];
    const grammarPoints = [];
    const grammarRegex = /【([〜~][^】]+)】([\s\S]*?)(?=(?:【[〜~]|✅|❌|❇|【問|📖|$))/g;
    let m;
    while ((m = grammarRegex.exec(text)) !== null) {
        const point = m[1].trim();
        const body = m[2].trim();

        const meaningMatch = body.match(/[–-]\s*Ý nghĩa\s*[:：]\s*([^\n\r]+)/i);
        const structMatch = body.match(/[–-]\s*Cấu trúc\s*[:：]\s*([^\n\r]+)/i);
        const usageMatch = body.match(/[–-]\s*Cách dùng\s*[:：]\s*([^\n\r]+)/i);

        const examples = [];
        const exRegex = /・([^\n\r]+)/g;
        let em;
        while ((em = exRegex.exec(body)) !== null) {
            const ex = em[1].trim();
            if (ex && !ex.includes(' : ') && !ex.includes(' :')) {
                examples.push(ex);
            }
        }

        grammarPoints.push({
            point,
            meaning: meaningMatch ? meaningMatch[1].trim() : '',
            structure: structMatch ? structMatch[1].trim() : '',
            usage: usageMatch ? usageMatch[1].trim() : '',
            examples
        });
    }
    return grammarPoints;
}

/**
 * Parses sentence translations from explanation text
 */
export function extractExplanationSentences(text, grammarPoints = [], vocabList = []) {
    if (!text) return [];
    const sentences = [];
    const sentenceRegex = /►\s*([^\n\r]+)\n+([\s\S]*?)(?=(?:►|✅|❌|❇|【問|📖|💡|$))/g;
    let m;
    while ((m = sentenceRegex.exec(text)) !== null) {
        const jpLine = m[1].trim();
        const rest = m[2].trim();

        // Strict filter against question stems, option explanations, headers, and scrapers
        if (
            /^[1-4A-D][.．]/.test(jpLine) ||
            /^[①②③④]/.test(jpLine) ||
            /^[✅❌❇✔✖]/.test(jpLine) ||
            /【(問|Câu hỏi|Giải thích|ĐÁP ÁN)/i.test(jpLine) ||
            jpLine.includes('Trích dẫn:') ||
            jpLine.includes('Lý do đúng:') ||
            jpLine.includes('Lý do sai:') ||
            jpLine.includes('GIẢI THÍCH') ||
            /\?$/.test(jpLine) ||
            /([？\?]|どれか|何か|合っているものは)/.test(jpLine)
        ) {
            continue;
        }

        const viLines = rest.split('\n')
            .map(l => l.trim())
            .filter(l => l && !l.startsWith('–') && !l.startsWith('【') && !l.startsWith('⊳') && !l.startsWith('・') && !l.startsWith('•') && !l.startsWith('(') && !l.startsWith('✅') && !l.startsWith('❌'));
        const vi = viLines.join(' ').trim();

        const readMatch = rest.match(/\(([^)]+)\)/);
        const reading = readMatch ? readMatch[1].trim() : '';

        if (jpLine.length > 2) {
            sentences.push({
                jp: jpLine,
                rawJp: jpLine,
                vi: vi,
                reading: reading,
                grammar: grammarPoints.filter(g => jpLine.includes(g.point.replace(/[〜~()（）]/g, ''))),
                vocab: vocabList.filter(v => jpLine.includes(v.w))
            });
        }
    }
    return sentences;
}

/**
 * Comprehensive parser for JLPT explanations
 */
export function parseJlptExplanation(rawText, options = [], correctIndex = -1) {
    if (!rawText || typeof rawText !== 'string') {
        return {
            summary: '',
            mainAnalysis: '',
            correctReason: '',
            correctQuote: '',
            correctTranslation: '',
            wrongReasons: [],
            grammarPoints: [],
            vocabList: [],
            sentences: [],
            tips: '',
            translation: '',
            detailedExplanation: '',
            rawCleanText: '',
            isStructured: false
        };
    }

    let text = cleanRawExplanationText(rawText);
    const vocabList = extractVocabList(text);
    const grammarPoints = extractGrammarPoints(text);
    const sentences = extractExplanationSentences(text, grammarPoints, vocabList);

    // 1. Extract Tips
    let tips = '';
    const tipsMatch = text.match(/(?:💡\s*Mẹo làm bài|Mẹo làm bài|💡\s*Mẹo ghi nhớ|Mẹo ghi nhớ|💡\s*Lưu ý|Lưu ý ngữ pháp|Bí quyết & Mẹo làm bài nhanh|💡\s*BÍ QUYẾT & MẸO LÀM BÀI NHANH|Mẹo tránh bẫy)\s*[:：]\s*([\s\S]*?)(?=(?:📖|❇|$))/i);
    if (tipsMatch) {
        tips = tipsMatch[1].trim();
        text = text.replace(tipsMatch[0], '').trim();
    }

    // 2. Extract Detailed Explanation Block ("📖 Căn cứ & Giải thích chi tiết:")
    let detailedExplanation = '';
    const detailMatch = text.match(/(?:📖\s*Căn cứ\s*(?:&|và)\s*Giải thích chi tiết|Căn cứ\s*(?:&|và)\s*Giải thích chi tiết)\s*[:：]\s*([\s\S]*?)(?=(?:💡|📖\s*Từ vựng|❇|$))/i);
    if (detailMatch) {
        detailedExplanation = detailMatch[1].trim();
        text = text.replace(detailMatch[0], '').trim();
    }

    // 3. Extract Option Analysis ("📌 Phân tích các phương án:")
    let whyLines = [];
    const whyBlockMatch = text.match(/(?:📌\s*Phân tích các phương án|Phân tích các phương án)\s*[:：]\s*([\s\S]*?)(?=(?:📖|💡|❇|$))/i);
    if (whyBlockMatch) {
        const block = whyBlockMatch[1].trim();
        whyLines = block.split(/\n+/).map(l => l.trim()).filter(Boolean);
        text = text.replace(whyBlockMatch[0], '').trim();
    }

    // 4. Extract Quote ("📖 Trích dẫn: 「...」")
    let quote = '';
    const quoteMatch = text.match(/(?:📖\s*Trích dẫn|Trích dẫn)\s*[:：]\s*(?:「([^」]+)」|([^\n\r–-]+))/i);
    if (quoteMatch) {
        quote = (quoteMatch[1] || quoteMatch[2]).trim();
        text = text.replace(quoteMatch[0], '').trim();
    }

    // 5. Extract Option breakdown blocks (✅ and ❌ with 【問...】)
    const optionBlocks = [];
    const optRegex = /(✅|❌)\s*【問\s*(\d+)\s*[:：]\s*(\d+)】([\s\S]*?)(?=(?:✅|❌|❇\s*TỔNG|📖|💡|$))/g;
    let oMatch;
    while ((oMatch = optRegex.exec(text)) !== null) {
        const isCheckmark = oMatch[1] === '✅';
        const optNum = parseInt(oMatch[3], 10);
        const optBody = oMatch[4].trim();

        const reasonMatch = optBody.match(/[–-]\s*Lý do (?:đúng|sai)\s*[:：]\s*([^\n\r]+)/i);
        const optQuoteMatch = optBody.match(/Trích dẫn\s*[:：]\s*(?:「([^」]+)」|([^\n\r–-]+))/i);
        const transMatch = optBody.match(/►\s*([^\n\r]+)/);

        const rawOptText = optBody.split(/(?:Trích dẫn|Lý do|Dịch|–|-|►)/i)[0].trim();

        let matchedIdx = -1;
        if (Array.isArray(options) && options.length > 0) {
            const cleanSnip = rawOptText.replace(/<[^>]*>/g, '').replace(/[\s\u3000\.\(\)（）]/g, '');
            matchedIdx = options.findIndex((optStr) => {
                const cleanOpt = String(optStr).replace(/<[^>]*>/g, '').replace(/[\s\u3000\.\(\)（）]/g, '');
                if (!cleanOpt || !cleanSnip) return false;
                return cleanOpt === cleanSnip || cleanOpt.includes(cleanSnip) || cleanSnip.includes(cleanOpt);
            });
        }

        const finalIdx = matchedIdx >= 0 ? matchedIdx : (optNum - 1);
        const optLetter = finalIdx >= 0 && finalIdx < 26 ? String.fromCharCode(65 + finalIdx) : '';
        const isCorrect = correctIndex >= 0 ? (finalIdx === correctIndex) : isCheckmark;

        const reason = reasonMatch ? reasonMatch[1].trim() : '';
        const optQuote = optQuoteMatch ? (optQuoteMatch[1] || optQuoteMatch[2]).trim() : '';
        const translation = transMatch ? transMatch[1].trim() : '';

        optionBlocks.push({
            isCorrect,
            idx: finalIdx,
            optLetter,
            optText: rawOptText,
            reason: reason,
            quote: optQuote,
            translation: translation,
            rawBody: optBody
        });
    }

    // 6. Extract numbered circled distractors ①, ②, ③, ④
    const circledWrongReasons = [];
    const circledRegex = /([①②③④]|\([1-4]\)|選択肢\s*[0-4]|Phương án\s*[A-D1-4]|Đáp án\s*[A-D1-4])\s*[:：]?\s*([\s\S]*?)(?=(?:[①②③④]|\([1-4]\)|選択肢\s*[0-4]|Phương án\s*[A-D1-4]|Đáp án\s*[A-D1-4]|📖|💡|❇|$))/g;
    let cMatch;
    while ((cMatch = circledRegex.exec(text)) !== null) {
        const marker = cMatch[1];
        let body = cMatch[2].trim();

        let fallbackIdx = -1;
        if (marker.includes('①') || marker.includes('(1)') || marker.includes('1') || marker.includes('A')) fallbackIdx = 0;
        else if (marker.includes('②') || marker.includes('(2)') || marker.includes('2') || marker.includes('B')) fallbackIdx = 1;
        else if (marker.includes('③') || marker.includes('(3)') || marker.includes('3') || marker.includes('C')) fallbackIdx = 2;
        else if (marker.includes('④') || marker.includes('(4)') || marker.includes('4') || marker.includes('D')) fallbackIdx = 3;

        body = body.split(/\n[•・\-]|\n📖|\n💡|\n❇/)[0].trim();

        let matchedIdx = -1;
        if (Array.isArray(options) && options.length > 0) {
            const cleanBody = body.replace(/<[^>]*>/g, '').replace(/[\s\u3000\.\(\)（）]/g, '');
            matchedIdx = options.findIndex((optStr) => {
                const cleanOpt = String(optStr).replace(/<[^>]*>/g, '').replace(/[\s\u3000\.\(\)（）]/g, '');
                if (!cleanOpt) return false;
                return cleanBody.includes(cleanOpt) || cleanOpt.includes(cleanBody);
            });
        }

        const finalIdx = matchedIdx >= 0 ? matchedIdx : fallbackIdx;
        const optLetter = finalIdx >= 0 && finalIdx < 26 ? String.fromCharCode(65 + finalIdx) : marker;
        const isCorrect = correctIndex >= 0 ? (finalIdx === correctIndex) : false;

        if (body.length > 2) {
            circledWrongReasons.push({
                idx: finalIdx,
                option: optLetter,
                text: body,
                isCorrect
            });
        }
    }

    // 7. Extract Translation
    let translation = '';
    const transMatch = text.match(/(?:📖\s*Dịch câu hỏi|Dịch câu hỏi|📖\s*Dịch bài đọc|Dịch nghĩa|Bản dịch|📖\s*Dịch)\s*[:：]\s*([\s\S]*?)(?=(?:💡|📖\s*Từ vựng|❇|$))/i);
    if (transMatch) {
        translation = transMatch[1].trim();
    } else if (sentences.length > 0) {
        translation = sentences.map(s => s.vi).filter(Boolean).join(' ');
    }

    // 8. Extract Verdict / Correct Reason
    let correctReason = '';
    const correctMatch = text.match(/(?:✅\s*(?:Lựa chọn chính xác|Đáp án đúng|Lựa chọn đúng))\s*[:：]?\s*([\s\S]*?)(?=(?:📖|📌|💡|❇|$))/i);
    if (correctMatch) {
        correctReason = correctMatch[1].trim();
    } else {
        const correctBlock = optionBlocks.find(o => o.isCorrect);
        if (correctBlock) {
            correctReason = correctBlock.reason;
            if (!quote && correctBlock.quote) quote = correctBlock.quote;
        } else {
            const genReasonMatch = text.match(/[–-]\s*Lý do đúng\s*[:：]\s*([^\n\r]+)/i);
            if (genReasonMatch) correctReason = genReasonMatch[1].trim();
            else correctReason = text.split(/(?:Trích dẫn|Phân tích|Căn cứ|\n\n)/i)[0].trim();
        }
    }

    correctReason = correctReason
        .replace(/^\([a-d1-4]\)\s*[^–\n]*\n?/i, '')
        .replace(/(?:Trích dẫn|Phân tích|Căn cứ)[\s\S]*$/i, '')
        .trim();

    // 9. Resolve Wrong Reasons
    const wrongReasons = [];
    if (whyLines.length > 0) {
        const wrongOptIndices = options.map((_, i) => i).filter(i => i !== correctIndex);
        const assignedIndices = new Set();
        const parsedLines = [];

        whyLines.forEach(line => {
            const m = line.match(/^([✗xX✓vV✔\-])\s*(?:\(([a-d1-4])\)|\b([a-d1-4])\b|[①②③④])\s*[:：\.]?\s*([\s\S]*)$/i);
            if (m) {
                const marker = m[1];
                const letter = (m[2] || m[3] || '').toLowerCase();
                const body = m[4].trim();
                const isCheck = ['✓', 'v', 'V', '✔'].includes(marker) || /^Đúng/i.test(body);
                if (!isCheck) {
                    parsedLines.push({ letter, body });
                }
            }
        });

        parsedLines.forEach(pl => {
            let matchedIdx = -1;
            let letterIdx = -1;
            if (pl.letter === 'a' || pl.letter === '1') letterIdx = 0;
            else if (pl.letter === 'b' || pl.letter === '2') letterIdx = 1;
            else if (pl.letter === 'c' || pl.letter === '3') letterIdx = 2;
            else if (pl.letter === 'd' || pl.letter === '4') letterIdx = 3;

            if (wrongOptIndices.includes(letterIdx) && !assignedIndices.has(letterIdx)) {
                matchedIdx = letterIdx;
            } else {
                const nextFree = wrongOptIndices.find(idx => !assignedIndices.has(idx));
                if (nextFree !== undefined) matchedIdx = nextFree;
            }

            if (matchedIdx >= 0) {
                assignedIndices.add(matchedIdx);
                wrongReasons.push({
                    idx: matchedIdx,
                    option: String.fromCharCode(65 + matchedIdx),
                    text: pl.body
                });
            }
        });
    } else if (optionBlocks.length > 0) {
        const filtered = optionBlocks.filter(o => !o.isCorrect && (correctIndex < 0 || o.idx !== correctIndex));
        filtered.forEach(wb => {
            wrongReasons.push({
                idx: wb.idx,
                option: wb.optLetter,
                text: wb.reason || wb.translation || 'Phương án này không phù hợp với nội dung bài đọc/ngữ pháp.',
                quote: wb.quote,
                translation: wb.translation
            });
        });
    } else if (circledWrongReasons.length > 0) {
        const filtered = circledWrongReasons.filter(cw => !cw.isCorrect && (correctIndex < 0 || cw.idx !== correctIndex));
        filtered.forEach(cw => {
            wrongReasons.push({
                idx: cw.idx,
                option: cw.option,
                text: cw.text
            });
        });
    }

    wrongReasons.sort((a, b) => a.idx - b.idx);

    const isStructured = !!(
        correctReason || 
        wrongReasons.length > 0 || 
        grammarPoints.length > 0 || 
        vocabList.length > 0 || 
        sentences.length > 0 || 
        tips || 
        detailedExplanation ||
        translation
    );

    return {
        summary: correctReason || translation || '',
        mainAnalysis: detailedExplanation || correctReason,
        correctReason,
        correctQuote: quote,
        correctTranslation: translation,
        wrongReasons,
        grammarPoints,
        vocabList,
        sentences,
        tips,
        translation,
        detailedExplanation,
        rawCleanText: text,
        isStructured
    };
}

/**
 * Builds interactive passageData for any reading passage dynamically
 */
export function buildInteractivePassageData(passageHtmlOrText, explanationText = '', existingPassageData = null) {
    if (existingPassageData && existingPassageData.sentences && existingPassageData.sentences.length > 0) {
        return existingPassageData;
    }

    const rawPassage = passageHtmlOrText || existingPassageData?.japanese || existingPassageData?.rawJapanese || '';
    const cleanPassage = cleanHtmlText(rawPassage);
    if (!cleanPassage && !explanationText) return null;

    const parsedExp = parseJlptExplanation(explanationText);
    const expSentences = parsedExp?.sentences || [];
    const grammarPoints = parsedExp?.grammarPoints || [];
    const vocabList = parsedExp?.vocabList || [];

    let sentences = [];

    if (cleanPassage) {
        // Split cleanPassage by paragraphs / sentences (preserving authentic passage only)
        const lines = cleanPassage.split(/\n+/).map(l => l.trim()).filter(Boolean);
        const passageSegments = [];

        lines.forEach(line => {
            const rawSentences = line.split(/([。！？]+)/).filter(Boolean);
            for (let i = 0; i < rawSentences.length; i += 2) {
                const sText = (rawSentences[i] + (rawSentences[i + 1] || '')).trim();
                if (sText.length > 0) {
                    passageSegments.push(sText);
                }
            }
        });

        sentences = passageSegments.map((seg) => {
            // Match sentence with explanation translation if available
            const matched = expSentences.find(s => {
                const sClean = s.rawJp.replace(/[\s\u3000]+/g, '');
                const segClean = seg.replace(/[\s\u3000]+/g, '');
                return sClean === segClean || sClean.includes(segClean) || segClean.includes(sClean);
            });

            return {
                jp: seg,
                rawJp: seg,
                vi: matched ? matched.vi : '',
                reading: matched ? matched.reading : '',
                grammar: grammarPoints.filter(g => seg.includes(g.point.replace(/[〜~()（）]/g, ''))),
                vocab: vocabList.filter(v => seg.includes(v.w))
            };
        });
    } else if (expSentences.length > 0) {
        sentences = expSentences;
    }

    return {
        title: existingPassageData?.title || 'Đọc hiểu chuyên sâu',
        titleVi: existingPassageData?.titleVi || '',
        japanese: cleanPassage,
        rawJapanese: cleanPassage,
        vietnamese: parsedExp?.translation || existingPassageData?.vietnamese || '',
        sentences: sentences,
        grammarPoints: grammarPoints,
        vocabList: vocabList
    };
}
