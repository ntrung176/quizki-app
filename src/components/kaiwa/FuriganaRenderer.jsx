import React, { memo } from 'react';
import { getSinoVietnamese } from '../../utils/kanjiHVLookup';

const tokenCache = new Map();

const isKanaOnly = (str) => typeof str === 'string' && /^[\u3040-\u309F\u30A0-\u30FF\s、。！？〜…・]+$/.test(str);
const isKanjiChar = (ch) => typeof ch === 'string' && /[\u4E00-\u9FAF\u3400-\u4DBF\u3005]/.test(ch);

/**
 * Parses and caches Japanese text with Furigana syntax:
 * - {漢字|かんじ}
 * - {使用済|しようず|み} (multi-part with okurigana)
 * - {使用|しよう|済|ず} (multi-ruby pairs)
 * - 漢字(かんじ) or 漢字（かんじ）(parenthesis format)
 * - Plain text
 */
export function getParsedTokens(textWithFurigana) {
    if (!textWithFurigana) return [];
    if (tokenCache.has(textWithFurigana)) {
        return tokenCache.get(textWithFurigana);
    }

    let cleanText = textWithFurigana;

    // 1. Convert Kanji(reading) or Kanji（reading）into {Kanji|reading} syntax
    cleanText = cleanText.replace(/([\u4E00-\u9FAF\u3400-\u4DBF\u3005]+)[（\(]([\u3040-\u309F\u30A0-\u30FF\s]+)[）\)]/g, '{$1|$2}');

    // 2. Remove unwanted spaces inserted between Japanese tokens / furigana brackets
    cleanText = cleanText
        .replace(/\}\s+([ぁ-んァ-ヶ一-龯、。！？「」・…〜\w])/g, '}$1')
        .replace(/([ぁ-んァ-ヶ一-龯、。！？「」・…〜\w])\s+\{/g, '$1{')
        .replace(/([ぁ-んァ-ヶ一-龯])\s+([ぁ-んァ-ヶ一-龯])/g, '$1$2')
        .replace(/「\s+/g, '「')
        .replace(/\s+」/g, '」')
        .replace(/\s+([？!！。、])/g, '$1');

    // 3. Regex to match any {content} or plain text
    const regex = /\{([^{}]+)\}|([^{}]+)/g;
    const tokens = [];
    let match;

    while ((match = regex.exec(cleanText)) !== null) {
        if (match[1] !== undefined) {
            const inner = match[1].trim();
            if (inner.includes('|')) {
                const parts = inner.split('|').map(p => p.trim()).filter(Boolean);

                if (parts.length === 2) {
                    tokens.push({ isRuby: true, kanji: parts[0], reading: parts[1] });
                } else if (parts.length === 3) {
                    if (isKanaOnly(parts[2])) {
                        tokens.push({ isRuby: true, kanji: parts[0], reading: parts[1] });
                        tokens.push({ isRuby: false, text: parts[2] });
                    } else if (parts[0].length === 2 && isKanaOnly(parts[1]) && isKanaOnly(parts[2])) {
                        tokens.push({ isRuby: true, kanji: parts[0][0], reading: parts[1] });
                        tokens.push({ isRuby: true, kanji: parts[0][1], reading: parts[2] });
                    } else {
                        tokens.push({ isRuby: true, kanji: parts[0], reading: parts[1] + parts[2] });
                    }
                } else if (parts.length >= 4 && parts.length % 2 === 0) {
                    for (let k = 0; k < parts.length; k += 2) {
                        tokens.push({ isRuby: true, kanji: parts[k], reading: parts[k + 1] });
                    }
                } else if (parts.length >= 4 && parts.length % 2 === 1) {
                    for (let k = 0; k < parts.length - 1; k += 2) {
                        tokens.push({ isRuby: true, kanji: parts[k], reading: parts[k + 1] });
                    }
                    tokens.push({ isRuby: false, text: parts[parts.length - 1] });
                } else if (parts.length === 1) {
                    tokens.push({ isRuby: false, text: parts[0] });
                }
            } else {
                tokens.push({ isRuby: false, text: inner });
            }
        } else if (match[2]) {
            tokens.push({ isRuby: false, text: match[2] });
        }
    }

    if (tokenCache.size > 2000) tokenCache.clear();
    tokenCache.set(textWithFurigana, tokens);
    return tokens;
}

