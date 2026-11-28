import React from 'react';
import ListeningAudioPlayer from './ListeningAudioPlayer';

const MONDAI_TONES = {
    listening: {
        allActive: 'bg-amber-500 text-white shadow-xs',
        allIdle: 'bg-amber-50/70 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 hover:bg-amber-100/80',
        tabActive: 'bg-amber-500 text-white font-black shadow-xs',
        tabIdle: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-300',
        bannerBox: 'bg-amber-50/90 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/70',
        bannerChip: 'bg-amber-500 text-white',
        bannerSub: 'text-amber-700 dark:text-amber-300',
        bannerCount: 'border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
    },
    reading: {
        allActive: 'bg-sky-500 text-white shadow-xs',
        allIdle: 'bg-sky-50/70 dark:bg-sky-950/30 text-sky-800 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/60 hover:bg-sky-100/80',
        tabActive: 'bg-sky-500 text-white font-black shadow-xs',
        tabIdle: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-sky-300',
        bannerBox: 'bg-sky-50/90 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800/70',
        bannerChip: 'bg-sky-500 text-white',
        bannerSub: 'text-sky-700 dark:text-sky-300',
        bannerCount: 'border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300'
    }
};

/**
 * Shared Mondai filter bar for Listening & Lang/Reading sections in both TakeView & ResultView.
 */
export const ListeningMondaiFilterBar = ({
    groups = [],
    selectedMondai = '',
    onSelectMondai = () => {},
    isListening = true
}) => {
    if (!groups || groups.length === 0) return null;
    const tone = isListening ? MONDAI_TONES.listening : MONDAI_TONES.reading;

    return (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {groups.map((g) => {
                const isActive = String(selectedMondai) === String(g.mondai);
                return (
                    <button
                        key={g.mondai}
                        type="button"
                        onClick={() => onSelectMondai(g.mondai)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                            isActive ? tone.tabActive : tone.tabIdle
                        }`}
                    >
                        <span className="font-japanese">問題{g.mondai}</span>
                        <span className="opacity-75 text-[10px]">· {g.meta.vi}</span>
                        <span className={`text-[10px] font-black px-1.5 rounded ${
                            isActive ? 'bg-white/25 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                        }`}>
                            {g.items.length}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};

/**
 * Shared Mondai header banner rendered before the first question of each Mondai group.
 * Optionally embeds a single shared ListeningAudioPlayer when a whole-Mondai track is attached.
 */
export const ListeningMondaiSectionBanner = ({
    group,
    isListening = true,
    sharedAudioUrl = '',
    externalAudioRef = null,
    compactAudio = false,
    examMode = false,
    examTrackState = null,
    onExamTrackStateChange = null
}) => {
    if (!group) return null;
    const tone = isListening ? MONDAI_TONES.listening : MONDAI_TONES.reading;

    return (
        <div className={`rounded-2xl border-2 px-4 py-3 space-y-3 shadow-2xs ${tone.bannerBox}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-start sm:items-center gap-2.5">
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-black shrink-0 font-japanese ${tone.bannerChip}`}>
                        問題 {group.mondai}
                    </span>
                    <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white leading-snug">
                            <span className="font-japanese">{group.meta.ja}</span>
                            <span className={`font-bold ml-1.5 ${tone.bannerSub}`}>· {group.meta.vi}</span>
                        </h3>
                        {group.meta.desc && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                                {group.meta.desc}
                            </p>
                        )}
                    </div>
                </div>
                <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border shrink-0 self-start sm:self-center ${tone.bannerCount}`}>
                    {group.items.length} câu
                </span>
            </div>

            {isListening && sharedAudioUrl && (
                <ListeningAudioPlayer
                    src={sharedAudioUrl}
                    externalRef={externalAudioRef}
                    label=""
                    compact={compactAudio}
                    examMode={examMode}
                    persistedState={examTrackState}
                    onStateChange={onExamTrackStateChange}
                />
            )}
        </div>
    );
};
