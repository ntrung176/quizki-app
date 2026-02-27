import React from 'react';

/**
 * FuriganaText - Renders Japanese text with ruby (furigana) annotations
 * 
 * Parses text like "顔認証（かおにんしょう）システムは技術（ぎじゅつ）を使（つか）っている。"
 * and renders kanji with furigana above using <ruby> HTML tags.
 * 
 * @param {string} text - Japanese text with furigana in （） brackets
 * @param {string} className - Optional CSS class for the container
 */
const FuriganaText = ({ text, className = '' }) => {
    if (!text) return null;

    // Regex to match kanji followed by furigana in （）
    // Pattern: one or more kanji characters + （hiragana/katakana reading）
    const furiganaRegex = /([\u4E00-\u9FAF\u3400-\u4DBF]+)（([^）]+)）/g;

    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = furiganaRegex.exec(text)) !== null) {
        // Add text before this match
        if (match.index > lastIndex) {
            parts.push({
                type: 'text',
                content: text.substring(lastIndex, match.index)
            });
        }

        // Add ruby element
        parts.push({
            type: 'ruby',
            kanji: match[1],
            reading: match[2]
        });

        lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
        parts.push({
            type: 'text',
            content: text.substring(lastIndex)
        });
    }

    // If no furigana found, return plain text
    if (parts.length === 0 || (parts.length === 1 && parts[0].type === 'text')) {
        return <span className={className}>{text}</span>;
    }

    return (
        <span className={className}>
            {parts.map((part, idx) => {
                if (part.type === 'ruby') {
                    return (
                        <ruby key={idx} className="ruby-annotation">
                            {part.kanji}
                            <rp>(</rp>
                            <rt>{part.reading}</rt>
                            <rp>)</rp>
                        </ruby>
                    );
                }
                return <span key={idx}>{part.content}</span>;
            })}
        </span>
    );
};

export default FuriganaText;