/**
 * Extracts Sino-Vietnamese (Âm Hán Việt) for all Kanji characters in matched items.
 * e.g. "小田急電鉄" -> "TIỂU ĐIỀN CẤP ĐIỆN THIẾT"
 * e.g. "抜き取り" -> "BẠT THỦ"
 */
function extractSinoVietnameseForWord(charsList) {
    if (!Array.isArray(charsList) || charsList.length === 0) return '';
    const sinoList = [];
    const seenKanji = new Set();

    charsList.forEach(item => {
        const ch = item.char;
        if (isKanjiChar(ch)) {
            const sv = getSinoVietnamese(ch);
            if (sv) sinoList.push(sv);
        }
    });

    return sinoList.filter(Boolean).join(' ');
}

/**
 * Generates textual matching variants for a vocabulary keyword (handling verb/adjective inflection stems).
 * e.g. "抜き取る" -> matches ["抜き取る", "抜き取り", "抜き取っ", "抜き取ら", "抜き取れ", "抜き取"]
 * e.g. "払い戻す" -> matches ["払い戻す", "払い戻し", "払い戻せ", "払い戻さ", "払い戻"]
 * e.g. "小田急電鉄" -> matches ["小田急電鉄"]
 */
function generateWordVariants(rawKw) {
    if (!rawKw || !rawKw.word) return [];
    const clean = String(rawKw.word).trim();
    if (!clean) return [];

    const variants = new Set();
    variants.add(clean);

    // Inflection stem variations
    if (clean.endsWith('る') && clean.length >= 2) {
        const stem = clean.slice(0, -1);
        variants.add(stem + 'り'); // masu-form / noun (抜き取り, 分かり)
        variants.add(stem + 'っ'); // te-form / ta-form (抜き取っ, 分かっ)
        variants.add(stem + 'れ'); // imperative/provisional (抜き取れ)
        variants.add(stem + 'ら'); // negative stem (抜き取ら)
        variants.add(stem);        // ichidan stem
    } else if (clean.endsWith('す') && clean.length >= 2) {
        const stem = clean.slice(0, -1);
        variants.add(stem + 'し'); // 払い戻し, 話し
        variants.add(stem + 'せ');
        variants.add(stem + 'さ');
        variants.add(stem);
    } else if (clean.endsWith('く') && clean.length >= 2) {
        const stem = clean.slice(0, -1);
        variants.add(stem + 'き'); // 抜き, 行き, 聞き
        variants.add(stem + 'い');
        variants.add(stem);
    } else if (clean.endsWith('ぐ') && clean.length >= 2) {
        const stem = clean.slice(0, -1);
        variants.add(stem + 'ぎ');
        variants.add(stem + 'い');
        variants.add(stem);
    } else if (clean.endsWith('つ') && clean.length >= 2) {
        const stem = clean.slice(0, -1);
        variants.add(stem + 'ち');
        variants.add(stem + 'っ');
        variants.add(stem);
    } else if (clean.endsWith('む') && clean.length >= 2) {
        const stem = clean.slice(0, -1);
        variants.add(stem + 'み'); // 読み, 飲み
        variants.add(stem + 'ん');
        variants.add(stem);
    } else if (clean.endsWith('ぶ') && clean.length >= 2) {
        const stem = clean.slice(0, -1);
        variants.add(stem + 'び');
        variants.add(stem + 'ん');
        variants.add(stem);
    } else if (clean.endsWith('う') && clean.length >= 2) {
        const stem = clean.slice(0, -1);
        variants.add(stem + 'い'); // 買い, 会い, 言い
        variants.add(stem + 'っ');
        variants.add(stem + 'わ');
        variants.add(stem);
    } else if (clean.endsWith('い') && clean.length >= 2) {
        const stem = clean.slice(0, -1);
        variants.add(stem + 'く'); // 大きく
        variants.add(stem + 'かっ'); // 大きかった
    }

    const entries = [];
    variants.forEach(variantText => {
        if (variantText.length >= 2 || (variantText.length === 1 && isKanjiChar(variantText))) {
            entries.push({
                matchWord: variantText,
                displayWord: clean,
                reading: rawKw.reading || '',
                meaning: typeof rawKw.meaning === 'string' ? rawKw.meaning : '',
                level: rawKw.level || '',
                isGrammar: false,
                rawKwObj: rawKw
            });
        }
    });

    return entries;
}

