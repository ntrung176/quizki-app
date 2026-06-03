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
const alignFurigana = (base, reading) => {
    let b = base.trim();
    let r = reading.trim();
    
    let prefixParts = [];
    let suffixParts = [];
    
    // 1. Strip matching kana prefixes
    while (b.length > 0 && r.length > 0 && 
           toHiragana(b[0]) === toHiragana(r[0]) && isKana(b[0])) {
        prefixParts.push({ type: 'text', content: b[0] });
        b = b.substring(1);
        r = r.substring(1);
    }
    
    // 2. Strip matching kana suffixes
    while (b.length > 0 && r.length > 0 && 
           toHiragana(b[b.length - 1]) === toHiragana(r[r.length - 1]) && 
           isKana(b[b.length - 1])) {
        suffixParts.unshift({ type: 'text', content: b[b.length - 1] });
        b = b.substring(0, b.length - 1);
        r = r.substring(0, r.length - 1);
    }
    
    // Handle edge cases where stripping leaves one or both empty
    if (b.length === 0) {
        return [...prefixParts, ...suffixParts];
    }
    if (r.length === 0) {
        return [...prefixParts, { type: 'text', content: b }, ...suffixParts];
    }
    
    const hasKanji = /[\u4E00-\u9FAF\u3400-\u4DBF]/.test(b);
    if (!hasKanji) {
        return [...prefixParts, { type: 'text', content: b }, ...suffixParts];
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
        }
    }
    
    if (success && middleParts.length > 0) {
        return [...prefixParts, ...middleParts, ...suffixParts];
    } else {
        // Fallback: render the entire remaining base with remaining reading
        return [...prefixParts, { type: 'ruby', kanji: b, reading: r }, ...suffixParts];
    }
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
const FuriganaText = ({ text, className = '', forceHide = false, showReadingOnly = false }) => {
    const [processedText, setProcessedText] = useState(text || '');
    const [settingEnabled, setSettingEnabled] = useState(true);
    const [furiganaColor, setFuriganaColor] = useState('#8b5cf6');
    const [furiganaFontSize, setFuriganaFontSize] = useState('0.6em');

    const furiganaEnabled = !forceHide && settingEnabled;

    useEffect(() => {
        const loadSettings = () => {
            try {
                const savedObj = localStorage.getItem('quizki-settings');
                if (savedObj) {
                    const parsed = JSON.parse(savedObj);
                    setSettingEnabled(parsed.furiganaEnabled !== false);
                    setFuriganaColor(parsed.furiganaColor || '#8b5cf6');
                    setFuriganaFontSize(parsed.furiganaFontSize || '0.6em');
                }
            } catch (e) { }
        };

        loadSettings();

        const handleSettingsChange = () => loadSettings();
        window.addEventListener('quizki-settings-changed', handleSettingsChange);
        return () => window.removeEventListener('quizki-settings-changed', handleSettingsChange);
    }, []);

    useEffect(() => {
        if (!text) {
            setProcessedText('');
            return;
        }

        const hasKanji = /[\u4E00-\u9FAF\u3400-\u4DBF]/.test(text);
        const hasFuriganaBrackets = /[（\(\[]([\u3040-\u309F\u30A0-\u30FF\s]+)[）\)\]]/.test(text);
        const needsFuriganaGeneration = (furiganaEnabled || showReadingOnly) && hasKanji && !hasFuriganaBrackets;

        if (needsFuriganaGeneration) {
            let isMounted = true;
            generateFuriganaText(text).then((res) => {
                if (isMounted) setProcessedText(res);
            }).catch(() => {
                if (isMounted) setProcessedText(text);
            });
            return () => { isMounted = false; };
        } else {
            setProcessedText(text);
        }
    }, [text, furiganaEnabled, showReadingOnly]);

    if (!processedText) return null;

    const parts = parseFuriganaText(processedText);

    if (parts.length === 0 || (parts.length === 1 && parts[0].type === 'text')) {
        return <span className={className}>{processedText}</span>;
    }

    return (
        <span className={className}>
            {parts.map((part, idx) => {
                if (part.type === 'ruby') {
                    if (showReadingOnly) {
                        return <span key={idx}>{part.reading}</span>;
                    }
                    if (!furiganaEnabled) {
                        return <span key={idx}>{part.kanji}</span>;
                    }
                    return (
                        <ruby key={idx} style={{ rubyPosition: 'over', lineHeight: '2.5' }}>
                            {part.kanji}
                            <rp>(</rp>
                            <rt style={{ fontSize: furiganaFontSize, paddingBottom: '4px', letterSpacing: '0.02em', color: furiganaColor }}>{part.reading}</rt>
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
