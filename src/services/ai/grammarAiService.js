// grammarAiService.js — AI Standardizer for Japanese Grammar Structures
// Converts messy Mazii / raw grammar connection notes into clean, pedagogical textbook bracket formulas and concise explanations
import { callAI, getEffectiveModel } from '../../utils/aiProvider';
import { updateGrammarPoint, getSharedGrammarData, invalidateGrammarCache } from '../../utils/grammarService';

/**
 * Prompt template for standardizing grammar structure into textbook bracket notation and concise explanations
 */
const buildStandardizePrompt = ({ pattern, meaning, meaningFull, currentStructure, examples, level }) => {
    const examplesText = Array.isArray(examples) && examples.length > 0
        ? examples.slice(0, 4).map(ex => `• ${typeof ex === 'string' ? ex : `${ex.ja || ''} (${ex.vi || ''})`}`).join('\n')
        : '';

    return `Bạn là một chuyên gia sư phạm hàng đầu về ngữ pháp tiếng Nhật JLPT (tác giả các bộ giáo trình Shinkanzen Master, Soumatome, Try!).
Nhiệm vụ của bạn: Chuẩn hóa lại toàn diện mẫu ngữ pháp tiếng Nhật sau đây thành:
1. CÔNG THỨC KẾT NỐI (接続) theo chuẩn ngoặc vuông [ ... ] TRỰC QUAN, ĐÚNG THỨ TỰ NGỮ PHÁP (TUYỆT ĐỐI KHÔNG ĐẢO VỊ TRÍ).
2. NGHĨA NGẮN GỌN (meaningShort) & BẢN DỊCH CHÍNH XÁC (meaning).
3. GIẢI THÍCH CHI TIẾT NGẮN GỌN (meaningFull): Tối đa 2-3 câu súc tích, dễ hiểu như sách giáo khoa, nêu rõ bản chất, sắc thái (văn viết/nói, tích cực/tiêu cực) và dấu hiệu nhận biết.

THÔNG TIN MẪU NGỮ PHÁP HIỆN TẠI:
- Mẫu ngữ pháp: ${pattern || ''}
- Cấp độ JLPT: ${level || 'N/A'}
- Ý nghĩa hiện tại: ${meaning || ''}
- Giải thích hiện tại: ${meaningFull ? meaningFull.slice(0, 400) : ''}
- Cấu trúc thô hiện tại:
"""
${currentStructure || 'Chưa có'}
"""
${examplesText ? `- Các câu ví dụ tham khảo:\n${examplesText}` : ''}

QUY TẮC BẮT BUỘC KHI XÂY DỰNG CÔNG THỨC KẾT NỐI (ĐẶC BIỆT CHÚ Ý VỊ TRÍ TỪ):
1. XÁC ĐỊNH ĐÚNG VỊ TRÍ NGỮ PHÁP TRONG CÂU (TUYỆT ĐỐI KHÔNG ĐẢO NGƯỢC):
   a. PHÓ TỪ / TỪ BỔ NGHĨA ĐỨNG ĐẦU (Prefix / Introductory modifier):
      - Ví dụ: とても, あまり, ぜんぜん, けっして, どうしても, まるで, どうせ, めったに, おそらく, たぶん, いくら, どんなに, たとえ...
      - Công thức PHẢI ĐẶT MẪU NGỮ PHÁP Ở ĐẦU:
        • とても + [ いA / なA ]  (TUYỆT ĐỐI KHÔNG VIẾT: [ いA / なA ] + とても)
        • 決して + [ V-ない ]
        • まるで + [ 普通形 / N-の ] + ようだ / みたいだ
        • めったに + [ V-ない ]
        • どんなに + [ V-ても / いA-くても / なA-でも ]
   b. HẬU TỐ / MẪU ĐỨNG CUỐI CÂU (Suffix / End pattern):
      - Ví dụ: 〜びる, 〜げ, 〜っこない, 〜わけではない, 〜に違いない, 〜はずだ, 〜ことになっている...
      - Công thức ĐẶT MẪU NGỮ PHÁP Ở CUỐI:
        • [ N / いA-stem ] + びる
        • [ V-stem ] + っこない
        • [ 普通形 (Naだ→な / Nだ→である) ] + わけではない
   c. MẪU LIÊN TỪ / NỐI GIỮA 2 VẾ (Conjunctive connector):
      - Ví dụ: 〜あげく, 〜ばかりに, 〜一方で, 〜反面, 〜につれて, 〜とたん(に)...
      - Công thức ĐẶT MẪU Ở GIỮA HOẶC SAU VẾ 1:
        • [ V-た / N-の ] + あげく (、) + [ Mệnh đề / Kết quả xấu ]
        • [ V-る / N ] + につれて + [ Biến đổi ]
   d. CẤU TRÚC ĐÔI / TƯƠNG HỖ (Correlative structure):
      - Ví dụ: 〜ば〜ほど: [ V-ば ] + [ V-る ] + ほど / [ いA-ければ ] + [ いA-い ] + ほど
      - Ví dụ: 〜から〜にかけて: [ N1 (Thời gian/Địa điểm) ] + から + [ N2 ] + にかけて

2. QUY CHUẨN KÝ HIỆU TỪ LOẠI TRONG NGOẶC VUÔNG:
   - Thể thông thường: 普通形  (Nếu có quy tắc với Na/N thì ghi rõ: 普通形 (Naだ→な / Nだ→である))
   - Động từ: V-る (từ điển), V-ない (phủ định), V-た (quá khứ), V-ている, V-て, V-stem (bỏ ます), V-意向形, V-可能形, V-受身, V-使役, V-ば, V-たら, V-命令形
   - Tính từ đuôi i: いA, いA-く, いA-くて, いA-stem
   - Tính từ đuôi na: なA, なA-な, なA-で, なA-である
   - Danh từ: N, N-の, N-である, N-で, N-な, N-に
   - Các trường hợp cùng thể gộp lại cách nhau bởi dấu gạch chéo '/': [ V-る / V-ない / N-の ]

3. NGHĨA VÀ GIẢI THÍCH (NGẮN GỌN, DỄ HỌC NHƯ SÁCH):
   - "meaningShort": Cực ngắn gọn (Ví dụ: "Rất...", "Sau một hồi... rốt cuộc lại (kết quả xấu)", "Không hẳn là...").
   - "meaning": Ý nghĩa súc tích 1 câu.
   - "meaningFull": Giải thích sư phạm ngắn gọn (2-3 câu, tối đa 200 chữ):
     • Nêu rõ: Ý nghĩa cách dùng cốt lõi + Sắc thái hoàn cảnh (văn viết/nói, tích cực/tiêu cực) + Lưu ý/dấu hiệu nhận biết.
     • Tuyệt đối không để tiếng Anh hoặc dịch máy rườm rà.

TRẢ VỀ DUY NHẤT 1 OBJECT JSON HỢP LỆ (KHÔNG DÙNG MARKDOWN BACKTICKS, KHÔNG GIẢI THÍCH THÊM):
{
  "pattern": "${pattern || ''}",
  "meaningShort": "Rất...",
  "meaning": "Rất, chỉ mức độ cao đi với tính từ",
  "meaningFull": "Là một phó từ chỉ mức độ cao, đứng trước tính từ để bổ nghĩa và nhấn mạnh mức độ cho tính từ đó. Luôn dùng trong câu khẳng định.",
  "structureRaw": "とても + [ いA / なA ]",
  "connection": [
    "とても + [ いA / なA ]"
  ],
  "tips": [
    "Đứng trước tính từ để bổ nghĩa. Luôn dùng trong câu khẳng định, không dùng trong câu phủ định."
  ]
}`;
};

