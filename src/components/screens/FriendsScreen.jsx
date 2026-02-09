import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';

const FriendsScreen = ({ publicStatsPath, currentUserId, onBack }) => {
    const [friendStats, setFriendStats] = useState([]);
    const [_isLoading, setIsLoading] = useState(true); // eslint-disable-line no-unused-vars

    useEffect(() => {
        if (!db || !publicStatsPath) return;
        const q = query(collection(db, publicStatsPath));
        const unsubscribe = onSnapshot(q, (s) => {
            const l = s.docs.map(d => ({ ...d.data(), odId: d.id }));
            l.sort((a, b) => (b.totalCards || 0) - (a.totalCards || 0));
            setFriendStats(l);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [publicStatsPath]);

    return (
        <div className="space-y-3 md:space-y-6">
            <h2 className="text-lg md:text-2xl font-bold text-gray-800 dark:text-gray-100 pb-2 md:pb-4 border-b dark:border-gray-700">Bảng Xếp Hạng</h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto overflow-y-visible -mx-2 md:mx-0 px-2 md:px-0">
                    <table className="w-full min-w-[500px]">
                        <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-600">
                            <tr>
                                <th className="px-3 md:px-6 py-2 md:py-4 text-left text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Hạng</th>
                                <th className="px-3 md:px-6 py-2 md:py-4 text-left text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Thành viên</th>
                                <th className="px-2 md:px-4 py-2 md:py-4 text-center text-[10px] md:text-xs font-bold text-amber-600 dark:text-amber-400 uppercase">Ngắn</th>
                                <th className="px-2 md:px-4 py-2 md:py-4 text-center text-[10px] md:text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">Trung</th>
                                <th className="px-2 md:px-4 py-2 md:py-4 text-center text-[10px] md:text-xs font-bold text-green-700 dark:text-green-400 uppercase">Dài</th>
                                <th className="px-3 md:px-6 py-2 md:py-4 text-right text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Tổng từ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                            {friendStats.map((u, i) => (
                                <tr key={u.userId} className={u.userId === currentUserId ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}>
                                    <td className="px-3 md:px-6 py-2 md:py-4 text-xs md:text-sm font-bold text-gray-400 dark:text-gray-500">#{i + 1}</td>
                                    <td className={`px-3 md:px-6 py-2 md:py-4 text-xs md:text-sm font-bold ${u.userId === currentUserId ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                        <span className="truncate max-w-[150px] md:max-w-none">{u.displayName} {u.userId === currentUserId && '(Bạn)'}</span>
                                    </td>
                                    <td className="px-2 md:px-4 py-2 md:py-4 text-center text-xs md:text-sm font-medium text-amber-600 dark:text-amber-400">{u.shortTerm || 0}</td>
                                    <td className="px-2 md:px-4 py-2 md:py-4 text-center text-xs md:text-sm font-medium text-emerald-600 dark:text-emerald-400">{u.midTerm || 0}</td>
                                    <td className="px-2 md:px-4 py-2 md:py-4 text-center text-xs md:text-sm font-medium text-green-700 dark:text-green-400">{u.longTerm || 0}</td>
                                    <td className="px-3 md:px-6 py-2 md:py-4 text-right text-xs md:text-sm font-bold text-emerald-600 dark:text-emerald-400">{u.totalCards}</td>
                                </tr>
                            ))}
                            {friendStats.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                                        Chưa có thành viên nào trên bảng xếp hạng
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FriendsScreen;
