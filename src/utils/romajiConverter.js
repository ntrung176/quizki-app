/**
 * romajiConverter.js
 * Fast Romaji to Hiragana converter for instant dictionary typing.
 */

const ROMAJI_TABLE = {
    'kya': 'きゃ', 'kyu': 'きゅ', 'kyo': 'きょ',
    'sha': 'しゃ', 'shu': 'しゅ', 'sho': 'しょ', 'shi': 'し',
    'cha': 'ちゃ', 'chu': 'ちゅ', 'cho': 'ちょ', 'chi': 'ち',
    'nya': 'にゃ', 'nyu': 'にゅ', 'nyo': 'にょ',
    'hya': 'ひゃ', 'hyu': 'ひゅ', 'hyo': 'ひょ',
    'mya': 'みゃ', 'myu': 'みゅ', 'myo': 'みょ',
    'rya': 'りゃ', 'ryu': 'りゅ', 'ryo': 'りょ',
    'gya': 'ぎゃ', 'gyu': 'ぎゅ', 'gyo': 'ぎょ',
    'ja': 'じゃ', 'ju': 'じゅ', 'jo': 'じょ', 'ji': 'じ',
    'bya': 'びゃ', 'byu': 'びゅ', 'byo': 'びょ',
    'pya': 'ぴゃ', 'pyu': 'ぴゅ', 'pyo': 'ぴょ',

    'ka': 'か', 'ki': 'き', 'ku': 'く', 'ke': 'け', 'ko': 'こ',
    'sa': 'さ', 'si': 'し', 'su': 'す', 'se': 'せ', 'so': 'そ',
    'ta': 'た', 'ti': 'ち', 'tu': 'つ', 'tsu': 'つ', 'te': 'て', 'to': 'と',
    'na': 'な', 'ni': 'に', 'nu': 'ぬ', 'ne': 'ね', 'no': 'の',
    'ha': 'は', 'hi': 'ひ', 'fu': 'ふ', 'hu': 'ふ', 'he': 'へ', 'ho': 'ほ',
    'ma': 'ま', 'mi': 'み', 'mu': 'む', 'me': 'め', 'mo': 'も',
    'ya': 'や', 'yu': 'ゆ', 'yo': 'よ',
    'ra': 'ら', 'ri': 'り', 'ru': 'る', 're': 'れ', 'ro': 'ろ',
    'wa': 'わ', 'wo': 'を', 'nn': 'ん',
    'ga': 'が', 'gi': 'ぎ', 'gu': 'ぐ', 'ge': 'げ', 'go': 'ご',
    'za': 'ざ', 'zi': 'じ', 'zu': 'ず', 'ze': 'ぜ', 'zo': 'ぞ',
    'da': 'だ', 'di': 'ぢ', 'du': 'づ', 'de': 'で', 'do': 'ど',
    'ba': 'ば', 'bi': 'び', 'bu': 'ぶ', 'be': 'べ', 'bo': 'ぼ',
    'pa': 'ぱ', 'pi': 'ぴ', 'pu': 'ぷ', 'pe': 'ぺ', 'po': 'ぽ',
    'a': 'あ', 'i': 'い', 'u': 'う', 'e': 'え', 'o': 'お'
};

/**
 * Converts romaji input string to Hiragana.
 * Preserves double consonants as small tsu (っ) and 'n' before consonants as 'ん'.
 */
export function romajiToHiragana(input) {
    if (!input || typeof input !== 'string') return '';
    let text = input.toLowerCase();

    // Check if input is even ASCII romaji
    if (!/^[a-z\s'-]+$/.test(text)) {
        return input;
    }

    let result = '';
    let i = 0;
    while (i < text.length) {
        // Double consonant check (e.g. 'tt', 'kk', 'ss' -> 'っ')
        if (i + 1 < text.length && text[i] === text[i + 1] && !'aeioun'.includes(text[i])) {
            result += 'っ';
            i++;
            continue;
        }

        // 'n' before consonant or at end of word
        if (text[i] === 'n') {
            if (i + 1 === text.length || (!'aeiouy'.includes(text[i + 1]) && text[i + 1] !== '\'')) {
                result += 'ん';
                i++;
                if (text[i] === '\'') i++; // skip apostrophe like n'
                continue;
            }
        }

        // Check 3-letter combinations (kya, tsu, etc.)
        const three = text.slice(i, i + 3);
        if (ROMAJI_TABLE[three]) {
            result += ROMAJI_TABLE[three];
            i += 3;
            continue;
        }

        // Check 2-letter combinations (ka, sa, etc.)
        const two = text.slice(i, i + 2);
        if (ROMAJI_TABLE[two]) {
            result += ROMAJI_TABLE[two];
            i += 2;
            continue;
        }

        // Check 1-letter vowels
        const one = text[i];
        if (ROMAJI_TABLE[one]) {
            result += ROMAJI_TABLE[one];
            i += 1;
            continue;
        }

        // Unrecognized character (spaces, punctuation)
        result += one;
        i++;
    }

    return result;
}
