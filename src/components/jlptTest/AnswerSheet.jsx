import React, { Fragment } from 'react';

const filledBubbles = ['❶', '❷', '❸', '❹'];

const AnswerSheet = ({ totalQuestions = 0, answerableQuestions = [], includeAnswers = false }) => {
    const total = totalQuestions || answerableQuestions.length || 0;
    if (total === 0) return null;

    const itemsPerCol = Math.ceil(total / 3);
    const rows = [];
    for (let i = 0; i < itemsPerCol; i++) {
        rows.push([
            i + 1,
            i + 1 + itemsPerCol,
            i + 1 + itemsPerCol * 2
        ]);
    }
    
    return (
        <div className="print-page-break mt-8">
            <div className="border-t-2 border-black pt-6">
                <h3 className="text-center font-bold text-lg mb-2 uppercase tracking-wider">
                    PHIẾU TRẢ LỜI ĐÁP ÁN (ANSWER SHEET)
                </h3>
                <p className="text-center text-xs text-gray-600 mb-5 italic">
                    {includeAnswers 
                        ? '(Phiếu tô đáp án đã được tự động khoanh/tô đen phương án đúng)'
                        : '(Thí sinh chọn phương án đúng nhất bằng cách đánh dấu nhân [X] hoặc tô đen ô tròn phương án lựa chọn)'}
                </p>
                <table className="print-table w-full border border-collapse border-black">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="w-12 border border-black p-1 text-xs">Câu</th>
                            <th className="border border-black p-1 text-xs">Phương án</th>
                            <th className="w-12 border border-black p-1 text-xs">Câu</th>
                            <th className="border border-black p-1 text-xs">Phương án</th>
                            <th className="w-12 border border-black p-1 text-xs">Câu</th>
                            <th className="border border-black p-1 text-xs">Phương án</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => (
                            <tr key={idx}>
                                {row.map((qNum, colIdx) => {
                                    if (qNum > total) {
                                        return (
                                            <Fragment key={colIdx}>
                                                <td className="bg-gray-50/50 text-gray-400 font-bold border border-black p-1 text-xs">—</td>
                                                <td className="bg-gray-50/50 border border-black p-1 text-xs"></td>
                                            </Fragment>
                                        );
                                    }
                                    const qObj = answerableQuestions[qNum - 1];
                                    const correctIdx = qObj?.correctAnswer !== undefined && qObj?.correctAnswer !== null ? Number(qObj.correctAnswer) : null;

                                    return (
                                        <Fragment key={colIdx}>
                                            <td className="font-bold border border-black p-1 text-xs">{qNum}</td>
                                            <td className="border border-black p-1 text-xs">
                                                <div className="flex justify-center gap-3 text-xs font-semibold">
                                                    {[0, 1, 2, 3].map((optIdx) => {
                                                        const isCorrect = includeAnswers && correctIdx === optIdx;
                                                        return (
                                                            <span 
                                                                key={optIdx} 
                                                                className={isCorrect ? "font-extrabold text-black border border-black rounded-full px-1 bg-gray-200" : ""}
                                                            >
                                                                {isCorrect ? filledBubbles[optIdx] || `(${optIdx + 1})` : `( ${optIdx + 1} )`}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                        </Fragment>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AnswerSheet;
