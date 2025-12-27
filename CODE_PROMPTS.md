# Code Prompts - Flashcard, Study Mode, Multiple Choice

## 1. FLASHCARD MODE

### Logic chính:
- **State quản lý**: `isFlipped` (lật thẻ), `slideDirection` (animation)
- **Keyboard shortcuts**: Space (lật), Arrow Left/Right (chuyển thẻ)
- **Phát âm**: Tự động phát khi lật sang mặt sau

### Code Flashcard UI (dòng 4186-4275):
```jsx
{reviewMode === 'flashcard' ? (
    <div className="perspective-1000 w-full max-w-[240px] md:max-w-[280px] mx-auto relative" style={{ minHeight: '340px' }}>
        <div 
            className={`flip-card-container transform-style-3d cursor-pointer relative card-slide ${isFlipped ? 'rotate-y-180' : ''} ${slideDirection === 'left' ? 'slide-out-left' : slideDirection === 'right' ? 'slide-out-right' : ''}`}
            onClick={() => {
                const newFlippedState = !isFlipped;
                setIsFlipped(newFlippedState);
                // Phát âm thanh khi lật card (khi lật sang mặt sau)
                if (newFlippedState && currentCard.audioBase64) {
                    playAudio(currentCard.audioBase64, currentCard.front);
                }
            }}
        >
            {/* Mặt trước - Từ vựng */}
            <div className="flip-card-front backface-hidden absolute inset-0 w-full h-full">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-2xl p-6 flex flex-col items-center justify-center w-full h-full border-4 border-white">
                    <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight break-words">
                        {currentCard.front}
                    </h3>
                    {/* Level, POS tags */}
                </div>
            </div>
            
            {/* Mặt sau - Ý nghĩa */}
            <div className="flip-card-back backface-hidden absolute inset-0 w-full h-full rotate-y-180">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-2xl p-6 w-full h-full border-4 border-white flex flex-col">
                    <h3 className="text-3xl md:text-4xl font-extrabold text-white leading-tight break-words px-2">
                        {currentCard.back}
                    </h3>
                    {/* Synonym, Example, SinoVietnamese */}
                </div>
            </div>
        </div>
    </div>
) : (
    // Chế độ ôn tập thông thường
)}
```

### Keyboard handlers (dòng 3759-3802):
```jsx
useEffect(() => {
    if (reviewMode !== 'flashcard') return;

    const handleKeyDown = (e) => {
        // Space: Flip card
        if (e.key === ' ' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            setIsFlipped(prev => {
                const newFlippedState = !prev;
                if (newFlippedState && currentCard && currentCard.audioBase64) {
                    playAudio(currentCard.audioBase64, currentCard.front);
                }
                return newFlippedState;
            });
        }
        // Arrow Left: Previous card
        else if (e.key === 'ArrowLeft' && currentIndex > 0) {
            moveToPreviousCard();
        }
        // Arrow Right: Next card
        else if (e.key === 'ArrowRight') {
            if (currentIndex < cards.length - 1) {
                // Slide animation
            } else {
                handleCompleteReview();
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
}, [currentIndex, cards, reviewMode, handleCompleteReview, moveToPreviousCard]);
```

---

## 2. STUDY MODE (Chế độ Học)

### Logic chính:
- **2 Phase**: Multiple Choice → Typing
- **Batch system**: Học 5 từ/batch, ưu tiên: Learning > New > Reviewing
- **Tracking**: `completedCards` (Set) để theo dõi từ đã hoàn thành

### Code StudyScreen (dòng 4571-4807):
```jsx
const StudyScreen = ({ studySessionData, setStudySessionData, allCards, onUpdateCard, onCompleteStudy }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [inputValue, setInputValue] = useState('');
    const [isRevealed, setIsRevealed] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [multipleChoiceResults, setMultipleChoiceResults] = useState({});
    const [completedCards, setCompletedCards] = useState(new Set());
    
    const currentBatch = studySessionData.currentBatch || [];
    const currentPhase = studySessionData.currentPhase || 'multipleChoice';
    const currentCard = currentBatch[currentQuestionIndex];
```

