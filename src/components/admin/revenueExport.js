import * as XLSX from 'xlsx';

export const parseRecordDate = (val) => {
    if (!val) return null;
    const d = typeof val?.toDate === 'function' ? val.toDate() : new Date(val);
    return isNaN(d.getTime()) ? null : d;
};

export const toYearMonth = (date) => {
    if (!date) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export const shiftMonth = (ymStr, delta) => {
    const [y, m] = (ymStr || toYearMonth(new Date())).split('-').map(Number);
    const d = new Date(y || new Date().getFullYear(), (m || 1) - 1 + delta, 1);
    return toYearMonth(d);
};

export const filterTransactionsByMonth = (creditRequests = [], selectedMonth) => {
    return creditRequests.filter(r => {
        if (r.status !== 'approved') return false;
        const d = parseRecordDate(r.processedAt || r.createdAt);
        return d ? toYearMonth(d) === selectedMonth : false;
    });
};

export const filterExpensesByMonth = (expenses = [], selectedMonth) => {
    return expenses.filter(exp => {
        if (exp.recurring === 'monthly') return true;
        if (exp.recurring === 'yearly') {
            return (exp.month || '').slice(5, 7) === selectedMonth.slice(5, 7);
        }
        return exp.month === selectedMonth;
    });
};

export const exportMonthlyRevenueExcel = ({ selectedMonth, monthTxs, monthExps, users = [] }) => {
    const totalRevenue = monthTxs.reduce((s, r) => s + (r.amount || 0), 0);
    const totalFixed = monthExps.filter(e => e.type === 'fixed').reduce((s, e) => s + (e.amount || 0), 0);
    const totalOp = monthExps.filter(e => e.type === 'operating').reduce((s, e) => s + (e.amount || 0), 0);
    const totalOther = monthExps.filter(e => e.type === 'other').reduce((s, e) => s + (e.amount || 0), 0);
    const totalExp = totalFixed + totalOp + totalOther;
    const profit = totalRevenue - totalExp;

    const summaryData = [
        ['BÁO CÁO DOANH THU THÁNG', selectedMonth],
        [],
        ['Hạng mục', 'Số tiền (VND)'],
        ['Doanh thu', totalRevenue],
        ['Chi phí cố định', totalFixed],
        ['Chi phí vận hành', totalOp],
        ['Chi phí khác', totalOther],
        ['Tổng chi phí', totalExp],
        [],
        ['LỢI NHUẬN RÒNG', profit],
        [],
        ['Số giao dịch thanh toán', monthTxs.length],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    ws1['!cols'] = [{ wch: 32 }, { wch: 20 }];

    const txHeaders = ['STT', 'Ngày', 'Người dùng', 'Email', 'Gói', 'Số tiền (VND)'];
    const txRows = monthTxs.map((r, i) => {
        const d = parseRecordDate(r.processedAt || r.createdAt);
        const user = users.find(u => u.userId === r.userId);
        return [
            i + 1,
            d ? d.toLocaleDateString('vi-VN') : '',
            user?.displayName || r.userName || 'N/A',
            user?.email || r.userEmail || '',
            r.packageName || r.packageId || '',
            r.amount || 0
        ];
    });
    const ws2 = XLSX.utils.aoa_to_sheet([txHeaders, ...txRows]);
    ws2['!cols'] = [{ wch: 5 }, { wch: 14 }, { wch: 22 }, { wch: 26 }, { wch: 20 }, { wch: 16 }];

    const expHeaders = ['STT', 'Tên chi phí', 'Loại', 'Chu kỳ', 'Tháng', 'Số tiền (VND)', 'Ghi chú'];
    const typeMap = { fixed: 'Cố định', operating: 'Vận hành', other: 'Khác' };
    const recurMap = { monthly: 'Hàng tháng', yearly: 'Hàng năm', once: 'Một lần' };
    const expRows = monthExps.map((e, i) => [
        i + 1,
        e.name,
        typeMap[e.type] || e.type,
        recurMap[e.recurring] || e.recurring,
        e.month,
        e.amount || 0,
        e.description || ''
    ]);
    const ws3 = XLSX.utils.aoa_to_sheet([expHeaders, ...expRows]);
    ws3['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 15 }, { wch: 30 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'Tổng quan');
    XLSX.utils.book_append_sheet(wb, ws2, 'Giao dịch');
    XLSX.utils.book_append_sheet(wb, ws3, 'Chi phí');
    XLSX.writeFile(wb, `DoanhThu_${selectedMonth}.xlsx`);
};
