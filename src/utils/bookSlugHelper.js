/**
 * Helper utilities for human-readable, friendly URLs in Books module
 */

export const slugify = (text) => {
    if (!text) return '';
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove Vietnamese diacritics
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')     // replace non-alphanumeric with -
        .replace(/^-+|-+$/g, '');        // trim -
};

export const getGroupSlug = (group) => {
    if (!group) return '';
    if (group.slug) return group.slug;
    if (group.id === 'openjlpt-topics-group') return 'topics';
    const nameLower = (group.name || '').toLowerCase();
    if (nameLower.includes('mimikara')) return 'mimikara';
    if (nameLower.includes('minna')) return 'minna';
    if (nameLower.includes('soumatome')) return 'soumatome';
    if (nameLower.includes('tango')) return 'tango';
    if (nameLower.includes('daichi')) return 'daichi';
    if (nameLower.includes('irodori')) return 'irodori';
    if (nameLower.includes('noi that') || nameLower.includes('nội thất')) return 'noi-that';
    if (nameLower.includes('chu de') || nameLower.includes('chủ đề')) return 'topics';
    if (nameLower.includes('oxford')) return 'oxford';
    if (nameLower.includes('ielts')) return 'ielts';
    if (nameLower.includes('toeic')) return 'toeic';
    const cleanId = (group.id || '').replace(/^openjlpt-/, '').replace(/-group$/, '');
    if (cleanId && !/^[0-9a-zA-Z]{15,}$/.test(cleanId)) return cleanId;
    return slugify(group.name) || group.id;
};

export const getBookSlug = (book) => {
    if (!book) return '';
    if (book.slug) return book.slug;
    const nameLower = (book.name || '').toLowerCase();
    
    // Check if it's JLPT level: N5, N4, N3, N2, N1
    const jlptMatch = nameLower.match(/\b(n[1-5])\b/i);
    if (jlptMatch) return jlptMatch[1].toLowerCase();
    
    // Check for Sơ Cấp 1, Sơ Cấp 2, Sơ Cấp, Trung Cấp
    if (nameLower.includes('so cap 1') || nameLower.includes('sơ cấp 1')) return 'so-cap-1';
    if (nameLower.includes('so cap 2') || nameLower.includes('sơ cấp 2')) return 'so-cap-2';
    if (nameLower.includes('so cap') || nameLower.includes('sơ cấp')) return 'so-cap';
    if (nameLower.includes('trung cap') || nameLower.includes('trung cấp')) return 'trung-cap';
    if (nameLower.includes('nhap mon') || nameLower.includes('nhập môn')) return 'nhap-mon';
    
    const cleanId = (book.id || '').replace(/^openjlpt-topics-/, '').replace(/^openjlpt-/, '');
    if (cleanId && !/^[0-9a-zA-Z]{15,}$/.test(cleanId)) return cleanId;
    
    return slugify(book.name) || book.id;
};

export const getAllBookLessons = (book) => {
    if (!book || !book.chapters) return [];
    const list = [];
    book.chapters.forEach(ch => {
        (ch.lessons || []).forEach(l => {
            list.push({ ...l, chapterId: ch.id });
        });
    });
    return list;
};

export const getLessonSlug = (lesson, book) => {
    if (!lesson) return '';
    if (lesson.slug) return lesson.slug;
    
    // 1. Check if name contains 'bài X', 'bài-X', 'ngày X'
    const nameMatch = (lesson.name || '').match(/(?:bài|bai|ngay|ngày)\s*(\d+)/i);
    if (nameMatch) {
        return `bai${nameMatch[1]}`;
    }
    
    // 2. Check if ID contains 'bai-X' or 'baiX'
    const idMatch = (lesson.id || '').match(/bai[-_]?(\d+)/i);
    if (idMatch) {
        return `bai${idMatch[1]}`;
    }

    // 3. Fallback to 1-based index in the book (e.g. Từ vựng 1 ~ 71 -> bai1)
    if (book) {
        const allLessons = getAllBookLessons(book);
        const index = allLessons.findIndex(l => l.id === lesson.id);
        if (index !== -1) {
            return `bai${index + 1}`;
        }
    }
    
    return slugify(lesson.name) || lesson.id;
};

