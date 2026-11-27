/**
 * Adaptive Placement Evaluator for QuizKi Japanese Interactive Roadmap (10 Stages: Kana -> N1)
 * Maps learner answers across Kana, N5, N4, N3, N2, and N1 into exact starting stage (1..10).
 */

export const TIER_ORDER = ['Kana', 'N5', 'N4', 'N3', 'N2', 'N1'];

export const ROADMAP_STAGE_SUMMARIES = {
    1: {
        stage: 1,
        level: 'kana',
        jlptLevel: 'Kana',
        levelLabel: 'Nền tảng Kana & Nhập môn (Chặng 1)',
        stageLabel: 'Chặng 1: Bảng Chữ Cái Kana & Giao Tiếp Đầu Đời',
        desc: 'Bạn sẽ làm chủ bảng chữ cái Hiragana, Katakana, biến âm và các mẫu câu chào hỏi nền tảng (Irodori Nhập môn).'
    },
    2: {
        stage: 2,
        level: 'n5_basic',
        jlptLevel: 'N5',
        levelLabel: 'N5 Sơ cấp (Chặng 2)',
        stageLabel: 'Chặng 2: N5 Sơ Cấp — Minna 1-12 & Tango 1000',
        desc: 'Bạn đã nắm bảng chữ cái Kana! Hãy bắt đầu xây dựng vốn từ và ngữ pháp Minna Bài 1–12 & Tango 1000.'
    },
    3: {
        stage: 3,
        level: 'n5_complete',
        jlptLevel: 'N5',
        levelLabel: 'N5 Hoàn thiện & Luyện đề N5 (Chặng 3)',
        stageLabel: 'Chặng 3: N5 Hoàn Thiện & Thực Chiến JLPT N5',
        desc: 'Nền tảng sơ cấp của bạn rất tốt! Bạn sẵn sàng chinh phục thể Te/Nai/Ta, Daichi N5 và giải đề thi JLPT N5.'
    },
    4: {
        stage: 4,
        level: 'n4_basic',
        jlptLevel: 'N4',
        levelLabel: 'N4 Sơ trung cấp (Chặng 4)',
        stageLabel: 'Chặng 4: N4 Sơ Trung Cấp — Minna 26-38 & Tango 1500',
        desc: 'Bạn đã vững N5! Lộ trình đưa bạn vào thể Khả năng, Tự/Tha động từ, Ý chí và Bị động ở cấp độ N4.'
    },
    5: {
        stage: 5,
        level: 'n4_advanced',
        jlptLevel: 'N4',
        levelLabel: 'N4 Nâng cao & Kính ngữ (Chặng 5)',
        stageLabel: 'Chặng 5: N4 Nâng Cao & Kính Ngữ (Minna 39-50)',
        desc: 'Bạn nắm tốt N4 cơ bản! Bạn sẽ hoàn thiện Thể Sai khiến, Kính ngữ công sở và tổng duyệt JLPT N4.'
    },
    6: {
        stage: 6,
        level: 'n3_core',
        jlptLevel: 'N3',
        levelLabel: 'N3 Trung cấp cốt lõi (Chặng 6)',
        stageLabel: 'Chặng 6: N3 Trung Cấp Cốt Lõi (Mimikara Oboeru & SKM N3)',
        desc: 'Chúc mừng bạn đã vượt qua Sơ cấp! Hãy bứt phá vốn từ Mimikara N3, Hán tự N3 và ngữ pháp trung cấp cốt lõi.'
    },
    7: {
        stage: 7,
        level: 'n3_mastery',
        jlptLevel: 'N3',
        levelLabel: 'N3 Vững vàng & Đọc hiểu (Chặng 7)',
        stageLabel: 'Chặng 7: N3 Vững Vàng & Tổng Lực Luyện Đề N3',
        desc: 'Kiến thức N3 của bạn rất vững! Bạn sẵn sàng rèn Soumatome N3, Tango 2000 và đọc hiểu phân tích câu dài.'
    },
    8: {
        stage: 8,
        level: 'n2_core',
        jlptLevel: 'N2',
        levelLabel: 'N2 Trung thượng cấp (Chặng 8)',
        stageLabel: 'Chặng 8: N2 Trung Thượng Cấp (Mimikara N2 & SKM N2)',
        desc: 'Tuyệt vời! Bạn đã đạt nền tảng N3 vững chắc và sẵn sàng học từ vựng học thuật, kinh tế & cấu trúc N2.'
    },
    9: {
        stage: 9,
        level: 'n2_mastery',
        jlptLevel: 'N2',
        levelLabel: 'N2 Thực chiến & Chuyên sâu (Chặng 9)',
        stageLabel: 'Chặng 9: N2 Thực Chiến & Đọc Hiểu Chuyên Sâu',
        desc: 'Năng lực N2 của bạn rất ấn tượng! Hãy chinh phục Tango 2500 N2, kính ngữ cao cấp và đề thi thực chiến N2.'
    },
    10: {
        stage: 10,
        level: 'n1',
        jlptLevel: 'N1',
        levelLabel: 'N1 Thượng cấp Master (Chặng 10)',
        stageLabel: 'Chặng 10: N1 Thượng Cấp & Tinh Hoa JLPT Master',
        desc: 'Xuất sắc! Bạn nắm vững từ N5 đến N2 và đủ năng lực bước thẳng vào kho Mimikara N1, Tango 3000 & SKM N1.'
    }
};

