import React, { useState, useEffect } from 'react';
import { generateFuriganaText } from '../../utils/furiganaHelper';

// Helper to normalize Katakana to Hiragana for alignment comparisons
const toHiragana = (str) => {
    if (!str) return '';
    return str.replace(/[\u30A1-\u30F6]/g, (match) => {
        const chr = match.charCodeAt(0) - 0x60;
        return String.fromCharCode(chr);
    });
};

const isKana = (char) => /[\u3040-\u309F\u30A0-\u30FF]/.test(char);

// Precise alignment helper to link base kanji with corresponding kana reading
const alignFuriganaCore = (base, reading) => {
    let b = base.trim();
    let r = reading.trim();
    
    let prefixParts = [];
    let suffixParts = [];
    
    // 1. Strip non-matching kana prefixes first
    // E.g. if b = "の客", r = "きゃく", b[0] = "の" is kana but doesn't match r[0] = "き"
    while (b.length > 0 && isKana(b[0]) && (r.length === 0 || toHiragana(b[0]) !== toHiragana(r[0]))) {
        prefixParts.push({ type: 'text', content: b[0] });
        b = b.substring(1);
    }
    
    // 2. Strip non-matching kana suffixes first
    // E.g. if b = "立派だ", r = "りっぱ", b[b.length-1] = "だ" is kana but doesn't match r[r.length-1] = "ぱ"
    while (b.length > 0 && isKana(b[b.length - 1]) && (r.length === 0 || toHiragana(b[b.length - 1]) !== toHiragana(r[r.length - 1]))) {
        suffixParts.unshift({ type: 'text', content: b[b.length - 1] });
        b = b.substring(0, b.length - 1);
    }
    
    // 3. Strip matching kana prefixes
    while (b.length > 0 && r.length > 0 && 
           toHiragana(b[0]) === toHiragana(r[0]) && isKana(b[0])) {
        prefixParts.push({ type: 'text', content: b[0] });
        b = b.substring(1);
        r = r.substring(1);
    }
    
    // 4. Strip matching kana suffixes
    while (b.length > 0 && r.length > 0 && 
           toHiragana(b[b.length - 1]) === toHiragana(r[r.length - 1]) && 
           isKana(b[b.length - 1])) {
        suffixParts.unshift({ type: 'text', content: b[b.length - 1] });
        b = b.substring(0, b.length - 1);
        r = r.substring(0, r.length - 1);
    }
    
    // Handle edge cases where stripping leaves one or both empty
    if (b.length === 0) {
        if (r.length === 0) {
            return { success: true, parts: [...prefixParts, ...suffixParts] };
        }
        return { success: false };
    }
    if (r.length === 0) {
        const hasKanji = /[\u4E00-\u9FAF\u3400-\u4DBF\u3005]/.test(b);
        if (hasKanji) return { success: false };
        return { success: true, parts: [...prefixParts, { type: 'text', content: b }, ...suffixParts] };
    }
    
    const hasKanji = /[\u4E00-\u9FAF\u3400-\u4DBF\u3005]/.test(b);
    if (!hasKanji) {
        return { success: false };
    }
    
    // Parse the remaining middle base into alternate blocks of Kanji and Kana
    let middleParts = [];
    let currentKanji = "";
    let currentKana = "";
    let blocks = [];
    
    for (let i = 0; i < b.length; i++) {
        const char = b[i];
        if (isKana(char)) {
            if (currentKanji) {
                blocks.push({ type: 'kanji', text: currentKanji });
                currentKanji = "";
            }
            currentKana += char;
        } else {
            if (currentKana) {
                blocks.push({ type: 'kana', text: currentKana });
                currentKana = "";
            }
            currentKanji += char;
        }
    }
    if (currentKanji) blocks.push({ type: 'kanji', text: currentKanji });
    if (currentKana) blocks.push({ type: 'kana', text: currentKana });
    
    let readingIdx = 0;
    let success = true;
    const normReading = toHiragana(r);
    
    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (block.type === 'kana') {
            const normBlockText = toHiragana(block.text);
            const idx = normReading.indexOf(normBlockText, readingIdx);
            if (idx !== -1) {
                const prevKanjiBlock = blocks[i - 1];
                if (prevKanjiBlock && prevKanjiBlock.type === 'kanji') {
                    const kanjiReading = r.substring(readingIdx, idx);
                    if (!kanjiReading) {
                        success = false;
                        break;
                    }
                    middleParts.push({ type: 'ruby', kanji: prevKanjiBlock.text, reading: kanjiReading });
                }
                middleParts.push({ type: 'text', content: block.text });
                readingIdx = idx + block.text.length;
            } else {
                success = false;
                break;
            }
        }
    }
    
    // Process final kanji block if any
    if (success) {
        const lastBlock = blocks[blocks.length - 1];
        if (lastBlock && lastBlock.type === 'kanji') {
            const kanjiReading = r.substring(readingIdx);
            if (kanjiReading) {
                middleParts.push({ type: 'ruby', kanji: lastBlock.text, reading: kanjiReading });
            } else {
                success = false;
            }
        } else if (readingIdx < r.length) {
            success = false;
        }
    }
    
    if (success && middleParts.length > 0) {
        return { success: true, parts: [...prefixParts, ...middleParts, ...suffixParts] };
    }
    
    // Last resort: if the remaining base is one single block of Kanji, map the entire remaining reading to it
    if (b.length > 0 && /^[\u4E00-\u9FAF\u3400-\u4DBF\u3005]+$/.test(b)) {
        return { success: true, parts: [...prefixParts, { type: 'ruby', kanji: b, reading: r }, ...suffixParts] };
    }
    
    return { success: false };
};

