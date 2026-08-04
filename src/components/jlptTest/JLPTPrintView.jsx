import React from 'react';
import AnswerSheet from './AnswerSheet';

const JLPTPrintView = ({ test, includeAnswers, includeAnswerSheet }) => {
    console.log("JLPTPrintView: Rendering test", test?.id, "sections count:", test?.sections?.length);
    if (!test) return null;

    // Standardize sections list
    const sectionsList = (test.sections && Array.isArray(test.sections) && test.sections.length > 0)
        ? test.sections
        : (test.questions && Array.isArray(test.questions) && test.questions.length > 0)
            ? [{ title: 'Tổng hợp câu hỏi', type: 'general', questions: test.questions }]
            : [];

    const answerableQuestions = [];
    try {
        sectionsList.forEach((sec) => {
            const qs = sec?.questions || sec?.items || [];
            qs.forEach((q) => {
                const subQs = q?.subQuestions || q?.questions || q?.items;
                if (subQs && Array.isArray(subQs) && subQs.length > 0) {
                    subQs.forEach((sq) => {
                        answerableQuestions.push({
                            ...sq,
                            question: sq?.question || sq?.text || sq?.title || sq?.content || '',
                            options: sq?.options || sq?.answers || sq?.choices || [],
                            correctAnswer: sq?.correctAnswer !== undefined ? sq.correctAnswer : sq?.correct !== undefined ? sq.correct : sq?.answerIndex,
                            sectionTitle: sec?.title || '',
                            sectionType: sec?.type || '',
                            parentQuestion: q?.question || q?.text || q?.title || '',
                            passage: q?.passage || q?.readingPassage || q?.article || '',
                            imageUrl: q?.imageUrl || q?.image || ''
                        });
                    });
                } else {
                    answerableQuestions.push({
                        ...q,
                        question: q?.question || q?.text || q?.title || q?.content || '',
                        options: q?.options || q?.answers || q?.choices || [],
                        correctAnswer: q?.correctAnswer !== undefined ? q.correctAnswer : q?.correct !== undefined ? q.correct : q?.answerIndex,
                        sectionTitle: sec?.title || '',
                        sectionType: sec?.type || ''
                    });
                }
            });
        });
    } catch (err) {
        console.error("JLPTPrintView error building questions list:", err);
    }

    const getOptionsGridClass = (options) => {
        if (!options || !Array.isArray(options) || options.length === 0) return 'hidden';
        try {
            const maxOptLen = Math.max(...options.map(opt => {
                if (!opt) return 0;
                return String(opt).replace(/<[^>]*>/g, '').length;
            }));
            const totalLength = options.reduce((sum, opt) => {
                if (!opt) return sum;
                return sum + String(opt).replace(/<[^>]*>/g, '').length;
            }, 0);

            if (maxOptLen > 25 || totalLength >= 75) return 'print-options-1col';
            if (maxOptLen > 11 || totalLength >= 38) return 'print-options-2col';
            return 'print-options-4col';
        } catch (err) {
            console.error("JLPTPrintView error calc options grid class:", err);
            return 'print-options-1col';
        }
    };

    const getCleanContent = (text) => {
        if (!text || typeof text !== 'string') return '';
        try {
            if (!/<\/?[a-z][\s\S]*>/i.test(text)) {
                return text.replace(/\n/g, '<br/>');
            }
            return text;
        } catch (err) {
            return String(text);
        }
    };

    const totalQCount = answerableQuestions.length;
    let questionGlobalCounter = 0;

    return (
        <div className="print-container print-preview-force-light bg-white text-black p-8 font-serif leading-relaxed">
            <div className="print-header">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">QUIZKI - HỆ THỐNG LUYỆN THI TIẾNG NHẬT</h1>
                        <h2 className="text-lg font-extrabold mt-1">ĐỀ THI THỬ JLPT {test.level || 'JLPT'} - CHÍNH THỨC</h2>
                        <p className="text-xs mt-1 text-gray-700">Mã đề: {test.id} | Đề thi: {test.title}</p>
                    </div>
                    <div className="text-right border border-black p-2 rounded text-xs min-w-[150px]">
                        <span className="font-bold uppercase tracking-wider block border-b border-black pb-1 mb-1">Thời gian làm bài</span>
                        <span className="text-base font-black">{test.timeLimit || 60} phút</span>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-6 text-sm border-t border-dashed border-black pt-4">
                    <div>
                        <b>Họ và tên học sinh:</b> ............................................................................
                    </div>
                    <div>
                        <b>Số báo danh:</b> ..............................................................
                    </div>
                    <div>
                        <b>Ngày thi làm bài:</b> ...../...../20...
                    </div>
                    <div>
                        <b>Điểm số đạt được:</b> ............. / 180 (Điểm)
                    </div>
                </div>
            </div>

            <div className="text-xs border border-black p-3 bg-gray-50/50 rounded mb-6">
                <b>HƯỚNG DẪN LÀM BÀI:</b>
                <ul className="list-disc pl-4 mt-1 space-y-1">
                    <li>Đề thi gồm có {sectionsList.length} phần kiểm tra đầy đủ các kỹ năng với tổng số {totalQCount} câu hỏi.</li>
                    <li>Thí sinh đọc kỹ câu hỏi và khoanh tròn hoặc ghi nhận kết quả vào <b>Phiếu Trả Lời</b> ở trang cuối.</li>
                    <li>Đối với phần Nghe hiểu (Listening), vui lòng quét mã QR hoặc truy cập ứng dụng Quizki để nghe file âm thanh.</li>
                </ul>
            </div>

            {sectionsList.map((sec, si) => {
                const questionsList = sec?.questions || sec?.items || [];
                return (
                    <div key={si} className="mb-8">
                        <h3 className="print-section-header uppercase">
                            PHẦN {si + 1}: {sec.title || 'Phần thi'} ({sec.type === 'listening' ? 'Nghe hiểu' : sec.type === 'reading' ? 'Đọc hiểu' : sec.type === 'vocabulary' ? 'Từ vựng' : sec.type === 'grammar' ? 'Ngữ pháp' : 'Kiểm tra kiến thức'})
                        </h3>

                        {sec.type === 'listening' && (
                            <div className="my-4 p-3 border border-black bg-gray-50 text-xs rounded">
                                <b>🔊 LƯU Ý PHẦN THI NGHE HIỂU:</b>
                                <p className="mt-1">Thí sinh cần bật file âm thanh của đề thi này trên ứng dụng Quizki để hoàn thành các câu hỏi nghe hiểu bên dưới.</p>
                            </div>
                        )}

                        {questionsList.map((q, qi) => {
                            const qText = q?.question || q?.text || q?.title || q?.content || '';
                            const qPassage = q?.passage || q?.readingPassage || q?.article || '';
                            const qImage = q?.imageUrl || q?.image || '';
                            const qOptions = q?.options || q?.answers || q?.choices || [];
                            const subQs = q?.subQuestions || q?.questions || q?.items;
                            const hasSub = subQs && Array.isArray(subQs) && subQs.length > 0;
                            const qCorrect = q?.correctAnswer !== undefined ? q.correctAnswer : q?.correct !== undefined ? q.correct : q?.answerIndex;
                            const isReading = Boolean(qPassage);
                            
                            return (
                                <div key={qi} className={isReading ? "print-reading-group print-no-break mb-6" : "print-question-item print-no-break mb-4"}>
                                    {qPassage && (
                                        <div className="print-passage-box">
                                            <div dangerouslySetInnerHTML={{ __html: qPassage }} />
                                        </div>
                                    )}

                                    {qText && (
                                        <div className="mb-2">
                                            {hasSub ? (
                                                <span dangerouslySetInnerHTML={{ __html: getCleanContent(qText) }} />
                                            ) : (
                                                <>
                                                    {(() => {
                                                        questionGlobalCounter++;
                                                        return (
                                                            <>
                                                                <span className="font-bold">Câu {questionGlobalCounter}. </span>
                                                                <span dangerouslySetInnerHTML={{ __html: getCleanContent(qText) }} />
                                                            </>
                                                        );
                                                    })()}
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {qImage && (
                                        <div className="my-2.5 max-w-md">
                                            <img src={qImage} alt="Exam Illustration" className="max-h-56 object-contain border border-black/30 rounded p-0.5" />
                                        </div>
                                    )}

                                    {!hasSub && qOptions && qOptions.length > 0 && (
                                        <div className={getOptionsGridClass(qOptions)}>
                                            {qOptions.map((opt, oi) => (
                                                <div key={oi} className="print-option">
                                                    <span className="font-bold mr-1">({oi + 1})</span>
                                                    <span dangerouslySetInnerHTML={{ __html: opt }} />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {hasSub && (
                                        <div className="space-y-4 pl-4 border-l border-black/40 mt-3">
                                            {subQs.map((sq, sqi) => {
                                                questionGlobalCounter++;
                                                const sqText = sq?.question || sq?.text || sq?.title || sq?.content || '';
                                                const sqOptions = sq?.options || sq?.answers || sq?.choices || [];
                                                return (
                                                    <div key={sqi} className="print-question-item print-no-break">
                                                        <div className="mb-1">
                                                            <span className="font-bold">Câu {questionGlobalCounter}. </span>
                                                            <span dangerouslySetInnerHTML={{ __html: getCleanContent(sqText) }} />
                                                        </div>
                                                        {sqOptions && sqOptions.length > 0 && (
                                                            <div className={getOptionsGridClass(sqOptions)}>
                                                                {sqOptions.map((opt, oi) => (
                                                                    <div key={oi} className="print-option">
                                                                        <span className="font-bold mr-1">({oi + 1})</span>
                                                                        <span dangerouslySetInnerHTML={{ __html: opt }} />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                );
            })}

            {includeAnswerSheet && (
                <AnswerSheet 
                    totalQuestions={totalQCount} 
                    answerableQuestions={answerableQuestions}
                    includeAnswers={includeAnswers}
                />
            )}

            {includeAnswers && (
                <div className="print-page-break mt-10">
                    <h3 className="text-center font-bold text-lg border-b-2 border-black pb-2 mb-6">
                        ĐÁP ÁN & HƯỚNG DẪN GIẢI CHI TIẾT
                    </h3>
                    <table className="w-full border border-collapse border-black mb-8">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-black p-2 text-xs w-16">Câu hỏi</th>
                                <th className="border border-black p-2 text-xs w-24">Đáp án đúng</th>
                                <th className="border border-black p-2 text-xs">Nội dung câu hỏi / Giải thích ngắn gọn</th>
                            </tr>
                        </thead>
                        <tbody>
                            {answerableQuestions.map((q, idx) => (
                                <tr key={idx} className="print-no-break">
                                    <td className="border border-black p-2 text-xs font-bold">Câu {idx + 1}</td>
                                    <td className="border border-black p-2 text-xs font-extrabold text-emerald-800">
                                        Phương án ({(typeof q?.correctAnswer === 'number' ? q.correctAnswer : 0) + 1})
                                    </td>
                                    <td className="border border-black p-2 text-left text-xs">
                                        {q?.parentQuestion && (
                                            <div className="text-gray-500 mb-0.5">
                                                <i>Bối cảnh:</i> <span dangerouslySetInnerHTML={{ __html: getCleanContent(q.parentQuestion) }} />
                                            </div>
                                        )}
                                        <div className="font-japanese font-semibold">
                                            <span dangerouslySetInnerHTML={{ __html: getCleanContent(q?.question) }} />
                                        </div>
                                        {q?.explanation && typeof q.explanation === 'string' && (
                                            <div className="text-slate-650 mt-1 italic">
                                                💡 {q.explanation.replace(/<\/?[a-z][\s\S]*>/i, '')}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default JLPTPrintView;
