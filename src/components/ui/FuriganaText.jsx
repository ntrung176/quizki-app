import React, { useState, useEffect } from 'react';
import { generateFuriganaText } from '../../utils/furiganaHelper';

/**
 * FuriganaText - Renders Japanese text with ruby (furigana) annotations
 * 
 * Parses text like "顔認証（かおにんしょう）システムは技術（ぎじゅつ）を使（つか）っている。"
 * and renders kanji with furigana above using <ruby> HTML tags.
 * If kanji is present without brackets, it automatically generates furigana using kuroshiro.
 * 
 * @param {string} text - Japanese text (with or without brackets)
 * @param {string} className - Optional CSS class for the container
 */
const FuriganaText = ({ text, className = '', forceHide = false }) => {
    const [processedText, setProcessedText] = useState(text || '');
    const [settingEnabled, setSettingEnabled] = useState(true);
    const [furiganaColor, setFuriganaColor] = useState('#8b5cf6');
    const [furiganaFontSize, setFuriganaFontSize] = useState('0.6em');

    const furiganaEnabled = !forceHide && settingEnabled;

    // Initial load and listen for setting changes
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
        const hasFuriganaBrackets = /([\u4E00-\u9FAF\u3400-\u4DBF]+)[（\(\[]/.test(text);

        if (furiganaEnabled && hasKanji && !hasFuriganaBrackets) {
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
    }, [text, furiganaEnabled]);

    if (!processedText) return null;

    // Regex to match kanji followed by furigana in （） or () or []
    const furiganaRegex = /([\u4E00-\u9FAF\u3400-\u4DBF]+)[（\(\[]([^）\)\]]+)[）\)\]]/g;

    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = furiganaRegex.exec(processedText)) !== null) {
        if (match.index > lastIndex) {
            parts.push({
                type: 'text',
                content: processedText.substring(lastIndex, match.index)
            });
        }

        parts.push({
            type: 'ruby',
            kanji: match[1],
            reading: match[2]
        });

        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < processedText.length) {
        parts.push({
            type: 'text',
            content: processedText.substring(lastIndex)
        });
    }

    if (parts.length === 0 || (parts.length === 1 && parts[0].type === 'text')) {
        return <span className={className}>{processedText}</span>;
    }

    return (
        <span className={className}>
            {parts.map((part, idx) => {
                if (part.type === 'ruby') {
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