const alignFurigana = (base, reading) => {
    const b = base.trim();
    const r = reading.trim();
    
    // Try to align the entire string first
    const result = alignFuriganaCore(b, r);
    if (result.success) {
        return result.parts;
    }
    
    // Try to find the longest suffix of the base that aligns successfully
    for (let i = 1; i < b.length; i++) {
        const suffix = b.substring(i);
        const subResult = alignFuriganaCore(suffix, r);
        if (subResult.success) {
            const prefixContent = b.substring(0, i);
            return [
                { type: 'text', content: prefixContent },
                ...subResult.parts
            ];
        }
    }
    
    // Fallback if no alignment succeeded
    return [{ type: 'ruby', kanji: b, reading: r }];
};

// Main parser to tokenize text into text blocks and aligned ruby annotations
const parseFuriganaText = (text) => {
    if (!text) return [];
    
    // 1. Match single words with parentheses at the end: e.g. "食べる（たべる）", "消しゴム（けしごむ）"
    const singleWordRegex = /^([^\s（\(\[）\)\]]+)[（\(\[]([\u3040-\u309F\u30A0-\u30FF\s]+)[）\)\]]$/;
    const singleMatch = text.match(singleWordRegex);
    if (singleMatch) {
        return alignFurigana(singleMatch[1], singleMatch[2]);
    }
    
    // 2. Parse inline words or multi-word annotations: e.g. "顔(かお)認証(にんしょう)"
    const blockRegex = /([A-Za-z0-9\u4E00-\u9FAF\u3400-\u4DBF\u3040-\u309F\u30A0-\u30FF\uFF66-\uFF9F\uFF10-\uFF19]+?)[（\(\[]([\u3040-\u309F\u30A0-\u30FF\s]+?)[）\)\]]/g;
    
    const parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = blockRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push({
                type: 'text',
                content: text.substring(lastIndex, match.index)
            });
        }
        
        const base = match[1];
        const reading = match[2];
        
        const aligned = alignFurigana(base, reading);
        parts.push(...aligned);
        
        lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < text.length) {
        parts.push({
            type: 'text',
            content: text.substring(lastIndex)
        });
    }
    
    if (parts.length === 0) {
        return [{ type: 'text', content: text }];
    }
    
    return parts;
};

/**
 * FuriganaText - Renders Japanese text with ruby (furigana) annotations
 * 
 * @param {string} text - Japanese text (with or without brackets)
 * @param {string} className - Optional CSS class for the container
 */
