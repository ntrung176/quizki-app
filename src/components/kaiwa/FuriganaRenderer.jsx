import React, { memo } from 'react';
import { getSinoVietnamese } from '../../utils/kanjiHVLookup';

const tokenCache = new Map();

/**
 * Parses and caches Japanese text with Furigana syntax: {漢字|かんじ} or standard text
 */
function getParsedTokens(textWithFurigana) {
    if (!textWithFurigana) return [];
    if (tokenCache.has(textWithFurigana)) {
        return tokenCache.get(textWithFurigana);
    }

    // 1. Normalize spaces inside { Kanji | furigana } tags
    let cleanText = textWithFurigana.replace(/\{\s*([^|{}]+?)\s*\|\s*([^|{}]+?)\s*\}/g, '{$1|$2}');

    // 2. Remove unwanted spaces inserted between Japanese tokens / furigana brackets
    cleanText = cleanText
        .replace(/\}\s+([ぁ-んァ-ヶ一-龯、。！？「」・…〜\w])/g, '}$1')
        .replace(/([ぁ-んァ-ヶ一-龯、。！？「」・…〜\w])\s+\{/g, '$1{')
        .replace(/([ぁ-んァ-ヶ一-龯])\s+([ぁ-んァ-ヶ一-龯])/g, '$1$2')
        .replace(/「\s+/g, '「')
        .replace(/\s+」/g, '」')
        .replace(/\s+([？!！。、])/g, '$1');

    // 3. Regex to match {Kanji|furigana} or plain text
    const regex = /\{([^|{}]+)\|([^|{}]+)\}|([^{}]+)/g;
    const tokens = [];
    let match;

    while ((match = regex.exec(cleanText)) !== null) {
        if (match[1] && match[2]) {
            tokens.push({ isRuby: true, kanji: match[1].trim(), reading: match[2].trim() });
        } else if (match[3]) {
            tokens.push({ isRuby: false, text: match[3] });
        }
    }

    if (tokenCache.size > 2000) tokenCache.clear();
    tokenCache.set(textWithFurigana, tokens);
    return tokens;
}

/**
 * Processes tokens with keywords dictionary to fuse stem + okurigana compounds (e.g. {考|かんが} + える -> 考える)
 */
function processTokensWithKeywords(tokens, keywords = []) {
    if (!tokens || tokens.length === 0) return [];
    if (!keywords || keywords.length === 0) return tokens;

    // Clone tokens to avoid modifying cached objects
    const workingTokens = tokens.map(t => ({ ...t }));
    const sortedKws = [...keywords]
        .filter(k => k && k.word)
        .sort((a, b) => b.word.length - a.word.length);

    const result = [];
    let i = 0;

    while (i < workingTokens.length) {
        const token = workingTokens[i];

        // 1. Multi-Ruby compound match (e.g. {一|いっ}{緒|しょ} -> 一緒)
        let multiRubyMatched = false;
        for (const kw of sortedKws) {
            let accumulatedKanji = '';
            let accumulatedRuby = [];
            let j = i;
            while (j < workingTokens.length && workingTokens[j].isRuby) {
                accumulatedKanji += workingTokens[j].kanji;
                accumulatedRuby.push(workingTokens[j]);
                if (accumulatedKanji === kw.word) {
                    result.push({
                        isCompoundRuby: true,
                        rubyList: accumulatedRuby,
                        word: kw.word,
                        reading: kw.reading,
                        matchedKw: kw
                    });
                    i = j + 1;
                    multiRubyMatched = true;
                    break;
                }
                if (!kw.word.startsWith(accumulatedKanji)) {
                    break;
                }
                j++;
            }
            if (multiRubyMatched) break;
        }
        if (multiRubyMatched) continue;

        // 2. Single Ruby token: check exact match or Stem + Okurigana (e.g. {考|かんが} + える -> 考える, {皆|みな} + さん -> 皆さん)
        if (token.isRuby) {
            let matchedKw = null;
            let matchedOkurigana = '';
            let remainingText = '';

            for (const kw of sortedKws) {
                // Exact kanji match: {日本語|にほんご} === 日本語, {自然|しぜん} === 自然
                if (kw.word === token.kanji) {
                    matchedKw = kw;
                    break;
                }

                // Stem + Okurigana match: kw='考える', token.kanji='考'
                if (kw.word.startsWith(token.kanji)) {
                    const expectedOkurigana = kw.word.slice(token.kanji.length);
                    const nextToken = workingTokens[i + 1];
                    if (nextToken && !nextToken.isRuby && nextToken.text) {
                        // Full okurigana match (e.g. える / えると)
                        if (nextToken.text.startsWith(expectedOkurigana)) {
                            matchedKw = kw;
                            matchedOkurigana = expectedOkurigana;
                            remainingText = nextToken.text.slice(expectedOkurigana.length);
                            break;
                        }
                        // Inflected okurigana stem match (e.g. kw is 考える, text is え / えた / えば)
                        const stemPrefix = expectedOkurigana.slice(0, 1);
                        if (stemPrefix && nextToken.text.startsWith(stemPrefix)) {
                            matchedKw = kw;
                            matchedOkurigana = stemPrefix;
                            remainingText = nextToken.text.slice(stemPrefix.length);
                            break;
                        }
                    }
                }

                // Substring containment or reading match
                if (token.kanji.includes(kw.word) || kw.word.includes(token.kanji) || (token.reading && kw.reading === token.reading)) {
                    if (!matchedKw) {
                        matchedKw = kw;
                    }
                }
            }

            if (matchedKw && matchedOkurigana) {
                result.push({
                    isStemCompound: true,
                    ruby: token,
                    okurigana: matchedOkurigana,
                    word: matchedKw.word,
                    reading: matchedKw.reading || token.reading,
                    matchedKw: matchedKw
                });
                if (remainingText) {
                    workingTokens[i + 1] = { isRuby: false, text: remainingText };
                } else {
                    i++; // skip next token completely
                }
                i++;
                continue;
            }

            result.push({
                ...token,
                word: matchedKw ? matchedKw.word : token.kanji,
                reading: token.reading,
                matchedKw: matchedKw
            });
            i++;
            continue;
        }

        // 3. Plain text token: check if any keyword appears inside
        if (!token.isRuby && token.text) {
            let matchedKwInPlain = null;
            for (const kw of sortedKws) {
                if (kw.word && token.text.includes(kw.word)) {
                    matchedKwInPlain = kw;
                    break;
                }
            }

            if (matchedKwInPlain && matchedKwInPlain.word.length >= 2) {
                const parts = token.text.split(matchedKwInPlain.word);
                result.push({
                    isSplitPlain: true,
                    parts: parts,
                    matchedKw: matchedKwInPlain
                });
                i++;
                continue;
            }

            result.push(token);
            i++;
            continue;
        }

        result.push(token);
        i++;
    }

    return result;
}

