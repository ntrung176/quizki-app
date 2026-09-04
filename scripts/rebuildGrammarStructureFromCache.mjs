import fs from 'fs';
import path from 'path';

const dataPath = path.join(process.cwd(), 'public/data/grammar_data.json');
const cacheDir = path.join(process.cwd(), 'scripts/.grammar_cache');

if (!fs.existsSync(dataPath)) {
    console.error('Không tìm thấy file', dataPath);
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

function cleanSynopsis(syn) {
    if (!syn) return [];
    return syn
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .split('\n')
        .map(s => s.replace(/^[✦•\-\*]\s*/, '').trim())
        .filter(Boolean);
}

let totalPoints = 0;
let foundDetails = 0;
let withStructure = 0;

data.forEach(tb => {
    (tb.lessons || []).forEach(ls => {
        (ls.points || []).forEach(pt => {
            totalPoints++;
            const rawId = pt.id ? pt.id.replace(/^master_/, '') : '';
            const detailFile = path.join(cacheDir, `detail_${rawId}.json`);
            if (fs.existsSync(detailFile)) {
                foundDetails++;
                try {
                    const detail = JSON.parse(fs.readFileSync(detailFile, 'utf-8'));
                    if (detail && detail.usages && detail.usages.length > 0) {
                        const syn = detail.usages[0].synopsis;
                        const lines = cleanSynopsis(syn);
                        if (lines.length > 0) {
                            withStructure++;
                            pt.connection = lines;
                            pt.structureRaw = lines.join('\n');
                        }
                    }
                } catch (err) {}
            }
        });
    });
});

console.log(`Đã xử lý: Tổng số mẫu = ${totalPoints}, Tìm thấy cache = ${foundDetails}, Có cấu trúc chuẩn Mazii = ${withStructure}`);
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
console.log('✅ Đã cập nhật xong public/data/grammar_data.json!');