/**
 * Generates textual matching variants for a grammar pattern.
 * e.g. "〜に対して" -> matches ["に対して", "対して"]
 * e.g. "〜ということです" -> matches ["ということです", "ということだ", "ということ"]
 * e.g. "〜している" -> matches ["している", "していた", "しています", "してい", "ている"]
 */
function generateGrammarVariants(g) {
    if (!g) return [];
    const isObj = typeof g === 'object' && g !== null;
    const rawPoint = isObj ? (g.point || g.structure || g.grammar || g.title || '') : String(g);
    const meaning = isObj ? (g.meaning || g.explanation || '') : '';
    const level = isObj ? (g.level || '') : '';

    if (!rawPoint) return [];

    // Strip leading/trailing placeholders: 〜, ~, ..., …, -, ―, N+, V+, V-て+, etc.
    const cleanPattern = rawPoint
        .replace(/^[〜~～\-―…\.\s]+/g, '')
        .replace(/[〜~～\-―…\.\s]+$/g, '')
        .replace(/^[NVAD][\+\-て]/g, '')
        .trim();

    if (!cleanPattern || cleanPattern.length < 1) return [];

    const variations = new Set();
    variations.add(cleanPattern);

    // If starts with に (e.g. に対して), also add without に (e.g. 対して)
    if (cleanPattern.startsWith('に') && cleanPattern.length > 2) {
        variations.add(cleanPattern.slice(1));
    }
    // If ends with です (e.g. ということです), also add with だ (ということだ) or without です (ということ)
    if (cleanPattern.endsWith('です') && cleanPattern.length > 3) {
        variations.add(cleanPattern.replace(/です$/, 'だ'));
        variations.add(cleanPattern.replace(/です$/, ''));
    }
    // If starts with して (e.g. している), also add て (ている)
    if (cleanPattern.startsWith('して') && cleanPattern.length > 2) {
        variations.add(cleanPattern.slice(1));
    }
    // If ends with している, also add していた, しています
    if (cleanPattern.endsWith('している') && cleanPattern.length >= 4) {
        variations.add(cleanPattern.replace(/している$/, 'していた'));
        variations.add(cleanPattern.replace(/している$/, 'しています'));
        variations.add(cleanPattern.replace(/している$/, 'してい'));
    }
    // If passive "される", also add "された", "されます"
    if (cleanPattern.endsWith('される') && cleanPattern.length >= 3) {
        variations.add(cleanPattern.replace(/される$/, 'された'));
        variations.add(cleanPattern.replace(/される$/, 'されます'));
        variations.add(cleanPattern.replace(/される$/, 'されました'));
        variations.add(cleanPattern.replace(/される$/, 'され'));
    }
    // If "ていた", also add "ていました"
    if (cleanPattern.endsWith('ていた') && cleanPattern.length >= 3) {
        variations.add(cleanPattern.replace(/ていた$/, 'ていました'));
        variations.add(cleanPattern.replace(/ていた$/, 'てい'));
    }

    const entries = [];
    variations.forEach(pattern => {
        if (pattern.length >= 2 || (pattern.length === 1 && isKanjiChar(pattern))) {
            entries.push({
                matchWord: pattern,
                displayWord: rawPoint,
                rawPoint: rawPoint,
                meaning: meaning,
                level: level,
                isGrammar: true,
                rawGrammarObj: g
            });
        }
    });

    return entries;
}