/**
 * Interactive Word Wrapper with Pink Hover & Meaning Tooltip
 */
const InteractiveWordTooltip = ({ word, reading, matchedKw, sinoViet, children, onClick }) => {
    const meaningText = matchedKw?.meaning || '';

    return (
        <span 
            className="relative inline-block group/word cursor-pointer select-text"
            onClick={onClick}
        >
            {children}

            {/* Hover Tooltip Popover displaying Vocabulary meaning */}
            <span 
                className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/word:flex flex-col items-center z-50 animate-fade-in text-left"
                style={{ minWidth: 'max-content' }}
            >
                <span className="bg-slate-900/95 dark:bg-slate-900/95 text-white border border-[#f494bc]/70 rounded-xl px-3 py-2 shadow-2xl backdrop-blur-md text-xs font-sans whitespace-nowrap max-w-xs text-center flex flex-col items-center gap-0.5">
                    {/* Word + Reading + JLPT Level */}
                    <span className="font-black text-xs text-[#f494bc] flex items-center gap-1.5">
                        <span>{word}</span>
                        {reading && reading !== word && (
                            <span className="text-[10px] text-slate-300 font-normal">【{reading}】</span>
                        )}
                        {matchedKw?.level && (
                            <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-pink-500/20 text-[#f494bc] font-bold border border-pink-500/30">
                                {matchedKw.level}
                            </span>
                        )}
                    </span>

                    {/* Sino-Vietnamese (Âm Hán Việt) */}
                    {sinoViet && (
                        <span className="text-[9px] font-mono uppercase text-pink-300/90 font-bold tracking-wider">
                            Âm HV: {sinoViet}
                        </span>
                    )}

                    {/* Meaning Translation */}
                    {meaningText ? (
                        <span className="text-[11px] text-slate-100 font-medium max-w-[240px] truncate block pt-0.5">
                            {meaningText}
                        </span>
                    ) : null}
                </span>
                {/* Pointer Arrow */}
                <span className="w-2 h-2 bg-slate-900 border-r border-b border-[#f494bc]/70 rotate-45 -mt-1 block shrink-0" />
            </span>
        </span>
    );
};

export const renderFuriganaContent = (textWithFurigana, showFurigana = true, onWordClick = null, keywords = []) => {
    if (!textWithFurigana) return '';
    const rawTokens = getParsedTokens(textWithFurigana);
    const processedTokens = processTokensWithKeywords(rawTokens, keywords);

    return processedTokens.map((token, index) => {
        // Case A: Compound of Stem + Okurigana (e.g. {考|かんが}える -> 考える)
        if (token.isStemCompound) {
            const sinoViet = getSinoVietnamese(token.ruby.kanji);
            return (
                <InteractiveWordTooltip
                    key={index}
                    word={token.word}
                    reading={token.reading}
                    matchedKw={token.matchedKw}
                    sinoViet={sinoViet}
                    onClick={(e) => {
                        if (onWordClick) {
                            e.stopPropagation();
                            onWordClick(token.word, token.reading);
                        }
                    }}
                >
                    <span className="inline-flex items-baseline transition-colors duration-150 group-hover/word:text-[#f494bc]">
                        <ruby 
                            className="select-text transition-colors duration-150 group-hover/word:text-[#f494bc]"
                            style={{ rubyAlign: 'center', rubyPosition: 'over' }}
                        >
                            {token.ruby.kanji}
                            {showFurigana ? (
                                <rt 
                                    className="text-[0.55em] font-normal select-none text-slate-500 dark:text-slate-300 group-hover/word:text-[#f494bc] leading-none tracking-normal transition-colors duration-150" 
                                    style={{ textAlign: 'center' }}
                                >
                                    {token.ruby.reading}
                                </rt>
                            ) : null}
                        </ruby>
                        <span className="select-text transition-colors duration-150 group-hover/word:text-[#f494bc]">
                            {token.okurigana}
                        </span>
                    </span>
                </InteractiveWordTooltip>
            );
        }

        // Case B: Multi-Ruby compound (e.g. {一|いっ}{緒|しょ} -> 一緒)
        if (token.isCompoundRuby) {
            const sinoViet = token.rubyList.map(r => getSinoVietnamese(r.kanji)).filter(Boolean).join(' ');
            return (
                <InteractiveWordTooltip
                    key={index}
                    word={token.word}
                    reading={token.reading}
                    matchedKw={token.matchedKw}
                    sinoViet={sinoViet}
                    onClick={(e) => {
                        if (onWordClick) {
                            e.stopPropagation();
                            onWordClick(token.word, token.reading);
                        }
                    }}
                >
                    <span className="inline-flex items-baseline transition-colors duration-150 group-hover/word:text-[#f494bc]">
                        {token.rubyList.map((r, rIdx) => (
                            <ruby 
                                key={rIdx}
                                className="select-text transition-colors duration-150 group-hover/word:text-[#f494bc]"
                                style={{ rubyAlign: 'center', rubyPosition: 'over' }}
                            >
                                {r.kanji}
                                {showFurigana ? (
                                    <rt 
                                        className="text-[0.55em] font-normal select-none text-slate-500 dark:text-slate-300 group-hover/word:text-[#f494bc] leading-none tracking-normal transition-colors duration-150" 
                                        style={{ textAlign: 'center' }}
                                    >
                                        {r.reading}
                                    </rt>
                                ) : null}
                            </ruby>
                        ))}
                    </span>
                </InteractiveWordTooltip>
            );
        }

        // Case C: Single Ruby token (e.g. {日本語|にほんご}, {自然|しぜん})
        if (token.isRuby) {
            const sinoViet = getSinoVietnamese(token.kanji);
            return (
                <InteractiveWordTooltip
                    key={index}
                    word={token.word || token.kanji}
                    reading={token.reading}
                    matchedKw={token.matchedKw}
                    sinoViet={sinoViet}
                    onClick={(e) => {
                        if (onWordClick) {
                            e.stopPropagation();
                            onWordClick(token.word || token.kanji, token.reading);
                        }
                    }}
                >
                    <ruby 
                        className="select-text transition-colors duration-150 group-hover/word:text-[#f494bc]"
                        style={{ rubyAlign: 'center', rubyPosition: 'over' }}
                    >
                        {token.kanji}
                        {showFurigana ? (
                            <rt 
                                className="text-[0.55em] font-normal select-none text-slate-500 dark:text-slate-300 group-hover/word:text-[#f494bc] leading-none tracking-normal transition-colors duration-150" 
                                style={{ textAlign: 'center' }}
                            >
                                {token.reading}
                            </rt>
                        ) : null}
                    </ruby>
                </InteractiveWordTooltip>
            );
        }

        // Case D: Plain text with embedded keyword match
        if (token.isSplitPlain) {
            return (
                <span key={index} className="select-text">
                    {token.parts.map((part, pIdx) => (
                        <React.Fragment key={pIdx}>
                            {part}
                            {pIdx < token.parts.length - 1 && (
                                <InteractiveWordTooltip
                                    word={token.matchedKw.word}
                                    reading={token.matchedKw.reading}
                                    matchedKw={token.matchedKw}
                                    sinoViet={getSinoVietnamese(token.matchedKw.word)}
                                    onClick={(e) => {
                                        if (onWordClick) {
                                            e.stopPropagation();
                                            onWordClick(token.matchedKw.word, token.matchedKw.reading || token.matchedKw.word);
                                        }
                                    }}
                                >
                                    <span className="transition-colors duration-150 group-hover/word:text-[#f494bc] font-bold">
                                        {token.matchedKw.word}
                                    </span>
                                </InteractiveWordTooltip>
                            )}
                        </React.Fragment>
                    ))}
                </span>
            );
        }

        // Normal plain text
        return (
            <span key={index} className="select-text">
                {token.text}
            </span>
        );
    });
};

const FuriganaRenderer = memo(({ text, showFurigana = true, onWordClick = null, keywords = [], className = '' }) => {
    return (
        <span className={`inline font-sans leading-relaxed ${className}`} style={{ rubyPosition: 'over', rubyAlign: 'center' }}>
            {renderFuriganaContent(text, showFurigana, onWordClick, keywords)}
        </span>
    );
});

export default FuriganaRenderer;
