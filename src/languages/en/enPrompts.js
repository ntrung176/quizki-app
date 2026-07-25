/**
 * English AI Prompt Generators
 */

export const generateEnglishVocabPrompt = (frontText, contextPos = '', contextLevel = '', contextMeaning = '') => {
    const hasMeaning = contextMeaning && contextMeaning.trim() !== '';

    return `You are an expert English-Vietnamese dictionary assistant. Output data ONLY for the English word/phrase: "${frontText}"${contextPos ? ` (Part of speech: ${contextPos})` : ''}${contextLevel ? ` [Level: ${contextLevel}]` : ''}${hasMeaning ? ` [Requested Meaning: ${contextMeaning}]` : ''}.
DO NOT convert or translate the English word "${frontText}" into Japanese, Hiragana, or Kanji under any circumstances.
JSON ONLY, NO MARKDOWN, NO BACKTICKS:
{"front":"${frontText}","meaning":"trí thông minh, sự hiểu biết","ipa":"/ɪnˈtɛlɪdʒəns/","pos":"noun","level":"B2","synonym":"intellect, wisdom","example":"Artificial ＿＿＿＿ is transforming modern medicine.","exampleMeaning":"Trí tuệ nhân tạo đang biến đổi ngành y học hiện đại.","nuance":"Thường đi theo cụm: emotional intelligence (EQ), artificial intelligence (AI), high/superior intelligence."}

MANDATORY RULES FOR ENGLISH VOCABULARY:
1. front: ALWAYS KEEP EXACTLY the original English word/phrase "${frontText}". Do NOT translate it into Japanese, Hiragana, or Kanji.
2. meaning: ${hasMeaning ? `Keep exact meaning "${contextMeaning}".` : 'Provide concise, accurate Vietnamese translation. Separate different meanings with ";".'}
3. ipa: MANDATORY! Provide valid International Phonetic Alphabet (IPA) for "${frontText}" enclosed in slashes (e.g. "/ɪnˈtɛlɪdʒəns/"). NEVER leave ipa blank!
4. pos: Choose one of: "noun", "verb", "adjective", "adverb", "preposition", "conjunction", "pronoun", "phrasal_verb", "idiom", "other".
5. level: CEFR level (A1, A2, B1, B2, C1, C2) or test score (IELTS, TOEIC).
6. synonym: 2-3 common English synonyms (e.g. "intellect, wisdom").
7. example: Exactly 1 natural English example sentence. Replace "${frontText}" with ＿＿＿＿ (4 underscores).
8. exampleMeaning: Natural Vietnamese translation for the example sentence.
9. nuance: Usage notes, collocations, or grammar context.

DO NOT OUTPUT ANY JAPANESE CHARACTERS (KANJI, HIRAGANA, KATAKANA). OUTPUT VALID JSON ONLY.`;
};

export const generateEnglishMoreExamplePrompt = (frontText, targetMeaning) => {
    return `You are an expert English teacher. Create 1 short, natural, and clear example sentence for the English vocabulary "${frontText}" with the specific Vietnamese meaning "${targetMeaning}".

REQUIREMENTS:
1. Concise & Natural: The example sentence must be natural, concise (max 10-14 words), with clear context showing the meaning "${targetMeaning}".
2. Target word replacement: In the English sentence, replace the word "${frontText}" (or its inflected forms) with ＿＿＿＿ (4 underscores).
3. "exampleMeaning": Natural Vietnamese translation for the example sentence.

JSON ONLY (no markdown, no backticks):
{"example":"[short English sentence containing ＿＿＿＿]","exampleMeaning":"[Vietnamese translation]"}`;
};