### Generate Multiple Choice Options (dòng 4607-4672):
```jsx
const generateMultipleChoiceOptions = useMemo(() => {
    if (!currentCard || currentPhase !== 'multipleChoice') return [];
    
    const correctAnswer = currentCard.front;
    const currentPos = currentCard.pos;
    
    // Lấy tất cả từ hợp lệ
    const allValidCards = allCards
        .filter(card => 
            card.id !== currentCard.id && 
            card.front && 
            card.front.trim() !== '' &&
            normalizeAnswer(card.front) !== normalizeAnswer(correctAnswer)
        );
    
    // Ưu tiên 1: Từ cùng loại (POS)
    const samePosCards = currentPos 
        ? allValidCards.filter(card => card.pos === currentPos)
        : [];
    
    // Ưu tiên 2: Từ có độ dài tương tự
    const correctLength = correctAnswer.length;
    const similarLengthCards = allValidCards.filter(card => 
        Math.abs(card.front.length - correctLength) <= 2
    );
    
    // Kết hợp candidates
    let candidates = [];
    
    // Lấy từ cùng POS trước
    if (samePosCards.length > 0) {
        candidates.push(...samePosCards.slice(0, 3));
    }
    
    // Nếu chưa đủ, lấy từ độ dài tương tự
    if (candidates.length < 3) {
        const remaining = similarLengthCards.filter(card => 
            !candidates.find(c => c.id === card.id)
        );
        candidates.push(...remaining.slice(0, 3 - candidates.length));
    }
    
    // Nếu vẫn chưa đủ, lấy ngẫu nhiên
    if (candidates.length < 3) {
        const remaining = allValidCards.filter(card => 
            !candidates.find(c => c.id === card.id)
        );
        candidates.push(...remaining.slice(0, 3 - candidates.length));
    }
    
    // Trộn và lấy 3 từ
    const shuffledCandidates = shuffleArray(candidates);
    const wrongOptions = shuffledCandidates
        .slice(0, 3)
        .map(card => card.front)
        .filter((front, index, self) => self.findIndex(f => normalizeAnswer(f) === normalizeAnswer(front)) === index);
    
    // Nếu không đủ 3, thêm placeholder
    while (wrongOptions.length < 3) {
        wrongOptions.push('...');
    }
    
    const options = [correctAnswer, ...wrongOptions];
    return shuffleArray([...options]);
}, [currentCard, currentPhase, allCards]);
```

### Handle Multiple Choice Answer (dòng 4674-4706):
```jsx
const handleMultipleChoiceAnswer = (selectedOption) => {
    if (isProcessing || isRevealed) return;
    
    setIsProcessing(true);
    setSelectedAnswer(selectedOption);
    const isCorrect = normalizeAnswer(selectedOption) === normalizeAnswer(currentCard.front);
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    setIsRevealed(true);
    setMultipleChoiceResults(prev => ({ ...prev, [currentCard.id]: isCorrect }));
    
    playAudio(currentCard.audioBase64, currentCard.front);
    
    setTimeout(() => {
        setIsProcessing(false);
        if (currentQuestionIndex < currentBatch.length - 1) {
            // Chuyển sang câu hỏi tiếp theo
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setSelectedAnswer(null);
            setIsRevealed(false);
            setFeedback(null);
        } else {
            // Chuyển sang phase typing cho cùng batch
            setStudySessionData(prev => ({
                ...prev,
                currentPhase: 'typing'
            }));
            setCurrentQuestionIndex(0);
            setSelectedAnswer(null);
            setIsRevealed(false);
            setFeedback(null);
        }
    }, 1500);
};
```

