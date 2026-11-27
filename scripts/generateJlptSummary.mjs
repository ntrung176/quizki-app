import fs from 'fs';
import path from 'path';

const levels = ['n5', 'n4', 'n3', 'n2', 'n1'];
const TARGET_CHUNK_BYTES = 250 * 1024; // ~250 KB per chunk for <50ms load & parse
const jlptDir = path.join(process.cwd(), 'public', 'data', 'jlpt');
const chunksDir = path.join(jlptDir, 'chunks');

fs.rmSync(chunksDir, { recursive: true, force: true });
fs.mkdirSync(chunksDir, { recursive: true });

const summary = [];
const chunksManifest = {};
let totalChunkFiles = 0;

levels.forEach((lvl) => {
    const filePath = path.join(jlptDir, `${lvl}.json`);
    if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${filePath}`);
        return;
    }

    console.log(`Processing ${lvl}...`);
    const tests = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const levelChunkFiles = [];

    let chunkIdx = 0;
    let currentChunk = [];
    let currentBytes = 2; // []

    const flushChunk = () => {
        if (currentChunk.length === 0) return null;
        const fileName = `${lvl}_${chunkIdx}.json`;
        fs.writeFileSync(path.join(chunksDir, fileName), JSON.stringify(currentChunk), 'utf8');
        levelChunkFiles.push(fileName);
        totalChunkFiles++;
        chunkIdx++;
        currentChunk = [];
        currentBytes = 2;
        return fileName;
    };

    tests.forEach((t) => {
        let questionCount = 0;
        const sectionsCount = Array.isArray(t.sections) ? t.sections.length : 0;

        if (t.sections && Array.isArray(t.sections)) {
            t.sections.forEach((s) => {
                if (s && s.questions && Array.isArray(s.questions)) {
                    s.questions.forEach((q) => {
                        if (q && Array.isArray(q.subQuestions) && q.subQuestions.length > 0) {
                            questionCount += q.subQuestions.length;
                        } else {
                            questionCount += 1;
                        }
                    });
                }
            });
        }

        const testByteLen = Buffer.byteLength(JSON.stringify(t), 'utf8');
        if (currentChunk.length > 0 && currentBytes + testByteLen + 1 > TARGET_CHUNK_BYTES) {
            flushChunk();
        }
        const assignedChunkFile = `${lvl}_${chunkIdx}.json`;
        currentChunk.push(t);
        currentBytes += testByteLen + 1;

        const summaryEntry = {
            id: t.id,
            title: t.title,
            baiNumber: t.baiNumber,
            level: t.level,
            timeLimit: t.timeLimit,
            isSkillTest: t.isSkillTest,
            skillType: t.skillType,
            isRoadmapTest: t.isRoadmapTest,
            isPremium: t.isPremium,
            strategy: t.strategy,
            description: t.description,
            bookSlug: t.bookSlug,
            bookTitle: t.bookTitle,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            questionCount,
            sectionsCount,
            chunkFile: assignedChunkFile
        };
        if (t.examYear) summaryEntry.examYear = t.examYear;
        if (t.examSession) summaryEntry.examSession = t.examSession;
        if (t.category) summaryEntry.category = t.category;
        if (t.mondaiNumber) summaryEntry.mondaiNumber = t.mondaiNumber;
        if (t.hasListening || (Array.isArray(t.sections) && t.sections.some((s) => s?.type === 'listening'))) {
            summaryEntry.hasListening = true;
        }
        if (t.mondaiCounts && Object.keys(t.mondaiCounts).length > 0) {
            summaryEntry.mondaiCounts = t.mondaiCounts;
        }
        summary.push(summaryEntry);
    });

    flushChunk();
    chunksManifest[lvl] = levelChunkFiles;
});

const outPath = path.join(jlptDir, 'summary.json');
fs.writeFileSync(outPath, JSON.stringify(summary), 'utf8');

const manifestPath = path.join(chunksDir, 'manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify({
    version: Date.now(),
    totalTests: summary.length,
    totalChunks: totalChunkFiles,
    levels: chunksManifest
}), 'utf8');

const stat = fs.statSync(outPath);
console.log(`✅ Successfully generated ${summary.length} tests in summary.json across ${totalChunkFiles} chunks!`);
console.log(`📁 summary.json size: ${(stat.size / 1024 / 1024).toFixed(2)} MB (${Math.round(stat.size / 1024)} KB)`);
