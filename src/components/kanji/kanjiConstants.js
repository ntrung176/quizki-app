export const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];

// Colors for each JLPT level (grid buttons)
export const LEVEL_COLORS = {
    N5: { bg: 'bg-emerald-500 dark:bg-emerald-600/80', hover: 'hover:bg-emerald-600 dark:hover:bg-emerald-500', text: 'text-white' },
    N4: { bg: 'bg-sky-500 dark:bg-sky-600/80', hover: 'hover:bg-sky-600 dark:hover:bg-sky-500', text: 'text-white' },
    N3: { bg: 'bg-sky-500 dark:bg-sky-600/80', hover: 'hover:bg-sky-600 dark:hover:bg-sky-500', text: 'text-white' },
    N2: { bg: 'bg-amber-500 dark:bg-amber-600/80', hover: 'hover:bg-amber-600 dark:hover:bg-amber-500', text: 'text-white' },
    N1: { bg: 'bg-rose-500 dark:bg-rose-600/80', hover: 'hover:bg-rose-600 dark:hover:bg-rose-500', text: 'text-white' },
    'Bộ thủ': { bg: 'bg-orange-500 dark:bg-orange-600/80', hover: 'hover:bg-orange-600 dark:hover:bg-orange-500', text: 'text-white' },
    'Mới thêm': { bg: 'bg-indigo-500 dark:bg-indigo-600/80', hover: 'hover:bg-indigo-600 dark:hover:bg-indigo-500', text: 'text-white' },
    'Chưa có từ vựng': { bg: 'bg-fuchsia-500 dark:bg-fuchsia-600/80', hover: 'hover:bg-fuchsia-600 dark:hover:bg-fuchsia-500', text: 'text-white' },
    'Đã có từ vựng': { bg: 'bg-teal-500 dark:bg-teal-600/80', hover: 'hover:bg-teal-600 dark:hover:bg-teal-500', text: 'text-white' },
};

// Tab colors for level selector
export const LEVEL_TAB_COLORS = {
    N5: 'bg-emerald-500 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900/50',
    N4: 'bg-sky-500 text-white shadow-md shadow-sky-200 dark:shadow-sky-900/50',
    N3: 'bg-sky-500 text-white shadow-md shadow-sky-200 dark:shadow-sky-900/50',
    N2: 'bg-amber-500 text-white shadow-md shadow-amber-200 dark:shadow-amber-900/50',
    N1: 'bg-rose-500 text-white shadow-md shadow-rose-900/50',
    'Bộ thủ': 'bg-orange-500 text-white shadow-md shadow-orange-200 dark:shadow-orange-900/50',
    'Mới thêm': 'bg-indigo-500 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/50',
    'Chưa có từ vựng': 'bg-fuchsia-500 text-white shadow-md shadow-fuchsia-200 dark:shadow-fuchsia-900/50',
    'Đã có từ vựng': 'bg-teal-500 text-white shadow-md shadow-teal-200 dark:shadow-teal-900/50',
};