/**
 * Combines keywords and grammar into a unified list of search entries sorted by matchWord length descending.
 */
export function prepareAllEntries(keywords = [], grammar = []) {
    const entries = [];
    const seenMatchWords = new Set();

    // 1. Process Grammar points first
    (grammar || []).forEach(g => {
        const gEntries = generateGrammarVariants(g);
        gEntries.forEach(item => {
            if (item.matchWord && !seenMatchWords.has(item.matchWord)) {
                seenMatchWords.add(item.matchWord);
                entries.push(item);
            }
        });
    });

    // 2. Process Keywords (Vocabulary)
    (keywords || []).forEach(kw => {
        const kwEntries = generateWordVariants(kw);
        kwEntries.forEach(item => {
            if (item.matchWord && !seenMatchWords.has(item.matchWord)) {
                seenMatchWords.add(item.matchWord);
                entries.push(item);
            }
        });
    });

    // Sort by matchWord length descending (longest match first)
    return entries.sort((a, b) => b.matchWord.length - a.matchWord.length);
}

/**
 * High-Precision Character-to-Token Sequence Matcher
 * Maps each character of the surface sentence against dictionary entries so multi-kanji and
 * compound structures (like 小田急電鉄, 抜き取り, 払い戻し, に対して, ということです)
 * are cleanly and accurately unified into singular interactive hover components.
 */
function processTokensWithCharacterMapping(rawTokens, keywords = [], grammar = []) {
    if (!rawTokens || rawTokens.length === 0) return [];
    const allEntries = prepareAllEntries(keywords, grammar);
    if (allEntries.length === 0) {
        return rawTokens.map(t => ({ isMatch: false, ...t }));
    }

    // 1. Build character-level map from raw tokens
    const charMap = [];
    rawTokens.forEach((t, tIdx) => {
        if (t.isRuby && t.kanji) {
            for (let k = 0; k < t.kanji.length; k++) {
                charMap.push({
                    char: t.kanji[k],
                    token: t,
                    tokenIdx: tIdx,
                    charInToken: k,
                    isRuby: true
                });
            }
        } else if (t.text) {
            for (let k = 0; k < t.text.length; k++) {
                charMap.push({
                    char: t.text[k],
                    token: t,
                    tokenIdx: tIdx,
                    charInToken: k,
                    isRuby: false
                });
            }
        }
    });

    const totalChars = charMap.length;
    if (totalChars === 0) return [];

    const fullText = charMap.map(c => c.char).join('');
    const resultSpans = [];
    let cIdx = 0;

    // 2. Greedy search on fullText
    while (cIdx < totalChars) {
        let bestMatch = null;
        let bestMatchLen = 0;

        for (const entry of allEntries) {
            const mLen = entry.matchWord.length;
            if (cIdx + mLen <= totalChars) {
                if (fullText.startsWith(entry.matchWord, cIdx)) {
                    bestMatch = entry;
                    bestMatchLen = mLen;
                    break;
                }
            }
        }

        if (bestMatch && bestMatchLen > 0) {
            resultSpans.push({
                isMatch: true,
                matchedEntry: bestMatch,
                start: cIdx,
                end: cIdx + bestMatchLen
            });
            cIdx += bestMatchLen;
        } else {
            resultSpans.push({
                isMatch: false,
                start: cIdx,
                end: cIdx + 1
            });
            cIdx += 1;
        }
    }

    // 3. Merge contiguous unmatched spans
    const mergedSpans = [];
    for (const span of resultSpans) {
        const last = mergedSpans[mergedSpans.length - 1];
        if (!span.isMatch && last && !last.isMatch) {
            last.end = span.end;
        } else {
            mergedSpans.push({ ...span });
        }
    }

    // 4. Convert merged spans into renderable chunks
    const renderChunks = [];
    mergedSpans.forEach(span => {
        const spanChars = charMap.slice(span.start, span.end);
        // Group contiguous characters by parent token
        const tokenGroups = [];
        let curGroup = null;

        spanChars.forEach(item => {
            if (!curGroup || curGroup.token !== item.token) {
                curGroup = {
                    token: item.token,
                    isRuby: item.isRuby,
                    chars: [item.char]
                };
                tokenGroups.push(curGroup);
            } else {
                curGroup.chars.push(item.char);
            }
        });

        renderChunks.push({
            isMatch: span.isMatch,
            matchedEntry: span.matchedEntry,
            spanChars: spanChars,
            tokenGroups: tokenGroups
        });
    });

    return renderChunks;
}

