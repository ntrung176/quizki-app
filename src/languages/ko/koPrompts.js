/**
 * Korean AI Prompt Generators
 */

export const generateKoreanVocabPrompt = (frontText, contextPos = '', contextLevel = '', contextMeaning = '') => {
    const hasMeaning = contextMeaning && contextMeaning.trim() !== '';

    return `You are an expert Korean-Vietnamese dictionary assistant. Output data ONLY for the Korean word/phrase: "${frontText}"${contextPos ? ` (Part of speech: ${contextPos})` : ''}${contextLevel ? ` [Level: ${contextLevel}]` : ''}${hasMeaning ? ` [Requested Meaning: ${contextMeaning}]` : ''}.
DO NOT convert or translate the Korean word "${frontText}" into Japanese, Hiragana, or Kanji under any circumstances.
JSON ONLY, NO MARKDOWN, NO BACKTICKS:
{"front":"${frontText}","reading":"hak-gyo","back":"trường học","sinoVietnamese":"HỌC HIỆU","pos":"noun","level":"TOPIK 1","synonym":"학원","synonymSinoVietnamese":"HỌC VIỆN","example":"1. 저는 매일 아침 8시에 학교에 갑니다.\\n2. 우리 학교는 도서관이 크고 깨끗해요.","exampleMeaning":"1. Tôi đến trường vào lúc 8 giờ mỗi sáng.\\n2. Trường học của chúng tôi có thư viện lớn và sạch sẽ.","nuance":"Dùng cho các cơ sở giáo dục chính quy (tiểu học, trung học, đại học). Thường kết hợp: 학교에 가다 (đến trường), 학교를 다니다 (đi học)."}

MANDATORY RULES FOR KOREAN VOCABULARY:
1. front: ALWAYS KEEP EXACTLY the original Korean word/phrase in Hangul: "${frontText}". Do NOT translate it into Japanese or English.
2. reading: MANDATORY! Provide revised Romanization of Korean (Romaja) for "${frontText}" (e.g. "hak-gyo", "an-nyeong-ha-se-yo", "gong-bu-ha-da").
3. back: ${hasMeaning ? `Keep exact meaning "${contextMeaning}".` : 'Provide concise, accurate Vietnamese translation. Separate different meanings with ";".'}
4. sinoVietnamese: Provide Sino-Korean root in UPPERCASE Vietnamese phonetics if available (Âm Hán Hàn, ví dụ: "HỌC HIỆU" cho "학교", "CÔNG PHU" cho "공부", "ƯỚC THÚC" cho "약속"). If purely native Korean, leave as empty string "".
5. pos: Choose one of: "noun", "verb", "adjective", "adverb", "particle", "conjunction", "pronoun", "expression", "other".
6. level: TOPIK level ("TOPIK 1", "TOPIK 2", "TOPIK 3", "TOPIK 4", "TOPIK 5", "TOPIK 6").
7. synonym: 1-2 common Korean synonyms in Hangul (e.g. "학습" hoặc "학원").
8. synonymSinoVietnamese: Sino-Korean reading of the synonym in UPPERCASE (e.g. "HỌC TẬP") or empty string.
9. example: 1-2 natural, complete Korean example sentences showing common usage or collocation of "${frontText}". Keep "${frontText}" intact in the sentence.
10. exampleMeaning: Natural Vietnamese translation for each example sentence, aligned with the example sentences.
11. nuance: Usage notes, grammar points, honorific notes (kính ngữ / 존댓말 vs thân mật / 반말), or collocations.

DO NOT OUTPUT ANY JAPANESE CHARACTERS. OUTPUT VALID JSON ONLY.`;
};

export const generateKoreanMoreExamplePrompt = (frontText, targetMeaning) => {
    return `You are an expert Korean teacher. Create 1 short, natural, and clear example sentence showing the most common usage/collocation for the Korean vocabulary "${frontText}" with the specific Vietnamese meaning "${targetMeaning}".

REQUIREMENTS:
1. Concise & Natural: The example sentence must be natural, standard Korean (존댓말), concise (max 10-15 words), with clear context showing the common usage of "${frontText}" and the meaning "${targetMeaning}".
2. Keep full word: Keep the complete word "${frontText}" (or its inflected forms) in the sentence. Do NOT use underscores or blank masks.
3. "exampleMeaning": Natural Vietnamese translation for the example sentence.

JSON ONLY (no markdown, no backticks):
{"example":"[short complete Korean sentence containing ${frontText}]","exampleMeaning":"[Vietnamese translation]"}`;
};