export const getScratchDiagnosis = () => ({
    ...ROADMAP_STAGE_SUMMARIES[1],
    level: 'n5_scratch',
    levelLabel: 'Khởi đầu từ số 0 (Kana & Nhập môn)',
    desc: 'Lộ trình tối ưu cho bạn là làm quen bảng chữ cái Kana, phát âm chuẩn và các bài học đầu tiên với Auto SRS.',
    tierBreakdown: [],
    totalCorrect: 0,
    answeredCount: 0,
    unlockedStages: [1]
});

export const computeTierBreakdown = (placementAnswers = {}, questions = []) => {
    const stats = {};
    TIER_ORDER.forEach((lvl) => {
        stats[lvl] = { level: lvl, correct: 0, total: 0, answered: 0 };
    });

    questions.forEach((q, idx) => {
        const lvl = q.level || 'N5';
        if (!stats[lvl]) stats[lvl] = { level: lvl, correct: 0, total: 0, answered: 0 };
        stats[lvl].total += 1;
        const chosen = placementAnswers[idx];
        if (chosen !== undefined && chosen !== null) {
            stats[lvl].answered += 1;
            if (chosen === q.answer) {
                stats[lvl].correct += 1;
            }
        }
    });

    return TIER_ORDER.map((lvl) => stats[lvl]);
};

/**
 * Determine whether the adaptive test has reached a clear ceiling at end of a 3-question tier block.
 * Stops early so novices aren't forced to guess N2/N1, while high-level learners advance all the way to N1.
 */