/**
 * Standardize a single grammar point's structure using AI
 */
export const aiStandardizeGrammarStructure = async (grammarPoint, forcedModel = null) => {
    if (!grammarPoint) return null;

    const rawStructure = Array.isArray(grammarPoint.connection) && grammarPoint.connection.length > 0
        ? grammarPoint.connection.join('\n')
        : (grammarPoint.structureRaw || (Array.isArray(grammarPoint.structure) ? grammarPoint.structure.map(s => s.text || s).join('\n') : ''));

    const prompt = buildStandardizePrompt({
        pattern: grammarPoint.pattern || '',
        meaning: grammarPoint.meaningShort || grammarPoint.meaning || '',
        meaningFull: grammarPoint.meaningFull || '',
        currentStructure: rawStructure,
        examples: grammarPoint.examples || [],
        level: grammarPoint.level || ''
    });

    try {
        let activeModel = forcedModel;
        if (!activeModel) {
            try {
                const { loadAdminConfig } = await import('../../utils/adminSettings');
                const config = await loadAdminConfig();
                if (config?.aiFeatureModels?.grammar_gen) {
                    activeModel = config.aiFeatureModels.grammar_gen;
                }
            } catch (e) {
                console.warn('Failed to load admin config for grammar model:', e);
            }
        }
        if (!activeModel) {
            activeModel = 'google/gemini-2.5-flash';
        }
        activeModel = getEffectiveModel(activeModel);

        const responseText = await callAI(prompt, activeModel, 'grammar_gen');
        if (!responseText) throw new Error('AI không phản hồi');

        let cleanText = responseText.trim();
        if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
        else if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
        if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);

        const parsed = JSON.parse(cleanText.trim());
        const structureRaw = (parsed.structureRaw || (Array.isArray(parsed.connection) ? parsed.connection.join('\n') : '')).trim();
        const connection = Array.isArray(parsed.connection) && parsed.connection.length > 0
            ? parsed.connection.map(c => c.trim()).filter(Boolean)
            : structureRaw.split('\n').map(c => c.trim()).filter(Boolean);

        return {
            pattern: parsed.pattern || grammarPoint.pattern,
            meaningShort: (parsed.meaningShort || '').trim(),
            meaning: (parsed.meaning || '').trim(),
            meaningFull: (parsed.meaningFull || '').trim(),
            structureRaw,
            connection,
            tips: Array.isArray(parsed.tips) ? parsed.tips.map(t => typeof t === 'string' ? { text: t, icon: '💡' } : t) : [],
            notes: parsed.notes || '',
            originalStructureRaw: rawStructure
        };
    } catch (error) {
        console.error('aiStandardizeGrammarStructure error:', error);
        throw error;
    }
};