const FuriganaText = ({ text, knownReading = '', className = '', forceHide = false, showReadingOnly = false }) => {
    const [processedText, setProcessedText] = useState(text || '');
    const [furiganaColor, setFuriganaColor] = useState(() => {
        try {
            const saved = localStorage.getItem('quizki-settings');
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed.furiganaColor || '#2563eb';
            }
        } catch (_) {}
        return '#2563eb';
    });
    const [furiganaFontSize, setFuriganaFontSize] = useState(() => {
        try {
            const saved = localStorage.getItem('quizki-settings');
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed.furiganaFontSize || '0.6em';
            }
        } catch (_) {}
        return '0.6em';
    });

    const furiganaEnabled = !forceHide;

    useEffect(() => {
        const loadSettings = () => {
            try {
                const savedObj = localStorage.getItem('quizki-settings');
                if (savedObj) {
                    const parsed = JSON.parse(savedObj);
                    if (parsed.furiganaColor) {
                        setFuriganaColor(parsed.furiganaColor);
                    }
                    if (parsed.furiganaFontSize) {
                        setFuriganaFontSize(parsed.furiganaFontSize);
                    }
                }
            } catch (e) { }
        };

        const handleSettingsChange = () => loadSettings();
        window.addEventListener('quizki-settings-changed', handleSettingsChange);
        return () => window.removeEventListener('quizki-settings-changed', handleSettingsChange);
    }, []);

    useEffect(() => {
        if (!text) {
            setProcessedText('');
            return;
        }

        const trimmedText = String(text).trim();

        // If knownReading is provided, ALWAYS format the text with this knownReading
        if (knownReading && String(knownReading).trim()) {
            const rawWord = trimmedText.split('（')[0].split('(')[0].split('[')[0].trim();
            const hasKanji = /[\u4E00-\u9FAF\u3400-\u4DBF]/.test(rawWord);
            if (hasKanji) {
                setProcessedText(`${rawWord}（${String(knownReading).trim()}）`);
            } else {
                setProcessedText(rawWord);
            }
            return;
        }

        const hasKanji = /[\u4E00-\u9FAF\u3400-\u4DBF]/.test(trimmedText);
        const hasFuriganaBrackets = /[（\(\[]([\u3040-\u309F\u30A0-\u30FF\s]+)[）\)\]]/.test(trimmedText);
        const needsFuriganaGeneration = (furiganaEnabled || showReadingOnly) && hasKanji && !hasFuriganaBrackets;

        if (needsFuriganaGeneration) {
            let isMounted = true;
            generateFuriganaText(trimmedText, '').then((res) => {
                if (isMounted) setProcessedText(res);
            }).catch(() => {
                if (isMounted) setProcessedText(trimmedText);
            });
            return () => { isMounted = false; };
        } else {
            setProcessedText(trimmedText);
        }
    }, [text, knownReading, furiganaEnabled, showReadingOnly]);

    if (!processedText) return null;

    const parts = parseFuriganaText(processedText);

    if (parts.length === 0 || (parts.length === 1 && parts[0].type === 'text')) {
        return <span className={`break-words whitespace-normal overflow-wrap-anywhere ${className}`}>{processedText}</span>;
    }

    return (
        <span className={`inline-wrap break-words whitespace-normal overflow-wrap-anywhere ${className}`}>
            {parts.map((part, idx) => {
                if (part.type === 'ruby') {
                    if (showReadingOnly) {
                        return <span key={idx} className="break-words whitespace-normal">{part.reading}</span>;
                    }
                    if (!furiganaEnabled) {
                        return <span key={idx} className="break-words whitespace-normal">{part.kanji}</span>;
                    }
                    return (
                        <ruby key={idx} style={{ rubyPosition: 'over', lineHeight: '2.4', overflowWrap: 'anywhere', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                            {part.kanji}
                            <rp>(</rp>
                            <rt style={{ fontSize: furiganaFontSize, paddingBottom: '3px', letterSpacing: 'normal', color: furiganaColor, whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{part.reading}</rt>
                            <rp>)</rp>
                        </ruby>
                    );
                }
                return <span key={idx} className="break-words whitespace-normal">{part.content}</span>;
            })}
        </span>
    );
};

export default FuriganaText;
