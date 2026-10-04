import React from 'react';

/**
 * Calculate total vocab count safely avoiding string concatenation bugs
 */
export const calculateTotalVocab = (item) => {
    if (!item) return 0;
    let count = 0;

    if (item.books && Array.isArray(item.books)) {
        for (const b of item.books) {
            if (b.wordCount !== undefined && b.wordCount !== null) {
                count += parseInt(b.wordCount, 10) || 0;
            } else if (b.chapters && Array.isArray(b.chapters)) {
                for (const ch of b.chapters) {
                    if (ch.lessons && Array.isArray(ch.lessons)) {
                        for (const ls of ch.lessons) {
                            count += (ls.vocab?.length || 0);
                        }
                    }
                }
            }
        }
    } else if (item.chapters && Array.isArray(item.chapters)) {
        if (item.wordCount !== undefined && item.wordCount !== null && parseInt(item.wordCount, 10) > 0) {
            count = parseInt(item.wordCount, 10) || 0;
        } else {
            for (const ch of item.chapters) {
                if (ch.lessons && Array.isArray(ch.lessons)) {
                    for (const ls of ch.lessons) {
                        count += (ls.vocab?.length || 0);
                    }
                }
            }
        }
    } else if (item.wordCount !== undefined && item.wordCount !== null) {
        count = parseInt(item.wordCount, 10) || 0;
    }

    return count;
};

/**
 * Calculate total lessons count safely
 */
export const calculateTotalLessons = (item) => {
    if (!item) return 0;
    let count = 0;

    if (item.books && Array.isArray(item.books)) {
        for (const b of item.books) {
            if (b.chapters && Array.isArray(b.chapters)) {
                for (const ch of b.chapters) {
                    count += (ch.lessons?.length || 0);
                }
            }
        }
    } else if (item.chapters && Array.isArray(item.chapters)) {
        for (const ch of item.chapters) {
            count += (ch.lessons?.length || 0);
        }
    }

    return count;
};

/**
 * Smart metadata and color themes for book thumbnails
 * Style: Ultra-clean two-tone flat rectangular blocks with vibrant, elegant palettes
 */