/**
 * Standardize a batch of grammar points with concurrency control and progress tracking
 */
export const aiBatchStandardizeGrammarStructures = async (
    grammarPointsList,
    {
        onProgress = () => {},
        onLog = () => {},
        signal = null,
        forcedModel = null,
        concurrency = 2,
        saveToFirestore = true
    } = {}
) => {
    if (!Array.isArray(grammarPointsList) || grammarPointsList.length === 0) {
        return { total: 0, processed: 0, succeeded: 0, failed: 0, results: [] };
    }

    const total = grammarPointsList.length;
    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    const results = [];

    onLog(`🚀 Bắt đầu chuẩn hóa cấu trúc cho ${total} mẫu ngữ pháp (Đồng thời: ${concurrency})...`);

    // Helper for running queue with concurrency limit
    let queueIndex = 0;
    const runWorker = async (workerId) => {
        while (queueIndex < total) {
            if (signal?.aborted) {
                onLog(`⛔ Quá trình đã được người dùng dừng lại.`);
                break;
            }

            const currentIndex = queueIndex++;
            const gp = grammarPointsList[currentIndex];
            if (!gp) continue;

            const patternName = gp.pattern || `GP #${currentIndex + 1}`;
            try {
                onLog(`[${currentIndex + 1}/${total}] Đang xử lý: "${patternName}" (Level: ${gp.level || '?'})...`);
                const stdResult = await aiStandardizeGrammarStructure(gp, forcedModel);

                if (stdResult && stdResult.structureRaw) {
                    const updatedGp = {
                        ...gp,
                        structureRaw: stdResult.structureRaw,
                        connection: stdResult.connection,
                        structure: stdResult.connection.map(c => ({ text: c, type: 'connector' })),
                        meaningShort: stdResult.meaningShort || gp.meaningShort || '',
                        meaning: stdResult.meaning || gp.meaning || '',
                        meaningFull: stdResult.meaningFull || gp.meaningFull || '',
                        tips: (stdResult.tips && stdResult.tips.length > 0) ? stdResult.tips : (gp.tips || [])
                    };

                    if (saveToFirestore && (gp.textbookId || gp.docPath || gp.lessonId)) {
                        const targetTb = gp.textbookId || 'master_bank';
                        const targetLs = gp.lessonId || (gp.level ? `master_lesson_${gp.level.toLowerCase()}` : 'master_lesson');
                        await updateGrammarPoint(targetTb, targetLs, gp.id, {
                            structureRaw: stdResult.structureRaw,
                            connection: stdResult.connection,
                            structure: updatedGp.structure,
                            meaningShort: updatedGp.meaningShort,
                            meaning: updatedGp.meaning,
                            meaningFull: updatedGp.meaningFull,
                            tips: updatedGp.tips
                        });
                    }

                    results.push({
                        id: gp.id,
                        pattern: gp.pattern,
                        level: gp.level,
                        success: true,
                        before: stdResult.originalStructureRaw,
                        after: stdResult.structureRaw,
                        meaningShort: updatedGp.meaningShort,
                        meaningFull: updatedGp.meaningFull,
                        updatedGp
                    });
                    succeeded++;
                    onLog(`✅ [${currentIndex + 1}/${total}] Hoàn thành: "${patternName}" -> ${stdResult.structureRaw.split('\n')[0]}`);
                } else {
                    throw new Error('Kết quả chuẩn hóa rỗng');
                }
            } catch (err) {
                failed++;
                console.error(`Lỗi chuẩn hóa ${patternName}:`, err);
                onLog(`❌ [${currentIndex + 1}/${total}] Thất bại "${patternName}": ${err.message}`);
                results.push({
                    id: gp.id,
                    pattern: gp.pattern,
                    level: gp.level,
                    success: false,
                    error: err.message
                });
            } finally {
                processed++;
                onProgress({
                    total,
                    processed,
                    succeeded,
                    failed,
                    percent: Math.round((processed / total) * 100),
                    currentPattern: patternName
                });
            }

            // Brief throttle between AI calls
            await new Promise(r => setTimeout(r, 400));
        }
    };

    const workers = Array.from({ length: Math.min(concurrency, total) }, (_, i) => runWorker(i + 1));
    await Promise.all(workers);

    if (saveToFirestore) {
        invalidateGrammarCache();
    }

    onLog(`🏁 Hoàn tất xử lý: Thành công ${succeeded}/${total}, Thất bại ${failed}.`);
    return {
        total,
        processed,
        succeeded,
        failed,
        results
    };
};