/**
 * Interactive Word & Grammar Wrapper with Tooltip
 */
const InteractiveWordTooltip = ({ matchedEntry, sinoViet, children, onClick }) => {
    const isGrammar = Boolean(matchedEntry?.isGrammar);
    const meaningText = matchedEntry?.meaning || '';
    const levelText = matchedEntry?.level || '';
    const displayTitle = matchedEntry?.displayWord || matchedEntry?.matchWord || '';
    const reading = matchedEntry?.reading || '';

    return (
        <span 
            className="relative inline-block group/word cursor-pointer select-text"
            onClick={onClick}
        >
            {children}

            {/* Hover Tooltip Popover displaying Vocabulary or Grammar info */}
            <span 
                className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover/word:flex flex-col items-center z-[100] animate-fade-in text-left drop-shadow-2xl"
                style={{ minWidth: 'max-content' }}
            >
                <span className={`bg-slate-900/95 dark:bg-slate-900/95 text-white border ${
                    isGrammar ? 'border-indigo-400/90 shadow-indigo-500/20' : 'border-[#f494bc]/90 shadow-pink-500/20'
                } rounded-xl px-3 py-2 shadow-2xl backdrop-blur-md text-xs font-sans whitespace-nowrap max-w-xs text-center flex flex-col items-center gap-0.5`}>
                    {/* Header: Title + Tag / Level */}
                    <span className="font-black text-xs flex items-center gap-1.5">
                        <span className={isGrammar ? 'text-indigo-300 font-extrabold' : 'text-[#f494bc]'}>
                            {displayTitle}
                        </span>
                        {!isGrammar && reading && reading !== displayTitle && (
                            <span className="text-[10px] text-slate-300 font-normal">【{reading}】</span>
                        )}
                        {levelText ? (
                            <span className={`text-[8px] font-mono px-1.5 py-0.2 rounded font-bold border ${
                                isGrammar 
                                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' 
                                    : 'bg-pink-500/20 text-[#f494bc] border-pink-500/30'
                            }`}>
                                {isGrammar ? `Ngữ pháp ${levelText}` : levelText}
                            </span>
                        ) : isGrammar ? (
                            <span className="text-[8px] font-mono px-1.5 py-0.2 rounded font-bold border bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                                Ngữ pháp
                            </span>
                        ) : null}
                    </span>

                    {/* Sino-Vietnamese (Âm Hán Việt) */}
                    {sinoViet && (
                        <span className="text-[9px] font-mono uppercase text-pink-300/90 font-bold tracking-wider">
                            Âm HV: {sinoViet}
                        </span>
                    )}

                    {/* Meaning Translation */}
                    {meaningText ? (
                        <span className="text-[11px] text-slate-100 font-medium max-w-[250px] truncate block pt-0.5">
                            {meaningText}
                        </span>
                    ) : null}
                </span>
                {/* Pointer Arrow */}
                <span className={`w-2 h-2 bg-slate-900 border-r border-b ${
                    isGrammar ? 'border-indigo-400/90' : 'border-[#f494bc]/90'
                } rotate-45 -mt-1 block shrink-0`} />
            </span>
        </span>
    );
};