export const getBookCoverMeta = ({
    name = '',
    subtitle = '',
    groupName = '',
    item = null,
    progress = 0,
    customTopSub = null,
    customMainTitle = null,
    customBottomTitle = null,
    customBottomSub = null
} = {}) => {
    const rawName = name || item?.name || '';
    const rawSub = subtitle || item?.subtitle || item?.description || '';
    const nameLower = rawName.toLowerCase();
    const groupLower = (groupName || '').toLowerCase();
    const subLower = rawSub.toLowerCase();

    // 1. Determine Color Theme based on brand/category first, then level
    let theme = {
        topBg: 'bg-slate-100 dark:bg-slate-800',
        topText: 'text-slate-900 dark:text-slate-100',
        bottomBg: 'bg-slate-700 dark:bg-slate-600',
        bottomText: 'text-white'
    };

    // Specific Brand Themes (Highest priority for distinct, gorgeous visuals)
    if (nameLower.includes('minna') || groupLower.includes('minna')) {
        // Minna: Crimson Rose & Soft Rose
        theme = {
            topBg: 'bg-rose-50 dark:bg-rose-950/50',
            topText: 'text-rose-900 dark:text-rose-100',
            bottomBg: 'bg-rose-600 dark:bg-rose-700',
            bottomText: 'text-white'
        };
    } else if (nameLower.includes('mimikara') || groupLower.includes('mimikara')) {
        // Mimikara: Royal Indigo & Soft Lavender Ice
        theme = {
            topBg: 'bg-indigo-50 dark:bg-indigo-950/50',
            topText: 'text-indigo-950 dark:text-indigo-100',
            bottomBg: 'bg-indigo-600 dark:bg-indigo-700',
            bottomText: 'text-white'
        };
    } else if (nameLower.includes('daichi') || groupLower.includes('daichi')) {
        // Daichi: Ocean Sky Blue & Soft Ice Blue
        theme = {
            topBg: 'bg-sky-50 dark:bg-sky-950/50',
            topText: 'text-sky-950 dark:text-sky-100',
            bottomBg: 'bg-sky-600 dark:bg-sky-700',
            bottomText: 'text-white'
        };
    } else if (nameLower.includes('irodori') || groupLower.includes('irodori')) {
        // Irodori: Warm Amber Orange & Soft Peach
        theme = {
            topBg: 'bg-amber-50 dark:bg-amber-950/50',
            topText: 'text-amber-950 dark:text-amber-100',
            bottomBg: 'bg-amber-600 dark:bg-amber-700',
            bottomText: 'text-white'
        };
    } else if (nameLower.includes('chủ đề') || groupLower.includes('chủ đề') || nameLower.includes('topic') || subLower.includes('chủ đề')) {
        // Topic Vocabulary: Purple & Soft Violet
        theme = {
            topBg: 'bg-purple-50 dark:bg-purple-950/50',
            topText: 'text-purple-950 dark:text-purple-100',
            bottomBg: 'bg-purple-600 dark:bg-purple-700',
            bottomText: 'text-white'
        };
    } else if (nameLower.includes('nội thất') || nameLower.includes('thiết kế') || groupLower.includes('nội thất')) {
        // Interior Design / Specialized: Elegant Slate Graphite
        theme = {
            topBg: 'bg-slate-100 dark:bg-slate-800',
            topText: 'text-slate-900 dark:text-slate-100',
            bottomBg: 'bg-slate-800 dark:bg-slate-700',
            bottomText: 'text-white'
        };
    } else if (nameLower.includes('soumatome') || nameLower.includes('somatome') || nameLower.includes('tổng hợp')) {
        // Soumatome: Emerald Jade & Soft Mint
        theme = {
            topBg: 'bg-emerald-50 dark:bg-emerald-950/50',
            topText: 'text-emerald-950 dark:text-emerald-100',
            bottomBg: 'bg-emerald-600 dark:bg-emerald-700',
            bottomText: 'text-white'
        };
    } else if (nameLower.includes('tango') || groupLower.includes('tango')) {
        // Tango Series: Level-specific or Modern Teal Cyan
        if (nameLower.includes('n5')) {
            theme = {
                topBg: 'bg-emerald-50 dark:bg-emerald-950/50',
                topText: 'text-emerald-950 dark:text-emerald-100',
                bottomBg: 'bg-emerald-600 dark:bg-emerald-700',
                bottomText: 'text-white'
            };
        } else if (nameLower.includes('n4')) {
            theme = {
                topBg: 'bg-sky-50 dark:bg-sky-950/50',
                topText: 'text-sky-950 dark:text-sky-100',
                bottomBg: 'bg-sky-600 dark:bg-sky-700',
                bottomText: 'text-white'
            };
        } else if (nameLower.includes('n3')) {
            theme = {
                topBg: 'bg-purple-50 dark:bg-purple-950/50',
                topText: 'text-purple-950 dark:text-purple-100',
                bottomBg: 'bg-purple-600 dark:bg-purple-700',
                bottomText: 'text-white'
            };
        } else if (nameLower.includes('n2')) {
            theme = {
                topBg: 'bg-amber-50 dark:bg-amber-950/50',
                topText: 'text-amber-950 dark:text-amber-100',
                bottomBg: 'bg-amber-600 dark:bg-amber-700',
                bottomText: 'text-white'
            };
        } else if (nameLower.includes('n1')) {
            theme = {
                topBg: 'bg-rose-50 dark:bg-rose-950/50',
                topText: 'text-rose-950 dark:text-rose-100',
                bottomBg: 'bg-rose-600 dark:bg-rose-700',
                bottomText: 'text-white'
            };
        } else {
            theme = {
                topBg: 'bg-teal-50 dark:bg-teal-950/50',
                topText: 'text-teal-950 dark:text-teal-100',
                bottomBg: 'bg-teal-600 dark:bg-teal-700',
                bottomText: 'text-white'
            };
        }
    } else if (nameLower.includes('oxford') || groupLower.includes('oxford')) {
        // Oxford: Classic Royal Blue & Ice
        theme = {
            topBg: 'bg-blue-50 dark:bg-blue-950/50',
            topText: 'text-blue-950 dark:text-blue-100',
            bottomBg: 'bg-blue-600 dark:bg-blue-700',
            bottomText: 'text-white'
        };
    } else if (nameLower.includes('ielts') || groupLower.includes('ielts')) {
        // IELTS: Fuchsia Berry & Soft Pink
        theme = {
            topBg: 'bg-fuchsia-50 dark:bg-fuchsia-950/50',
            topText: 'text-fuchsia-950 dark:text-fuchsia-100',
            bottomBg: 'bg-fuchsia-600 dark:bg-fuchsia-700',
            bottomText: 'text-white'
        };
    } else if (nameLower.includes('toeic') || groupLower.includes('toeic')) {
        // TOEIC: Amber Golden & Soft Peach
        theme = {
            topBg: 'bg-amber-50 dark:bg-amber-950/50',
            topText: 'text-amber-950 dark:text-amber-100',
            bottomBg: 'bg-amber-600 dark:bg-amber-700',
            bottomText: 'text-white'
        };
    } else if (nameLower === 'n5' || nameLower.startsWith('n5 ') || nameLower.endsWith(' n5')) {
        // Standalone N5: Emerald
        theme = {
            topBg: 'bg-emerald-50 dark:bg-emerald-950/50',
            topText: 'text-emerald-950 dark:text-emerald-100',
            bottomBg: 'bg-emerald-600 dark:bg-emerald-700',
            bottomText: 'text-white'
        };
    } else if (nameLower === 'n4' || nameLower.startsWith('n4 ') || nameLower.endsWith(' n4')) {
        // Standalone N4: Teal
        theme = {
            topBg: 'bg-teal-50 dark:bg-teal-950/50',
            topText: 'text-teal-950 dark:text-teal-100',
            bottomBg: 'bg-teal-600 dark:bg-teal-700',
            bottomText: 'text-white'
        };
    } else if (nameLower === 'n3' || nameLower.startsWith('n3 ') || nameLower.endsWith(' n3')) {
        // Standalone N3: Blue
        theme = {
            topBg: 'bg-blue-50 dark:bg-blue-950/50',
            topText: 'text-blue-950 dark:text-blue-100',
            bottomBg: 'bg-blue-600 dark:bg-blue-700',
            bottomText: 'text-white'
        };
    } else if (nameLower === 'n2' || nameLower.startsWith('n2 ') || nameLower.endsWith(' n2')) {
        // Standalone N2: Indigo
        theme = {
            topBg: 'bg-indigo-50 dark:bg-indigo-950/50',
            topText: 'text-indigo-950 dark:text-indigo-100',
            bottomBg: 'bg-indigo-600 dark:bg-indigo-700',
            bottomText: 'text-white'
        };
    } else if (nameLower === 'n1' || nameLower.startsWith('n1 ') || nameLower.endsWith(' n1')) {
        // Standalone N1: Rose / Red
        theme = {
            topBg: 'bg-rose-50 dark:bg-rose-950/50',
            topText: 'text-rose-950 dark:text-rose-100',
            bottomBg: 'bg-rose-600 dark:bg-rose-700',
            bottomText: 'text-white'
        };
    }

    // 2. Compute Top Subtitle
    let topSub = customTopSub;
    if (!topSub) {
        if (groupName) {
            // Book inside a group
            if (groupLower.includes('daichi')) {
                topSub = nameLower.includes('n5') || nameLower.includes('1') ? 'Giáo trình Daichi · Sơ cấp I' : nameLower.includes('n4') || nameLower.includes('2') ? 'Giáo trình Daichi · Sơ cấp II' : `Giáo trình Daichi · ${rawName}`;
            } else if (groupLower.includes('minna')) {
                topSub = nameLower.includes('n5') || nameLower.includes('1') || nameLower.includes('i') ? 'Minna no Nihongo · Sơ cấp I' : nameLower.includes('n4') || nameLower.includes('2') || nameLower.includes('ii') ? 'Minna no Nihongo · Sơ cấp II' : `Minna no Nihongo · ${rawName}`;
            } else if (groupLower.includes('mimikara')) {
                topSub = `Mimi Kara Oboeru · ${rawName}`;
            } else if (groupLower.includes('irodori')) {
                topSub = `Irodori · ${rawName}`;
            } else if (groupLower.includes('tango')) {
                topSub = `Tango · ${rawName}`;
            } else {
                topSub = `${groupName}${rawSub ? ` · ${rawSub}` : ''}`;
            }
        } else {
            // Group card on main screen
            if (rawSub) {
                topSub = rawSub;
            } else if (nameLower.includes('minna')) {
                topSub = 'Giáo trình quốc dân 50 bài';
            } else if (nameLower.includes('daichi')) {
                topSub = 'Giáo trình sơ cấp N5 và N4';
            } else if (nameLower.includes('mimikara')) {
                topSub = 'Sách từ vựng JLPT N3, N2, N1';
            } else if (nameLower.includes('tango')) {
                topSub = 'Trọn bộ từ vựng JLPT N5 đến N1';
            } else if (nameLower.includes('irodori')) {
                topSub = 'Sách hội thoại tiếng Nhật A1 và A2';
            } else if (nameLower.includes('chủ đề')) {
                topSub = 'Tuyển tập từ vựng tiếng Nhật theo chủ đề';
            } else if (nameLower.includes('nội thất') || nameLower.includes('thiết kế')) {
                topSub = 'Tài liệu từ vựng chuyên ngành';
            } else {
                topSub = 'Bộ giáo trình từ vựng';
            }
        }
    }

    // 3. Compute Main Center Title (NO TRUNCATION, CLEAN DISPLAY)
    let mainTitle = customMainTitle;
    if (!mainTitle) {
        if (['n5', 'n4', 'n3', 'n2', 'n1'].includes(nameLower)) {
            mainTitle = rawName.toUpperCase();
        } else if (nameLower.includes('minna')) {
            mainTitle = 'MINNA';
        } else if (nameLower.includes('mimikara')) {
            mainTitle = 'MIMIKARA';
        } else if (nameLower.includes('daichi')) {
            mainTitle = 'DAICHI';
        } else if (nameLower.includes('irodori')) {
            mainTitle = 'IRODORI';
        } else if (nameLower.includes('tango')) {
            if (nameLower.includes('n5')) mainTitle = 'TANGO N5';
            else if (nameLower.includes('n4')) mainTitle = 'TANGO N4';
            else if (nameLower.includes('n3')) mainTitle = 'TANGO N3';
            else if (nameLower.includes('n2')) mainTitle = 'TANGO N2';
            else if (nameLower.includes('n1')) mainTitle = 'TANGO N1';
            else mainTitle = 'TANGO';
        } else if (nameLower.includes('oxford')) {
            mainTitle = 'OXFORD';
        } else if (nameLower.includes('ielts')) {
            mainTitle = 'IELTS';
        } else if (nameLower.includes('toeic')) {
            mainTitle = 'TOEIC';
        } else if (nameLower.includes('chủ đề')) {
            mainTitle = 'TỪ VỰNG CHỦ ĐỀ';
        } else if (nameLower.includes('nội thất') || nameLower.includes('thiết kế')) {
            mainTitle = 'THIẾT KẾ NỘI THẤT';
        } else {
            mainTitle = rawName.toUpperCase();
        }
    }

    // 4. Compute Bottom Section Title & Subtitle
    const totalVocab = calculateTotalVocab(item);
    const totalLessons = calculateTotalLessons(item);
    const isBookItem = Boolean(groupName) || (item && (item.chapters !== undefined || (item.books === undefined && item.wordCount !== undefined)));

    let bottomTitle = customBottomTitle;
    let bottomSub = customBottomSub;

    if (isBookItem) {
        // Single Book
        if (!bottomTitle) {
            if (totalLessons > 0) {
                bottomTitle = `${totalLessons} bài học`;
            } else if (item?.chapters?.length > 0) {
                bottomTitle = `${item.chapters.length} chương`;
            } else if (totalVocab > 0) {
                bottomTitle = `${totalVocab} từ vựng`;
            } else if (groupLower.includes('daichi')) {
                bottomTitle = nameLower.includes('n5') ? '20 bài học' : '22 bài học';
            } else if (groupLower.includes('minna')) {
                bottomTitle = '25 bài học';
            } else if (groupLower.includes('mimikara')) {
                bottomTitle = `Luyện thi JLPT ${rawName}`;
            } else {
                bottomTitle = 'Sách từ vựng';
            }
        }

        if (!bottomSub) {
            const progressSuffix = progress > 0 ? ` · Tiến độ ${progress}%` : '';
            if (totalVocab > 0) {
                bottomSub = `${totalVocab} từ vựng tổng hợp${progressSuffix}`;
            } else if (rawSub) {
                bottomSub = `${rawSub}${progressSuffix}`;
            } else if (groupLower.includes('daichi')) {
                bottomSub = nameLower.includes('n5') ? `Sách từ vựng Daichi Sơ cấp 1${progressSuffix}` : `Sách từ vựng Daichi Sơ cấp 2${progressSuffix}`;
            } else if (groupLower.includes('minna')) {
                bottomSub = nameLower.includes('n5') ? `Từ vựng Minna Bài 1 - 25${progressSuffix}` : `Từ vựng Minna Bài 26 - 50${progressSuffix}`;
            } else if (groupLower.includes('mimikara')) {
                bottomSub = `Ghi nhớ từ vựng qua âm thanh${progressSuffix}`;
            } else {
                bottomSub = `${groupName || 'Học và ôn tập từ vựng'}${progressSuffix}`;
            }
        }
    } else {
        // Group of Books
        const totalBooks = item?.books?.length || 0;

        if (!bottomTitle) {
            if (totalBooks > 0 && totalLessons > 0) {
                bottomTitle = `${totalBooks} tập · ${totalLessons} bài học`;
            } else if (totalBooks > 0) {
                bottomTitle = `${totalBooks} tập sách`;
            } else if (nameLower.includes('minna')) {
                bottomTitle = '2 tập · 50 bài học';
            } else if (nameLower.includes('daichi')) {
                bottomTitle = '2 tập · 42 bài học';
            } else if (nameLower.includes('mimikara')) {
                bottomTitle = '3 tập · N3 - N1';
            } else if (nameLower.includes('tango')) {
                bottomTitle = '5 tập · 276 bài học';
            } else if (nameLower.includes('irodori')) {
                bottomTitle = '1 tập · 21 bài học';
            } else if (nameLower.includes('oxford')) {
                bottomTitle = '3000 từ vựng cốt lõi';
            } else {
                bottomTitle = 'Bộ sách từ vựng';
            }
        }

        if (!bottomSub) {
            const progressSuffix = progress > 0 ? ` · Tiến độ ${progress}%` : '';
            if (totalVocab > 0) {
                bottomSub = `${totalVocab.toLocaleString('vi-VN')} từ vựng tổng hợp${progressSuffix}`;
            } else if (rawSub) {
                bottomSub = `${rawSub}${progressSuffix}`;
            } else if (nameLower.includes('minna')) {
                bottomSub = `2.000+ từ vựng nền tảng${progressSuffix}`;
            } else if (nameLower.includes('daichi')) {
                bottomSub = `Sách từ vựng N5 và N4${progressSuffix}`;
            } else if (nameLower.includes('mimikara')) {
                bottomSub = `Luyện thi JLPT chuyên sâu${progressSuffix}`;
            } else if (nameLower.includes('tango')) {
                bottomSub = `6.700+ từ vựng N5 ~ N1${progressSuffix}`;
            } else if (nameLower.includes('irodori')) {
                bottomSub = `Từ vựng & Mẫu câu thực tế${progressSuffix}`;
            } else {
                bottomSub = `Học và ghi nhớ từ vựng${progressSuffix}`;
            }
        }
    }

    return {
        topSub,
        mainTitle,
        bottomTitle,
        bottomSub,
        ...theme
    };
};