export const findGroupByParam = (groups, rawId) => {
    if (!groups || !rawId) return null;
    
    // 1. Direct ID match
    const byId = groups.find(g => g.id === rawId);
    if (byId) return byId;
    
    // 2. Slug match or getGroupSlug match
    const bySlug = groups.find(g => g.slug === rawId || getGroupSlug(g) === rawId);
    if (bySlug) return bySlug;
    
    // 3. Normalized / clean ID match
    const cleanInput = rawId.toLowerCase().replace(/^openjlpt-/, '').replace(/-group$/, '');
    const byClean = groups.find(g => {
        const gSlug = getGroupSlug(g).toLowerCase();
        if (gSlug === cleanInput) return true;
        const gCleanId = (g.id || '').toLowerCase().replace(/^openjlpt-/, '').replace(/-group$/, '');
        return gCleanId === cleanInput;
    });
    if (byClean) return byClean;

    // 4. Name match
    const byName = groups.find(g => {
        const gNameClean = slugify(g.name);
        return gNameClean.includes(cleanInput) || cleanInput.includes(gNameClean);
    });
    if (byName) return byName;
    
    return null;
};

export const findBookByParam = (candidateBooks, rawId) => {
    if (!candidateBooks || !rawId) return null;
    
    // 1. Direct ID match
    const byId = candidateBooks.find(b => b.id === rawId);
    if (byId) return byId;
    
    // 2. Slug match or getBookSlug match
    const bySlug = candidateBooks.find(b => b.slug === rawId || getBookSlug(b) === rawId);
    if (bySlug) return bySlug;
    
    // 3. Clean ID / JLPT match
    const cleanInput = rawId.toLowerCase().replace(/^openjlpt-topics-/, '').replace(/^openjlpt-/, '');
    const byClean = candidateBooks.find(b => {
        const bSlug = getBookSlug(b).toLowerCase();
        if (bSlug === cleanInput) return true;
        const bCleanId = (b.id || '').toLowerCase().replace(/^openjlpt-topics-/, '').replace(/^openjlpt-/, '');
        return bCleanId === cleanInput;
    });
    if (byClean) return byClean;
    
    // 4. Name match (e.g. "n3" matching "Mimikara Oboeru N3")
    const byName = candidateBooks.find(b => {
        const nameClean = slugify(b.name);
        return nameClean === cleanInput || nameClean.endsWith(`-${cleanInput}`) || nameClean.includes(`-${cleanInput}-`);
    });
    if (byName) return byName;
    
    return null;
};

export const findLessonByParam = (book, rawId) => {
    if (!book || !rawId) return null;
    const allLessons = getAllBookLessons(book);
    
    // 1. Direct ID match
    const byId = allLessons.find(l => l.id === rawId);
    if (byId) return byId;
    
    // 2. Slug match
    const bySlug = allLessons.find(l => l.slug === rawId);
    if (bySlug) return bySlug;
    
    // 3. Number or "bai-X" or "baiX" or "X" match
    const numMatch = rawId.match(/^(?:bai[-_]?)?(\d+)$/i);
    if (numMatch) {
        const targetNum = parseInt(numMatch[1], 10);
        
        // Priority A: check if any lesson explicitly has Bài {targetNum} or bai-{targetNum} in name/id
        const explicitLesson = allLessons.find(l => {
            const mN = (l.name || '').match(/(?:bài|bai|ngay|ngày)\s*(\d+)/i);
            if (mN && parseInt(mN[1], 10) === targetNum) return true;
            const mI = (l.id || '').match(/bai[-_]?(\d+)/i);
            if (mI && parseInt(mI[1], 10) === targetNum) return true;
            return false;
        });
        if (explicitLesson) return explicitLesson;
        
        // Priority B: 1-based order index in book
        if (targetNum >= 1 && targetNum <= allLessons.length) {
            return allLessons[targetNum - 1];
        }
    }
    
    // 4. Name slug match
    const cleanRaw = slugify(rawId);
    const byName = allLessons.find(l => slugify(l.name) === cleanRaw);
    if (byName) return byName;
    
    return null;
};