### Handle Typing Answer (dòng 4708-4755):
```jsx
const handleTypingAnswer = async () => {
    if (isProcessing || !inputValue.trim()) return;

    const userAnswer = normalizeAnswer(inputValue);
    const correctAnswer = normalizeAnswer(currentCard.front);
    const isCorrect = userAnswer === correctAnswer;

    setIsProcessing(true);
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    setIsRevealed(true);
    playAudio(currentCard.audioBase64, currentCard.front);

    // Update card SRS
    await onUpdateCard(currentCard.id, isCorrect, 'back');

    // Cập nhật learning/reviewing lists
    if (isCorrect) {
        setStudySessionData(prev => ({
            ...prev,
            learning: prev.learning.filter(c => c.id !== currentCard.id),
            reviewing: [...prev.reviewing.filter(c => c.id !== currentCard.id), currentCard]
        }));
    } else {
        setStudySessionData(prev => ({
            ...prev,
            learning: [...prev.learning.filter(c => c.id !== currentCard.id), currentCard]
        }));
    }

    setTimeout(() => {
        setIsProcessing(false);
        setCompletedCards(prev => new Set([...prev, currentCard.id]));
        
        if (currentQuestionIndex < currentBatch.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setInputValue('');
            setIsRevealed(false);
            setFeedback(null);
        } else {
            // Hoàn thành batch typing, tạo batch tiếp theo
            createNextBatch();
        }
    }, 1500);
};
```

---

## 3. MULTIPLE CHOICE - ĐỒNG NGHĨA (Synonym)

### Logic chính:
- **Prompt**: Hiển thị từ đồng nghĩa, yêu cầu chọn từ vựng gốc
- **Options**: Tạo 4 lựa chọn (1 đúng + 3 sai), ưu tiên cùng POS và độ dài tương tự

### Code Generate Options (dòng 3809-3875):
```jsx
const generateMultipleChoiceOptions = useMemo(() => {
    if (!currentCard || !isMultipleChoice) return [];
    
    const correctAnswer = currentCard.front; // Từ vựng gốc
    const currentPos = currentCard.pos;
    
    // Lấy tất cả từ hợp lệ (không trùng với đáp án đúng)
    const allValidCards = (allCards || cards)
        .filter(card => 
            card.id !== currentCard.id && 
            card.front && 
            card.front.trim() !== '' &&
            normalizeAnswer(card.front) !== normalizeAnswer(correctAnswer)
        );
    
    // Ưu tiên 1: Từ cùng loại (POS)
    const samePosCards = currentPos 
        ? allValidCards.filter(card => card.pos === currentPos)
        : [];
    
    // Ưu tiên 2: Từ có độ dài tương tự (±2 ký tự)
    const correctLength = correctAnswer.length;
    const similarLengthCards = allValidCards.filter(card => 
        Math.abs(card.front.length - correctLength) <= 2
    );
    
    // Kết hợp: Ưu tiên cùng POS, sau đó độ dài tương tự
    let candidates = [];
    
    // Lấy từ cùng POS trước
    if (samePosCards.length > 0) {
        candidates.push(...samePosCards.slice(0, 3));
    }
    
    // Nếu chưa đủ, lấy từ độ dài tương tự
    if (candidates.length < 3) {
        const remaining = similarLengthCards.filter(card => 
            !candidates.find(c => c.id === card.id)
        );
        candidates.push(...remaining.slice(0, 3 - candidates.length));
    }
    
    // Nếu vẫn chưa đủ, lấy ngẫu nhiên từ còn lại
    if (candidates.length < 3) {
        const remaining = allValidCards.filter(card => 
            !candidates.find(c => c.id === card.id)
        );
        candidates.push(...remaining.slice(0, 3 - candidates.length));
    }
    
    // Trộn candidates và lấy 3 từ
    const shuffledCandidates = shuffleArray(candidates);
    const wrongOptions = shuffledCandidates
        .slice(0, 3)
        .map(card => card.front)
        .filter((front, index, self) => self.findIndex(f => normalizeAnswer(f) === normalizeAnswer(front)) === index);
    
    // Nếu không đủ 3, thêm placeholder
    while (wrongOptions.length < 3) {
        wrongOptions.push('...');
    }
    
    // Trộn ngẫu nhiên tất cả options
    const options = [correctAnswer, ...wrongOptions];
    return shuffleArray(options);
}, [currentCard, isMultipleChoice, allCards, cards, normalizeAnswer]);
```