export const renderFuriganaContent = (textWithFurigana, showFurigana = true, onWordClick = null, keywords = [], grammar = []) => {
    if (!textWithFurigana) return '';
    const rawTokens = getParsedTokens(textWithFurigana);
    const renderChunks = processTokensWithCharacterMapping(rawTokens, keywords, grammar);

    return renderChunks.map((chunk, chunkIdx) => {
        // Matched Word or Grammar Span
        if (chunk.isMatch) {
            const isGrammar = Boolean(chunk.matchedEntry?.isGrammar);
            const sinoViet = extractSinoVietnameseForWord(chunk.spanChars);

            return (
                <InteractiveWordTooltip
                    key={chunkIdx}
                    matchedEntry={chunk.matchedEntry}
                    sinoViet={sinoViet}
                    onClick={(e) => {
                        if (onWordClick) {
                            e.stopPropagation();
                            onWordClick(chunk.matchedEntry.displayWord || chunk.matchedEntry.matchWord, chunk.matchedEntry.reading || chunk.matchedEntry.matchWord);
                        }
                    }}
                >
                    <span className={`inline-flex items-baseline transition-colors duration-150 ${
                        isGrammar 
                            ? 'group-hover/word:text-indigo-400 dark:group-hover/word:text-indigo-300 underline decoration-indigo-400/50 decoration-wavy' 
                            : 'group-hover/word:text-[#f494bc]'
                    }`}>
                        {chunk.tokenGroups.map((group, gIdx) => {
                            if (group.isRuby) {
                                return (
                                    <ruby 
                                        key={gIdx}
                                        className={`select-text transition-colors duration-150 ${
                                            isGrammar ? 'group-hover/word:text-indigo-400 dark:group-hover/word:text-indigo-300' : 'group-hover/word:text-[#f494bc]'
                                        }`}
                                        style={{ rubyAlign: 'center', rubyPosition: 'over' }}
                                    >
                                        {group.chars.join('')}
                                        {showFurigana ? (
                                            <rt 
                                                className={`text-[0.55em] font-normal select-none text-slate-500 dark:text-slate-300 leading-none tracking-normal transition-colors duration-150 ${
                                                    isGrammar ? 'group-hover/word:text-indigo-400 dark:group-hover/word:text-indigo-300' : 'group-hover/word:text-[#f494bc]'
                                                }`} 
                                                style={{ textAlign: 'center' }}
                                            >
                                                {group.token.reading}
                                            </rt>
                                        ) : null}
                                    </ruby>
                                );
                            }
                            return (
                                <span key={gIdx} className="select-text">
                                    {group.chars.join('')}
                                </span>
                            );
                        })}
                    </span>
                </InteractiveWordTooltip>
            );
        }

        // Unmatched Segment (Text or Ruby)
        return (
            <React.Fragment key={chunkIdx}>
                {chunk.tokenGroups.map((group, gIdx) => {
                    if (group.isRuby) {
                        return (
                            <ruby 
                                key={gIdx}
                                className="select-text"
                                style={{ rubyAlign: 'center', rubyPosition: 'over' }}
                            >
                                {group.chars.join('')}
                                {showFurigana ? (
                                    <rt 
                                        className="text-[0.55em] font-normal select-none text-slate-500 dark:text-slate-300 leading-none tracking-normal" 
                                        style={{ textAlign: 'center' }}
                                    >
                                        {group.token.reading}
                                    </rt>
                                ) : null}
                            </ruby>
                        );
                    }
                    return (
                        <span key={gIdx} className="select-text">
                            {group.chars.join('')}
                        </span>
                    );
                })}
            </React.Fragment>
        );
    });
};

const FuriganaRenderer = memo(({ text, showFurigana = true, onWordClick = null, keywords = [], grammar = [], className = '' }) => {
    return (
        <span className={`inline font-sans leading-relaxed ${className}`} style={{ rubyPosition: 'over', rubyAlign: 'center' }}>
            {renderFuriganaContent(text, showFurigana, onWordClick, keywords, grammar)}
        </span>
    );
});

export default FuriganaRenderer;
