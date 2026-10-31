import React from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../context/LanguageContext';

const VocabCardSettingsModal = ({
    isOpen,
    onClose,
    cardSettings,
    setCardSettings,
    isKoreanMode = false,
    isEnglishMode = false,
}) => {
    const { t } = useLanguage();

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" />
            <div
                className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-gray-200 dark:border-slate-700/80 animate-fade-in text-slate-850 dark:text-slate-200 max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <h4 className="font-extrabold text-lg border-b border-gray-150 dark:border-slate-700 pb-2.5 mb-3">
                    {t('vocab.cardSettingsTitle', 'Cấu hình thẻ ghi nhớ')}
                </h4>
                <div className="space-y-4 text-xs font-semibold text-slate-700 dark:text-slate-350">
                    {/* Review Type: Typing mode toggle */}
                    <div className="flex items-center justify-between border-b border-gray-150/40 dark:border-slate-700 pb-3 mb-2">
                        <div>
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold block">
                                {t('vocab.typingModeTitle', 'Chế độ gõ câu trả lời (Typing)')}
                            </span>
                            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-normal">
                                {t('vocab.typingModeDesc', 'Gõ đáp án và so sánh kết quả từng ký tự')}
                            </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
                            <input
                                type="checkbox"
                                checked={cardSettings.reviewType === 'typing'}
                                onChange={(e) => setCardSettings(prev => ({ ...prev, reviewType: e.target.checked ? 'typing' : 'flashcard' }))}
                                className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>

                    {/* Swap sides */}
                    <div className="flex items-center justify-between border-b border-gray-150/40 dark:border-slate-700 pb-3 mb-2">
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                            {t('vocab.swapSides', 'Đổi mặt trước/mặt sau')}
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={cardSettings.swapSides}
                                onChange={(e) => setCardSettings(prev => ({ ...prev, swapSides: e.target.checked }))}
                                className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>

                    {/* Audio enable */}
                    <div className="flex items-center justify-between border-b border-gray-150/40 dark:border-slate-700 pb-3 mb-2">
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                            {t('vocab.playAudio', 'Phát âm thanh từ vựng')}
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={cardSettings.audioEnabled !== false}
                                onChange={(e) => setCardSettings(prev => ({ ...prev, audioEnabled: e.target.checked }))}
                                className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>

                    {/* Auto play audio on flip */}
                    <div className="flex items-center justify-between border-b border-gray-150/40 dark:border-slate-700 pb-3 mb-2">
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                            {t('vocab.autoPlayAudio', 'Tự động phát âm thanh khi lật')}
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={cardSettings.autoPlayAudio}
                                onChange={(e) => setCardSettings(prev => ({ ...prev, autoPlayAudio: e.target.checked }))}
                                className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>

                    {/* Hints & Front/Back Displays */}
                    {cardSettings.reviewType === 'typing' ? (
                        isKoreanMode ? (
                            <>
                                <div className="bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 rounded-2xl p-3 text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed space-y-1 mb-2">
                                    <p className="font-bold flex items-center gap-1.5 text-indigo-900 dark:text-indigo-200">
                                        <span>⌨️</span> {t('vocab.typingHintsTitle', 'Chế độ gõ từ (Typing):')}
                                    </p>
                                    <p className="text-[11.5px] opacity-90">
                                        • {t('vocab.typingHintsKoreanDesc', 'Bạn có thể chọn hiển thị Phiên âm Romaja, Âm Hán Hàn hoặc Từ loại ở mặt câu hỏi để làm gợi ý khi gõ từ tiếng Hàn.')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 text-[10px]">
                                        {t('vocab.questionHintsTitle', 'Gợi ý mặt câu hỏi:')}
                                    </p>
                                    <div className="space-y-2.5 pl-1 text-[13px]">
                                        <label className="flex items-center gap-2.5 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={cardSettings.front.reading !== false}
                                                onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, reading: e.target.checked } }))}
                                                className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                            />
                                            <span>{t('vocab.romajaHint', 'Phiên âm Romaja (gợi ý)')}</span>
                                        </label>
                                        <label className="flex items-center gap-2.5 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={cardSettings.front.hanviet !== false}
                                                onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, hanviet: e.target.checked } }))}
                                                className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                            />
                                            <span>{t('vocab.hanhanHint', 'Âm Hán Hàn (gợi ý)')}</span>
                                        </label>
                                        <label className="flex items-center gap-2.5 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={cardSettings.front.pos !== false}
                                                onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, pos: e.target.checked } }))}
                                                className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                            />
                                            <span>{t('vocab.posHint', 'Từ loại (Danh từ, Động từ...) (gợi ý)')}</span>
                                        </label>
                                    </div>
                                </div>
                            </>
                        ) : isEnglishMode ? (
                            <>
                                <div className="bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 rounded-2xl p-3 text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed space-y-1 mb-2">
                                    <p className="font-bold flex items-center gap-1.5 text-indigo-900 dark:text-indigo-200">
                                        <span>⌨️</span> {t('vocab.typingHintsTitle', 'Chế độ gõ từ (Typing):')}
                                    </p>
                                    <p className="text-[11.5px] opacity-90">
                                        • {t('vocab.typingHintsEnglishDesc', 'Bạn có thể chọn hiển thị Phiên âm IPA hoặc Từ loại ở mặt câu hỏi để làm gợi ý khi gõ từ tiếng Anh.')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 text-[10px]">
                                        {t('vocab.questionHintsTitle', 'Gợi ý mặt câu hỏi:')}
                                    </p>
                                    <div className="space-y-2.5 pl-1 text-[13px]">
                                        <label className="flex items-center gap-2.5 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={cardSettings.front.ipa !== false}
                                                onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, ipa: e.target.checked } }))}
                                                className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                            />
                                            <span>{t('vocab.ipaHint', 'Phiên âm IPA (gợi ý)')}</span>
                                        </label>
                                        <label className="flex items-center gap-2.5 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={cardSettings.front.pos !== false}
                                                onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, pos: e.target.checked } }))}
                                                className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                            />
                                            <span>{t('vocab.posHint', 'Từ loại (Noun, Verb...) (gợi ý)')}</span>
                                        </label>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 rounded-2xl p-3 text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed space-y-1 mb-2">
                                    <p className="font-bold flex items-center gap-1.5 text-indigo-900 dark:text-indigo-200">
                                        <span>⌨️</span> {t('vocab.typingHintsTitle', 'Chế độ gõ từ (Typing):')}
                                    </p>
                                    <p className="text-[11.5px] opacity-90">
                                        • {t('vocab.typingHintsJapaneseDesc', 'Bạn có thể tích chọn Âm Hán Việt ở mặt câu hỏi để làm gợi ý khi gõ đáp án.')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 text-[10px]">
                                        {t('vocab.questionHintsTitle', 'Gợi ý mặt câu hỏi:')}
                                    </p>
                                    <div className="space-y-2.5 pl-1 text-[13px]">
                                        <label className="flex items-center gap-2.5 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={cardSettings.front.hanviet}
                                                onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, hanviet: e.target.checked } }))}
                                                className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                            />
                                            <span>{t('vocab.hanvietHint', 'Âm Hán Việt (gợi ý)')}</span>
                                        </label>
                                    </div>
                                </div>
                            </>
                        )
                    ) : (
                        isKoreanMode ? (
                            <div>
                                <p className="text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 text-[10px]">
                                    {t('vocab.koreanFrontTitle', 'Mặt tiếng Hàn hiển thị:')}
                                </p>
                                <div className="space-y-2.5 pl-1 text-[13px]">
                                    <label className="flex items-center gap-2.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={cardSettings.front.word !== false}
                                            onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, word: e.target.checked } }))}
                                            className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                        />
                                        <span>{t('vocab.koreanWord', 'Từ vựng tiếng Hàn (Hangul)')}</span>
                                    </label>
                                    <label className="flex items-center gap-2.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={cardSettings.front.reading !== false}
                                            onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, reading: e.target.checked } }))}
                                            className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                        />
                                        <span>{t('vocab.romaja', 'Phiên âm Romaja')}</span>
                                    </label>
                                    <label className="flex items-center gap-2.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={cardSettings.front.hanviet}
                                            onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, hanviet: e.target.checked } }))}
                                            className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                        />
                                        <span>{t('vocab.hanhan', 'Âm Hán Hàn')}</span>
                                    </label>
                                    <label className="flex items-center gap-2.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={cardSettings.front.pos !== false}
                                            onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, pos: e.target.checked } }))}
                                            className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                        />
                                        <span>{t('vocab.partOfSpeech', 'Từ loại (Danh từ, Động từ...)')}</span>
                                    </label>
                                </div>
                            </div>
                        ) : isEnglishMode ? (
                            <div>
                                <p className="text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 text-[10px]">
                                    {t('vocab.englishFrontTitle', 'Mặt tiếng Anh hiển thị:')}
                                </p>
                                <div className="space-y-2.5 pl-1 text-[13px]">
                                    <label className="flex items-center gap-2.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={cardSettings.front.word !== false}
                                            onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, word: e.target.checked } }))}
                                            className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                        />
                                        <span>{t('vocab.englishWord', 'Từ vựng tiếng Anh')}</span>
                                    </label>
                                    <label className="flex items-center gap-2.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={cardSettings.front.ipa !== false}
                                            onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, ipa: e.target.checked } }))}
                                            className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                        />
                                        <span>{t('vocab.ipa', 'Phiên âm quốc tế IPA')}</span>
                                    </label>
                                    <label className="flex items-center gap-2.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={cardSettings.front.pos !== false}
                                            onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, pos: e.target.checked } }))}
                                            className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                        />
                                        <span>{t('vocab.partOfSpeech', 'Từ loại (Noun, Verb...)')}</span>
                                    </label>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <p className="text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 text-[10px]">
                                    {t('vocab.japaneseFrontTitle', 'Mặt tiếng Nhật hiển thị:')}
                                </p>
                                <div className="space-y-2.5 pl-1 text-[13px]">
                                    <label className="flex items-center gap-2.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={cardSettings.front.word}
                                            onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, word: e.target.checked } }))}
                                            className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                        />
                                        <span>{t('vocab.kanjiWord', 'Chữ Hán / Từ vựng')}</span>
                                    </label>
                                    <label className="flex items-center gap-2.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={cardSettings.front.furigana}
                                            onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, furigana: e.target.checked } }))}
                                            className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                        />
                                        <span>{t('vocab.furigana', 'Phiên âm Furigana')}</span>
                                    </label>
                                    <label className="flex items-center gap-2.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={cardSettings.front.hanviet}
                                            onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, hanviet: e.target.checked } }))}
                                            className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                        />
                                        <span>{t('vocab.hanviet', 'Âm Hán Việt')}</span>
                                    </label>
                                </div>
                            </div>
                        )
                    )}

                    {/* Back face displays */}
                    {isKoreanMode ? (
                        <div>
                            <p className="text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 text-[10px]">
                                {t('vocab.backCardDisplay', 'Mặt nghĩa dịch hiển thị:')}
                            </p>
                            <div className="space-y-2.5 pl-1 text-[13px]">
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={cardSettings.back.meaning !== false}
                                        onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, meaning: e.target.checked } }))}
                                        className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                    />
                                    <span>{t('vocab.meaning', 'Nghĩa')}</span>
                                </label>
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={cardSettings.back.reading !== false}
                                        onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, reading: e.target.checked } }))}
                                        className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                    />
                                    <span>{t('vocab.romaja', 'Phiên âm Romaja')}</span>
                                </label>
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={cardSettings.back.hanviet}
                                        onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, hanviet: e.target.checked } }))}
                                        className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                    />
                                    <span>{t('vocab.hanhan', 'Âm Hán Hàn')}</span>
                                </label>
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={cardSettings.back.pos !== false}
                                        onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, pos: e.target.checked } }))}
                                        className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                    />
                                    <span>{t('vocab.partOfSpeech', 'Từ loại (Danh từ, Động từ...)')}</span>
                                </label>
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={cardSettings.back.synonym}
                                        onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, synonym: e.target.checked } }))}
                                        className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                    />
                                    <span>{t('vocab.synonym', 'Từ đồng nghĩa / Trái nghĩa')}</span>
                                </label>
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={cardSettings.back.example}
                                        onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, example: e.target.checked } }))}
                                        className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                    />
                                    <span>{t('vocab.example', 'Câu ví dụ')}</span>
                                </label>
                                {cardSettings.back.example && (
                                    <div className="pl-6 space-y-2 border-l border-gray-200 dark:border-slate-700 mt-1">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={cardSettings.back.exampleMeaning !== false}
                                                onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, exampleMeaning: e.target.checked } }))}
                                                className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                            />
                                            <span className="text-gray-500 dark:text-gray-400">{t('vocab.exampleMeaning', 'Dịch câu ví dụ')}</span>
                                        </label>
                                    </div>
                                )}
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={cardSettings.back.image !== false}
                                        onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, image: e.target.checked } }))}
                                        className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                    />
                                    <span>{t('vocab.illustrationImage', 'Hình ảnh minh họa')}</span>
                                </label>
                            </div>
                        </div>
                    ) : isEnglishMode ? (
                        <div>
                            <p className="text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 text-[10px]">
                                {t('vocab.backCardDisplay', 'Mặt nghĩa dịch hiển thị:')}
                            </p>
                            <div className="space-y-2.5 pl-1 text-[13px]">
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={cardSettings.back.meaning !== false}
                                        onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, meaning: e.target.checked } }))}
                                        className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                    />
                                    <span>{t('vocab.meaning', 'Nghĩa')}</span>
                                </label>
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={cardSettings.back.ipa !== false}
                                        onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, ipa: e.target.checked } }))}
                                        className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                    />
                                    <span>{t('vocab.ipa', 'Phiên âm quốc tế IPA')}</span>
                                </label>
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={cardSettings.back.pos !== false}
                                        onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, pos: e.target.checked } }))}
                                        className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                    />
                                    <span>{t('vocab.partOfSpeech', 'Từ loại (Noun, Verb...)')}</span>
                                </label>
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={cardSettings.back.synonym}
                                        onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, synonym: e.target.checked } }))}
                                        className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                    />
                                    <span>{t('vocab.synonym', 'Từ đồng nghĩa / Trái nghĩa')}</span>
                                </label>
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={cardSettings.back.example}
                                        onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, example: e.target.checked } }))}
                                        className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                    />
                                    <span>{t('vocab.example', 'Câu ví dụ')}</span>
                                </label>
                                {cardSettings.back.example && (
                                    <div className="pl-6 space-y-2 border-l border-gray-200 dark:border-slate-700 mt-1">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={cardSettings.back.exampleMeaning !== false}
                                                onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, exampleMeaning: e.target.checked } }))}
                                                className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                            />
                                            <span className="text-gray-500 dark:text-gray-400">{t('vocab.exampleMeaning', 'Dịch câu ví dụ')}</span>
                                        </label>
                                    </div>
                                )}
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={cardSettings.back.image !== false}
                                        onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, image: e.target.checked } }))}
                                        className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                    />
                                    <span>{t('vocab.illustrationImage', 'Hình ảnh minh họa')}</span>
                                </label>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <p className="text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 text-[10px]">
                                {t('vocab.backCardDisplay', 'Mặt nghĩa dịch hiển thị:')}
                            </p>
                            <div className="space-y-2.5 pl-1 text-[13px]">
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={cardSettings.back.meaning}
                                        onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, meaning: e.target.checked } }))}
                                        className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                    />
                                    <span>{t('vocab.meaning', 'Nghĩa')}</span>
                                </label>
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={cardSettings.back.furigana !== false}
                                        onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, furigana: e.target.checked } }))}
                                        className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                    />
                                    <span>{t('vocab.furigana', 'Phiên âm Furigana')}</span>
                                </label>
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={cardSettings.back.reading}
                                        onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, reading: e.target.checked } }))}
                                        className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                    />
                                    <span>{t('vocab.readingHiragana', 'Cách đọc (Hiragana)')}</span>
                                </label>
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={cardSettings.back.hanviet}
                                        onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, hanviet: e.target.checked } }))}
                                        className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                    />
                                    <span>{t('vocab.hanviet', 'Âm Hán Việt')}</span>
                                </label>
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={cardSettings.back.synonym}
                                        onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, synonym: e.target.checked } }))}
                                        className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                    />
                                    <span>{t('vocab.synonym', 'Đồng nghĩa')}</span>
                                </label>
                                {cardSettings.back.synonym && (
                                    <div className="pl-6 space-y-2 border-l border-gray-200 dark:border-slate-700 mt-1">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={cardSettings.back.synonymFurigana !== false}
                                                onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, synonymFurigana: e.target.checked } }))}
                                                className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                            />
                                            <span className="text-gray-500 dark:text-gray-400">{t('vocab.synonymFurigana', 'Furigana đồng nghĩa')}</span>
                                        </label>
                                    </div>
                                )}
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={cardSettings.back.example}
                                        onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, example: e.target.checked } }))}
                                        className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                    />
                                    <span>{t('vocab.example', 'Ví dụ')}</span>
                                </label>
                                {cardSettings.back.example && (
                                    <div className="pl-6 space-y-2 border-l border-gray-200 dark:border-slate-700 mt-1">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={cardSettings.back.exampleFurigana !== false}
                                                onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, exampleFurigana: e.target.checked } }))}
                                                className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                            />
                                            <span className="text-gray-500 dark:text-gray-400">{t('vocab.exampleFurigana', 'Furigana ví dụ')}</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={cardSettings.back.exampleMeaning !== false}
                                                onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, exampleMeaning: e.target.checked } }))}
                                                className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                            />
                                            <span className="text-gray-500 dark:text-gray-400">{t('vocab.exampleMeaning', 'Dịch câu ví dụ')}</span>
                                        </label>
                                    </div>
                                )}
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={cardSettings.back.image !== false}
                                        onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, image: e.target.checked } }))}
                                        className="rounded border-gray-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4"
                                    />
                                    <span>{t('vocab.illustrationImage', 'Hình ảnh minh họa')}</span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>
                <div className="pt-3">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 active:border-b-0 border-b-4 border-emerald-700 text-white font-black uppercase tracking-wider rounded-2xl transition-all shadow-xs text-xs cursor-pointer select-none"
                    >
                        {t('common.close', 'Đóng')}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default VocabCardSettingsModal;