/**
 * Ultra-simple rectangular 2-tone Book Thumbnail
 */
const BookThumbnail = ({
    name = '',
    subtitle = '',
    groupName = '',
    item = null,
    progress = 0,
    customTopSub = null,
    customMainTitle = null,
    customBottomTitle = null,
    customBottomSub = null,
    className = 'h-44 sm:h-52'
}) => {
    const meta = getBookCoverMeta({
        name,
        subtitle,
        groupName,
        item,
        progress,
        customTopSub,
        customMainTitle,
        customBottomTitle,
        customBottomSub
    });

    // Dynamic Title Font Size based on text length to prevent overflow
    const getTitleSizeClass = (text = '') => {
        if (text.length >= 16) return 'text-lg sm:text-xl font-black leading-tight';
        if (text.length >= 11) return 'text-xl sm:text-2xl font-black leading-tight';
        if (text.length >= 7) return 'text-2xl sm:text-3xl font-black leading-tight';
        return 'text-3xl sm:text-4xl font-black leading-tight';
    };

    return (
        <div className={`w-full flex flex-col justify-between overflow-hidden select-none relative ${className}`}>
            {/* Top section: Subtitle + Big Bold Title */}
            <div className={`flex-[1.15] flex flex-col justify-center items-center px-4 py-3 sm:py-4 text-center transition-colors ${meta.topBg} ${meta.topText}`}>
                <span className="text-[11px] sm:text-xs font-semibold opacity-90 line-clamp-1 max-w-full px-2 tracking-wide">
                    {meta.topSub}
                </span>
                <span className={`tracking-tight mt-1 px-2 text-center max-w-full break-words ${getTitleSizeClass(meta.mainTitle)}`}>
                    {meta.mainTitle}
                </span>
            </div>

            {/* Bottom section: Lesson count / subtitle bar */}
            <div className={`flex-1 flex flex-col justify-center items-center px-4 py-2.5 sm:py-3 text-center transition-colors ${meta.bottomBg} ${meta.bottomText}`}>
                <span className="text-xs sm:text-sm font-bold line-clamp-1 max-w-full leading-snug">
                    {meta.bottomTitle}
                </span>
                <span className="text-[10px] sm:text-xs opacity-90 line-clamp-1 max-w-full mt-0.5">
                    {meta.bottomSub}
                </span>
            </div>
        </div>
    );
};

export default BookThumbnail;