### UI Multiple Choice (dòng 4319-4429):
```jsx
{isMultipleChoice && !isRevealed && multipleChoiceOptions.length > 0 && (
    <div className="space-y-3 md:space-y-4">
        <p className="text-sm md:text-base font-semibold text-gray-700 text-center">
            {cardReviewType === 'synonym' 
                ? `Từ đồng nghĩa của "${promptInfo.text}" là gì?`
                : `Điền từ còn thiếu trong câu: "${promptInfo.text}"`
            }
        </p>
        <div className="grid grid-cols-2 gap-2 md:gap-3">
            {multipleChoiceOptions.map((option, index) => {
                const isSelected = selectedAnswer === option;
                const isCorrect = option === currentCard.front;
                let buttonClass = "px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base font-bold rounded-lg md:rounded-xl transition-all border-2 ";
                
                if (isRevealed) {
                    if (isCorrect) {
                        buttonClass += "bg-green-500 text-white border-green-600 shadow-lg";
                    } else if (isSelected && !isCorrect) {
                        buttonClass += "bg-red-500 text-white border-red-600 shadow-lg";
                    } else {
                        buttonClass += "bg-gray-100 text-gray-400 border-gray-200";
                    }
                } else {
                    if (isSelected) {
                        buttonClass += "bg-indigo-500 text-white border-indigo-600 shadow-md hover:bg-indigo-600";
                    } else {
                        buttonClass += "bg-white text-gray-700 border-gray-300 hover:bg-indigo-50 hover:border-indigo-300";
                    }
                }
                
                return (
                    <button
                        key={index}
                        onClick={() => {
                            if (!isRevealed && !isProcessing) {
                                setSelectedAnswer(option);
                            }
                        }}
                        disabled={isRevealed || isProcessing}
                        className={buttonClass}
                    >
                        {option}
                    </button>
                );
            })}
        </div>
        {selectedAnswer && !isRevealed && (
            <button
                onClick={async () => {
                    // Xử lý kiểm tra đáp án
                    const isCorrect = selectedAnswer === currentCard.front;
                    // ... logic xử lý
                    playAudio(currentCard.audioBase64, currentCard.front);
                    await moveToNextCard(shouldUpdateStreak);
                }}
                className="w-full py-3 md:py-4 bg-indigo-600 text-white rounded-lg md:rounded-xl font-bold text-base md:text-lg shadow-lg hover:bg-indigo-700 transition-all"
            >
                Xác nhận
            </button>
        )}
    </div>
)}
```

### Get Prompt cho Synonym (dòng 3902-3916):
```jsx
const getPrompt = () => {
    switch (cardReviewType) { 
        case 'synonym': 
            return { 
                label: 'Từ đồng nghĩa', 
                text: currentCard.synonym, // Hiển thị từ đồng nghĩa
                image: currentCard.imageBase64, 
                icon: MessageSquare, 
                color: 'text-blue-600' 
            };
        case 'example': {
            const wordToMask = getWordForMasking(currentCard.front);
            const escapedWord = wordToMask.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&');
            const maskRegex = new RegExp(`(${escapedWord}|（${escapedWord}）|\\(${escapedWord}\\))`, 'g');
            return { 
                label: 'Điền từ còn thiếu', 
                text: currentCard.example.replace(maskRegex, '______'), 
                meaning: currentCard.exampleMeaning || null, 
                image: currentCard.imageBase64, 
                icon: FileText, 
                color: 'text-purple-600' 
            };
        }
        default: 
            return { 
                label: 'Ý nghĩa (Mặt sau)', 
                text: currentCard.back, 
                image: currentCard.imageBase64, 
                icon: Repeat2, 
                color: 'text-emerald-600' 
            };
    }
};
```

