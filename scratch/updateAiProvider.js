import fs from 'fs';

const filePath = 'd:/CODE GAME/quizki-app-main/src/utils/aiProvider.js';
let content = fs.readFileSync(filePath, 'utf8');

const originalText = 'Bắt buộc chọn một trong các chuỗi sau: "noun" (danh từ), "verb" (động từ), "suru_verb" (danh động từ - suru verb), "adj-i" (tính từ -い), "adj-na" (tính từ -な), "adverb" (trạng từ)';
const updatedText = 'Bắt buộc chọn một trong các chuỗi sau: "noun" (danh từ), "verb" (động từ), "suru_verb" (danh động từ - suru verb), "adj-i" (tính từ -い), "adj-na" (tính từ -な), "noun/adj-na" (danh từ kiêm tính từ -な), "adverb" (trạng từ)';

if (content.includes(originalText)) {
    content = content.replace(originalText, updatedText);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Successfully replaced in aiProvider.js!");
} else {
    console.log("Still not found exactly.");
}
