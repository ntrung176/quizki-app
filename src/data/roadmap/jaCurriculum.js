/**
 * Japanese Curriculum & Interactive Bite-Sized Lessons for Duolingo Roadmap
 * Covers:
 * - Stage 1: Bảng Chữ Cái Kana & Phát Âm Chuẩn (46 âm Hiragana, Katakana, Dakuon, Trường âm)
 * - Stage 2: Minna no Nihongo Bài 1 - 12 (N5 Sơ Cấp, 100 Kanji Cốt Lõi)
 * - Stage 3: Minna no Nihongo Bài 13 - 25 (N5 Hoàn Thành, Thể Động Từ Cốt Lõi Te, Nai, Ta)
 * - Stage 4: Minna no Nihongo Bài 26 - 38 (N4 Sơ Trung Cấp, Thể Khả Năng, Tự/Tha Động Từ, Bị Động)
 * - Stage 5: Minna no Nihongo Bài 39 - 50 (N4 Nâng Cao, Kính Ngữ, JLPT Master)
 * 
 * Modular architecture: individual stages are cleanly modularized in ./jaStages/
 * for maintainability and strict compliance under 500 lines per file.
 */

import { STAGE_1_KANA } from './jaStages/stage1Kana';
import { STAGE_2_MINNA_1_12 } from './jaStages/stage2Minna1_12';
import { STAGE_3_MINNA_13_25 } from './jaStages/stage3Minna13_25';
import { STAGE_4_MINNA_26_38 } from './jaStages/stage4Minna26_38';
import { STAGE_5_MINNA_39_50 } from './jaStages/stage5Minna39_50';

export const JA_ROADMAP_STAGES = [
    STAGE_1_KANA,
    STAGE_2_MINNA_1_12,
    STAGE_3_MINNA_13_25,
    STAGE_4_MINNA_26_38,
    STAGE_5_MINNA_39_50
];
