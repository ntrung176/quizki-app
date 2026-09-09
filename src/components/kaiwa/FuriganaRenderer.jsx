import React, { memo } from 'react';

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

export const renderFuriganaContent = (textWithFurigana, showFurigana = true, onWordClick = null) => {
    if (!textWithFurigana) return '';
    const tokens = getParsedTokens(textWithFurigana);

    return tokens.map((token, index) => {
        if (token.isRuby) {
            return (
                <ruby 
                    key={index} 
                    className={`select-text ${onWordClick ? 'cursor-pointer hover:text-amber-300 transition-colors' : ''}`}
                    style={{ rubyAlign: 'center', rubyPosition: 'over' }}
                    onClick={(e) => {
                        if (onWordClick) {
                            e.stopPropagation();
                            onWordClick(token.kanji, token.reading);
                        }
                    }}
                >
                    {token.kanji}
                    {showFurigana ? (
                        <rt 
                            className="text-[0.55em] font-normal select-none text-amber-600 dark:text-amber-300 leading-none tracking-normal" 
                            style={{ textAlign: 'center' }}
                        >
                            {token.reading}
                        </rt>
                    ) : null}
                </ruby>
            );
        }

        return (
            <span key={index} className="select-text">
                {token.text}
            </span>
        );
    });
};

const FuriganaRenderer = memo(({ text, showFurigana = true, onWordClick = null, className = '' }) => {
    return (
        <span className={`inline font-sans leading-relaxed ${className}`} style={{ rubyPosition: 'over', rubyAlign: 'center' }}>
            {renderFuriganaContent(text, showFurigana, onWordClick)}
        </span>
    );
});

export default FuriganaRenderer;