export const checkAdaptiveCeiling = (currentIdx, updatedAnswers, questions = []) => {
    const q = questions[currentIdx];
    if (!q) return { shouldStop: false, reason: '' };
    const nextQ = questions[currentIdx + 1];
    // Only evaluate at tier boundary
    if (!nextQ || nextQ.level === q.level) {
        return { shouldStop: false, reason: '' };
    }

    const breakdown = computeTierBreakdown(updatedAnswers, questions);
    const byLvl = Object.fromEntries(breakdown.map((b) => [b.level, b]));

    const kanaC = byLvl.Kana?.correct || 0;
    const n5C = byLvl.N5?.correct || 0;
    const n4C = byLvl.N4?.correct || 0;
    const n3C = byLvl.N3?.correct || 0;
    const n2C = byLvl.N2?.correct || 0;

    if (q.level === 'Kana' && kanaC === 0) {
        return {
            shouldStop: true,
            reason: 'Bạn nên bắt đầu từ Chặng 1 (Bảng chữ cái Kana) để nắm chắc nền tảng âm thanh trước khi học lên N5.'
        };
    }
    if (q.level === 'N5' && kanaC + n5C <= 2) {
        return {
            shouldStop: true,
            reason: 'Hệ thống đã xác định rõ nền tảng Kana / N5 sơ cấp của bạn để xếp vào đúng chặng phù hợp.'
        };
    }
    if (q.level === 'N4' && n4C === 0) {
        return {
            shouldStop: true,
            reason: 'Bạn đã thể hiện rõ giới hạn ở mức N5 — hoàn tất bài đánh giá tại đây mà không cần đoán các câu N3-N1.'
        };
    }
    if (q.level === 'N3' && n3C === 0) {
        return {
            shouldStop: true,
            reason: 'Trình độ hiện tại của bạn được xác định chuẩn xác ở ngưỡng N4 — sẵn sàng để lộ trình N4 nâng cao phát huy tối đa.'
        };
    }
    if (q.level === 'N2' && n2C === 0) {
        return {
            shouldStop: true,
            reason: 'Trình độ hiện tại của bạn đang vững ở ngưỡng N3 — không cần kiểm tra thêm câu N1.'
        };
    }

    return { shouldStop: false, reason: '' };
};

/**
 * Compute final diagnosed stage (1..10) using verified tier progression + accuracy gates
 * so random higher-tier guesses never inflate placement if foundational tiers failed.
 */
export const evaluatePlacementPerformance = (placementAnswers = {}, questions = []) => {
    const breakdown = computeTierBreakdown(placementAnswers, questions);
    const byLvl = Object.fromEntries(breakdown.map((b) => [b.level, b]));

    const kanaC = byLvl.Kana?.correct || 0;
    const n5C = byLvl.N5?.correct || 0;
    const n4C = byLvl.N4?.correct || 0;
    const n3C = byLvl.N3?.correct || 0;
    const n2C = byLvl.N2?.correct || 0;
    const n1C = byLvl.N1?.correct || 0;

    const totalCorrect = kanaC + n5C + n4C + n3C + n2C + n1C;
    const answeredCount = breakdown.reduce((sum, b) => sum + b.answered, 0);

    let stage = 1;
    const kanaOk = kanaC >= 2;
    const n5FoundationOk = kanaOk && (kanaC + n5C >= 4 || n5C >= 2);
    const n4FoundationOk = n5FoundationOk && n4C >= 2;
    const n3FoundationOk = n4FoundationOk && n3C >= 2;
    const n2FoundationOk = n3FoundationOk && n2C >= 2;

    if (n2FoundationOk && n1C >= 2) {
        stage = 10; // N1 Master
    } else if (n2FoundationOk && (n2C === 3 || n1C >= 1)) {
        stage = 9; // N2 Thực chiến
    } else if (n3FoundationOk && n2C >= 2) {
        stage = 8; // N2 Trung thượng cấp
    } else if (n3FoundationOk && (n3C === 3 || n2C >= 1)) {
        stage = 7; // N3 Vững vàng
    } else if (n4FoundationOk && n3C >= 2) {
        stage = 6; // N3 Cốt lõi
    } else if (n4FoundationOk && (n4C === 3 || n3C >= 1)) {
        stage = 5; // N4 Nâng cao
    } else if (n5FoundationOk && n4C >= 2) {
        stage = 4; // N4 Sơ trung cấp
    } else if (kanaOk && (n5C === 3 || (n5C >= 2 && n4C >= 1))) {
        stage = 3; // N5 Hoàn thiện
    } else if (kanaOk && n5C >= 1) {
        stage = 2; // N5 Sơ cấp
    } else {
        stage = 1; // Kana nền tảng
    }

    const meta = ROADMAP_STAGE_SUMMARIES[stage] || ROADMAP_STAGE_SUMMARIES[1];
    const unlockedStages = [];
    for (let s = 1; s <= stage; s++) {
        unlockedStages.push(s);
    }

    return {
        ...meta,
        tierBreakdown: breakdown,
        totalCorrect,
        answeredCount,
        totalQuestions: questions.length,
        unlockedStages
    };
};
