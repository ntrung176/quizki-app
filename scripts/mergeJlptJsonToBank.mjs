/**
 * Merge exported JLPT Yearly Exams / Mondai Listening JSON files into public/data/jlpt/{level}.json
 * and rebuild summary.json + chunk files cleanly.
 *
 * Usage:
 *   1. Place .json files (single test object or array of test objects) into data_import/jlpt/
 *   2. Run: node scripts/mergeJlptJsonToBank.mjs [optional-custom-dir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const inputDir = path.resolve(process.cwd(), process.argv[2] || path.join('data_import', 'jlpt'));
const jlptDir = path.resolve(process.cwd(), 'public', 'data', 'jlpt');

if (!fs.existsSync(inputDir)) {
    fs.mkdirSync(inputDir, { recursive: true });
    console.log(`📁 Đã tạo thư mục ${inputDir}. Hãy bỏ các file .json xuất từ Studio vào đây rồi chạy lại lệnh.`);
    process.exit(0);
}

const jsonFiles = fs.readdirSync(inputDir).filter((f) => f.toLowerCase().endsWith('.json'));
if (jsonFiles.length === 0) {
    console.log(`⚠️ Không tìm thấy file .json nào trong ${inputDir}.`);
    process.exit(0);
}

const byLevel = new Map();
let totalImported = 0;

for (const file of jsonFiles) {
    const raw = JSON.parse(fs.readFileSync(path.join(inputDir, file), 'utf8'));
    const items = Array.isArray(raw) ? raw : [raw];
    for (const item of items) {
        if (!item || !item.id || !Array.isArray(item.sections)) {
            console.warn(`⚠️ Bỏ qua mục không hợp lệ trong ${file} (thiếu id hoặc sections).`);
            continue;
        }
        const lvl = String(item.level || 'N3').toLowerCase().trim();
        if (!['n5', 'n4', 'n3', 'n2', 'n1'].includes(lvl)) {
            console.warn(`⚠️ Bỏ qua mục "${item.id}" vì level không hợp lệ: ${item.level}`);
            continue;
        }
        if (!byLevel.has(lvl)) byLevel.set(lvl, []);
        byLevel.get(lvl).push(item);
        totalImported++;
    }
}

for (const [lvl, incomingTests] of byLevel.entries()) {
    const targetFile = path.join(jlptDir, `${lvl}.json`);
    const existing = fs.existsSync(targetFile) ? JSON.parse(fs.readFileSync(targetFile, 'utf8')) : [];
    const map = new Map(existing.map((t) => [t.id, t]));

    incomingTests.forEach((t) => {
        map.set(t.id, { ...t, updatedAt: Date.now() });
    });

    const merged = Array.from(map.values());
    fs.writeFileSync(targetFile, JSON.stringify(merged), 'utf8');
    console.log(`✅ Đã gộp ${incomingTests.length} đề vào public/data/jlpt/${lvl}.json (tổng ${merged.length} đề).`);
}

if (totalImported > 0) {
    console.log('🔄 Đang chạy lại scripts/generateJlptSummary.mjs để cập nhật chunks & summary.json...');
    execSync('node scripts/generateJlptSummary.mjs', { stdio: 'inherit' });
    console.log(`🎉 Hoàn tất nạp ${totalImported} đề mới vào ngân hàng đề tĩnh QuizKi!`);
}