---

## 4. MULTIPLE CHOICE - NGỮ CẢNH (Example)

### Logic chính:
- **Prompt**: Hiển thị câu ví dụ với từ bị che (______), yêu cầu điền từ đúng
- **Options**: Tạo 4 lựa chọn (1 đúng + 3 sai), ưu tiên cùng POS và độ dài tương tự

### Code Mask Word trong Example (dòng 3906-3912):
```jsx
case 'example': {
    const wordToMask = getWordForMasking(currentCard.front);
    const escapedWord = wordToMask.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&');
    // Tạo regex match cả: từ, （từ）, (từ)
    const maskRegex = new RegExp(`(${escapedWord}|（${escapedWord}）|\\(${escapedWord}\\))`, 'g');
    return { 
        label: 'Điền từ còn thiếu', 
        text: currentCard.example.replace(maskRegex, '______'), 
        meaning: currentCard.exampleMeaning || null, 
        image: currentCard.imageBase64, 
        icon: FileText, 
        color: 'text-purple-600' 
    };
}
```

### Helper function getWordForMasking:
```jsx
const getWordForMasking = (front) => {
    // Lấy phần Kanji (trước ngoặc)
    return front.split('（')[0].split('(')[0].trim();
};
```

### Xử lý đáp án khi chọn (dòng 4368-4421):
```jsx
onClick={async () => {
    if (isProcessing) return;
    const isCorrect = selectedAnswer === currentCard.front;
    const cardKey = `${currentCard.id}-${cardReviewType}`;
    const hasFailedBefore = failedCards.has(cardKey);
    
    setIsProcessing(true);
    
    if (isCorrect) {
        if (hasFailedBefore) {
            setFeedback('correct');
            setMessage(`Đúng rồi! Nhưng bạn sẽ phải ôn lại từ này sau.`);
        } else {
            setFeedback('correct');
            setMessage(`Chính xác! ${displayFront}`);
        }
    } else {
        // Sai: lưu vào danh sách các từ đã sai và reset streak
        setFailedCards(prev => new Set([...prev, cardKey]));
        setFeedback('incorrect');
        setMessage(`Đáp án đúng: ${displayFront}`);
        
        // Cập nhật streak về 0
        await onUpdateCard(currentCard.id, false, cardReviewType);
    }
    
    setIsRevealed(true);
    playAudio(currentCard.audioBase64, currentCard.front);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const shouldUpdateStreak = isCorrect && !hasFailedBefore;
    await moveToNextCard(shouldUpdateStreak);
}}
```

---

## TÓM TẮT CÁC ĐIỂM QUAN TRỌNG:

### 1. Flashcard:
- Lật thẻ 3D với CSS transform
- Phát âm tự động khi lật sang mặt sau
- Keyboard shortcuts: Space, Arrow keys

### 2. Study Mode:
- 2 phase: Multiple Choice → Typing
- Batch system: 5 từ/batch
- Tracking completed cards để tạo batch tiếp theo

### 3. Multiple Choice (Synonym & Example):
- Tạo options thông minh: ưu tiên cùng POS, độ dài tương tự
- Shuffle để tránh pattern
- Phát âm sau khi chọn đáp án
- Track failed cards để ôn lại

### 4. Normalize Answer:
```jsx
const normalizeAnswer = (text) => 
    text.replace(/（[^）]*）/g, '')
        .replace(/\([^)]*\)/g, '')
        .replace(/\s+/g, '')
        .toLowerCase();
```

### 5. Phát âm (playAudio):
- Tự động phát khi:
  - Lật flashcard sang mặt sau
  - Chọn đáp án đúng/sai trong multiple choice
  - Nhập đúng trong typing mode
  - Nhập sai và nhập lại đúng

