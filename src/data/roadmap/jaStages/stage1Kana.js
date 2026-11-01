/**
 * Stage 1: Bảng Chữ Cái Kana & Phát Âm Chuẩn
 */
export const STAGE_1_KANA = {
    stage: 1,
    id: 'ja_stage_1',
    title: 'Chặng 1: Bảng Chữ Cái Kana & Phát Âm Chuẩn',
    sub: '46 âm Hiragana, Katakana, biến âm, trường âm & các từ chào hỏi sơ cấp.',
    icon: '🌸',
    color: 'rose',
    lessons: [
        {
            id: 'ja_s1_l1',
            title: 'Nguyên âm căn bản: A - I - U - E - O',
            shortTitle: 'あ い う え お',
            desc: 'Nhận biết 5 nguyên âm nền tảng của tiếng Nhật cùng phát âm chuẩn bản xứ.',
            icon: 'あ',
            xp: 20,
            items: {
                vocab: [
                    { word: 'いいえ', reading: 'いいえ', meaning: 'Không (ngược lại với はい)' },
                    { word: 'うえ', reading: 'うえ', meaning: 'Phía trên, bên trên' },
                    { word: 'あい', reading: 'あい', meaning: 'Tình yêu' },
                    { word: 'あお', reading: 'あお', meaning: 'Màu xanh da trời' }
                ],
                kanji: [],
                grammar: []
            },
            questions: [
                {
                    type: 'choice',
                    prompt: 'Ký tự sau đây đọc là gì?',
                    character: 'あ',
                    reading: 'a',
                    audio: 'あ',
                    options: ['a', 'i', 'u', 'o'],
                    correctIndex: 0,
                    explanation: 'あ là nguyên âm "a" trong tiếng Nhật, bắt đầu bảng chữ cái Hiragana.'
                },
                {
                    type: 'choice',
                    prompt: 'Chọn ký tự tương ứng với phát âm "i":',
                    reading: 'i',
                    audio: 'い',
                    options: ['え', 'い', 'う', 'お'],
                    correctIndex: 1,
                    explanation: 'い phát âm là "i", gồm 2 nét cong song song.'
                },
                {
                    type: 'audio_choice',
                    prompt: 'Nghe phát âm và chọn ký tự đúng:',
                    audio: 'う',
                    options: ['あ', 'う', 'お', 'え'],
                    correctIndex: 1,
                    explanation: 'Âm "u" trong tiếng Nhật phát âm tròn môi nhẹ nhàng: う.'
                },
                {
                    type: 'matching',
                    prompt: 'Nối các ký tự Hiragana với phiên âm tương ứng:',
                    pairs: [
                        { left: 'あ', right: 'a' },
                        { left: 'い', right: 'i' },
                        { left: 'え', right: 'e' },
                        { left: 'お', right: 'o' }
                    ]
                },
                {
                    type: 'choice',
                    prompt: 'Từ "いいえ" có nghĩa là gì?',
                    character: 'いいえ',
                    reading: 'iie',
                    audio: 'いいえ',
                    options: ['Không', 'Vâng / Đúng', 'Xin chào', 'Cảm ơn'],
                    correctIndex: 0,
                    explanation: 'いいえ (iie) nghĩa là "Không" (ngược lại với はい - Vâng).'
                },
                {
                    type: 'choice',
                    prompt: 'Từ "うえ" (ue) có nghĩa là gì?',
                    character: 'うえ',
                    reading: 'ue',
                    audio: 'うえ',
                    options: ['Bên trên', 'Bên dưới', 'Ở trong', 'Phía trước'],
                    correctIndex: 0,
                    explanation: 'うえ (ue) là danh từ chỉ phương hướng: "Phía trên / Bên trên".'
                }
            ]
        },
        {
            id: 'ja_s1_l2',
            title: 'Hàng KA & Hàng SA',
            shortTitle: 'か・さ 行',
            desc: 'Khám phá các phụ âm ghép k- và s- kết hợp nguyên âm: か, き, く, け, こ / さ, し, す, せ, そ.',
            icon: 'か',
            xp: 25,
            items: {
                vocab: [
                    { word: 'かさ', reading: 'かさ', meaning: 'Cái ô (dù)' },
                    { word: 'すし', reading: 'すし', meaning: 'Món Sushi Nhật Bản' },
                    { word: 'あさ', reading: 'あさ', meaning: 'Buổi sáng' },
                    { word: 'せかい', reading: 'せかい', meaning: 'Thế giới' }
                ],
                kanji: [],
                grammar: []
            },
            questions: [
                {
                    type: 'choice',
                    prompt: 'Ký tự "か" được phát âm là gì?',
                    character: 'か',
                    reading: 'ka',
                    audio: 'か',
                    options: ['ka', 'sa', 'ta', 'na'],
                    correctIndex: 0,
                    explanation: 'か gồm nét ngang gập móc, nét sổ và dấu phẩy, đọc là "ka".'
                },
                {
                    type: 'choice',
                    prompt: 'Ký tự nào sau đây là "shi"?',
                    reading: 'shi',
                    audio: 'し',
                    options: ['さ', 'し', 'す', 'そ'],
                    correctIndex: 1,
                    explanation: 'し vẽ như chiếc lưỡi câu, phát âm là "shi".'
                },
                {
                    type: 'audio_choice',
                    prompt: 'Nghe từ vựng sau và chọn nghĩa đúng:',
                    character: 'かさ',
                    reading: 'kasa',
                    audio: 'かさ',
                    options: ['Cái ô (dù)', 'Con cá', 'Mặt trời', 'Quả táo'],
                    correctIndex: 0,
                    explanation: 'かさ (kasa) ghép từ か và さ, có nghĩa là "Cái ô / dù".'
                },
                {
                    type: 'matching',
                    prompt: 'Ghép từ vựng Hiragana với nghĩa tiếng Việt:',
                    pairs: [
                        { left: 'かさ', right: 'Cái ô' },
                        { left: 'すし', right: 'Sushi' },
                        { left: 'あさ', right: 'Buổi sáng' },
                        { left: 'せかい', right: 'Thế giới' }
                    ]
                },
                {
                    type: 'choice',
                    prompt: '"あさ" (asa) trong tiếng Nhật nghĩa là gì?',
                    character: 'あさ',
                    reading: 'asa',
                    audio: 'あさ',
                    options: ['Buổi sáng', 'Buổi trưa', 'Buổi tối', 'Ngày mai'],
                    correctIndex: 0,
                    explanation: 'あさ (asa) = Buổi sáng. Ví dụ: あさごはん (bữa sáng).'
                }
            ]
        },
        {
            id: 'ja_s1_l3',
            title: 'Hàng TA, NA & Câu Chào Hỏi Sơ Cấp',
            shortTitle: 'た・な & Chào hỏi',
            desc: 'Học た, ち, つ, て, と và な, に, ぬ, ね, の cùng các mẫu câu chào hỏi hàng ngày.',
            icon: '👋',
            xp: 25,
            items: {
                vocab: [
                    { word: 'こんにちは', reading: 'こんにちは', meaning: 'Xin chào (buổi trưa / ban ngày)' },
                    { word: 'ありがとう', reading: 'ありがとう', meaning: 'Cảm ơn' },
                    { word: 'すみません', reading: 'すみません', meaning: 'Xin lỗi / Làm phiền' },
                    { word: 'ねこ', reading: 'ねこ', meaning: 'Con mèo' },
                    { word: 'いぬ', reading: 'いぬ', meaning: 'Con chó' }
                ],
                kanji: [],
                grammar: []
            },
            questions: [
                {
                    type: 'choice',
                    prompt: 'Từ "こんにちは" dùng để chào khi nào?',
                    character: 'こんにちは',
                    reading: 'konnichiwa',
                    audio: 'こんにちは',
                    options: ['Chào buổi trưa / ban ngày', 'Chào buổi sáng sớm', 'Chúc ngủ ngon', 'Tạm biệt'],
                    correctIndex: 0,
                    explanation: 'こんにちは (konnichiwa) là lời chào phổ biến nhất ban ngày.'
                },
                {
                    type: 'audio_choice',
                    prompt: 'Nghe và chọn ký tự đúng:',
                    audio: 'ね',
                    options: ['ね', 'れ', 'わ', 'ぬ'],
                    correctIndex: 0,
                    explanation: 'ね (ne) có vòng xoắn nhỏ ở đuôi nét bên phải.'
                },
                {
                    type: 'choice',
                    prompt: '"ありがとう" có nghĩa là gì?',
                    character: 'ありがとう',
                    reading: 'arigatou',
                    audio: 'ありがとう',
                    options: ['Cảm ơn', 'Xin lỗi', 'Tạm biệt', 'Không có chi'],
                    correctIndex: 0,
                    explanation: 'ありがとう (arigatou) là lời cảm ơn thân thiện trong tiếng Nhật.'
                },
                {
                    type: 'matching',
                    prompt: 'Nối các từ vựng động vật dễ thương:',
                    pairs: [
                        { left: 'ねこ', right: 'Con mèo' },
                        { left: 'いぬ', right: 'Con chó' },
                        { left: 'とり', right: 'Con chim' },
                        { left: 'さかな', right: 'Con cá' }
                    ]
                },
                {
                    type: 'choice',
                    prompt: 'Từ "すみません" thường dùng trong tình huống nào?',
                    character: 'すみません',
                    reading: 'sumimasen',
                    audio: 'すみません',
                    options: ['Xin lỗi / Làm phiền', 'Chúc mừng sinh nhật', 'Hẹn gặp lại', 'Chúc ngon miệng'],
                    correctIndex: 0,
                    explanation: 'すみません (sumimasen) dùng để xin lỗi hoặc gọi nhân viên phục vụ.'
                }
            ]
        },
        {
            id: 'ja_s1_l4',
            title: 'Biến Âm Đục & Âm Ghép Katakana',
            shortTitle: 'Dakuon & Katakana',
            desc: 'Quy tắc thêm dấu Dakuten (゛), Handakuten (゜) và nhận diện chữ Katakana mượn.',
            icon: '✨',
            xp: 25,
            items: {
                vocab: [
                    { word: 'コーヒー', reading: 'コーヒー', meaning: 'Cà phê (từ mượn Coffee)' },
                    { word: 'パン', reading: 'パン', meaning: 'Bánh mì' },
                    { word: 'テレビ', reading: 'テレビ', meaning: 'Ti vi' },
                    { word: 'バス', reading: 'バス', meaning: 'Xe buýt' }
                ],
                kanji: [],
                grammar: []
            },
            questions: [
                {
                    type: 'choice',
                    prompt: 'Khi thêm dấu ゛ vào "か" (ka) sẽ biến thành âm gì?',
                    character: 'が',
                    reading: 'ga',
                    audio: 'が',
                    options: ['ga', 'za', 'da', 'ba'],
                    correctIndex: 0,
                    explanation: 'Hàng Ka thêm dấu dakuten (゛) biến thành hàng Ga (が, ぎ, ぐ, げ, ご).'
                },
                {
                    type: 'choice',
                    prompt: 'Từ Katakana "コーヒー" có nghĩa là gì?',
                    character: 'コーヒー',
                    reading: 'koohii',
                    audio: 'コーヒー',
                    options: ['Cà phê', 'Trà xanh', 'Nước ngọt', 'Bia'],
                    correctIndex: 0,
                    explanation: 'コーヒー mượn từ tiếng Anh "Coffee", có 2 trường âm (dấu gạch ngang).'
                },
                {
                    type: 'matching',
                    prompt: 'Nối các từ mượn Katakana phổ biến:',
                    pairs: [
                        { left: 'パン', right: 'Bánh mì' },
                        { left: 'テレビ', right: 'Ti vi' },
                        { left: 'バス', right: 'Xe buýt' },
                        { left: 'ホテル', right: 'Khách sạn' }
                    ]
                },
                {
                    type: 'audio_choice',
                    prompt: 'Nghe từ sau và chọn chữ viết đúng:',
                    character: 'まんが',
                    reading: 'manga',
                    audio: 'まんが',
                    options: ['まんが', 'まがか', 'みんが', 'まんだ'],
                    correctIndex: 0,
                    explanation: 'まんが (manga) nghĩa là truyện tranh Nhật Bản.'
                }
            ]
        },
        {
            id: 'ja_s1_l5',
            title: 'Thử Thách Chặng 1: Master Bảng Chữ Cái Kana',
            shortTitle: 'Vượt ải Chặng 1 👑',
            desc: 'Bài kiểm tra tổng hợp kiểm tra độ nhạy bén phát âm và vốn từ vựng khởi đầu!',
            icon: '👑',
            xp: 40,
            isMilestone: true,
            items: {
                vocab: [
                    { word: 'おはようございます', reading: 'おはようございます', meaning: 'Chào buổi sáng lịch sự' },
                    { word: 'さようなら', reading: 'さようなら', meaning: 'Tạm biệt' },
                    { word: 'いただきます', reading: 'いただきます', meaning: 'Xin mời ăn cơm (trước bữa ăn)' },
                    { word: 'ともだち', reading: 'ともだち', meaning: 'Bạn bè' }
                ],
                kanji: [],
                grammar: []
            },
            questions: [
                {
                    type: 'choice',
                    prompt: 'Chọn câu chào buổi sáng lịch sự trong tiếng Nhật:',
                    character: 'おはようございます',
                    reading: 'ohayou gozaimasu',
                    audio: 'おはようございます',
                    options: ['おはようございます', 'こんばんは', 'さようなら', 'いただきます'],
                    correctIndex: 0,
                    explanation: 'おはようございます là lời chào buổi sáng trang trọng.'
                },
                {
                    type: 'matching',
                    prompt: 'Thử thách nối nhanh 4 từ Hiragana căn bản:',
                    pairs: [
                        { left: 'わたし', right: 'Tôi' },
                        { left: 'ともだち', right: 'Bạn bè' },
                        { left: 'にほん', right: 'Nước Nhật' },
                        { left: 'せんせい', right: 'Thầy / Cô giáo' }
                    ]
                },
                {
                    type: 'audio_choice',
                    prompt: 'Nghe và xác định từ vựng đúng:',
                    character: 'さようなら',
                    reading: 'sayounara',
                    audio: 'さようなら',
                    options: ['さようなら (Tạm biệt)', 'じゃあね (Hẹn gặp lại)', 'またあした (Hẹn mai)', 'おやすみ (Ngủ ngon)'],
                    correctIndex: 0,
                    explanation: 'さようなら (sayounara) = Tạm biệt.'
                },
                {
                    type: 'choice',
                    prompt: 'Câu "いただきます" được nói vào lúc nào?',
                    character: 'いただきます',
                    reading: 'itadakimasu',
                    audio: 'いただきます',
                    options: ['Trước khi bắt đầu ăn cơm', 'Sau khi ăn xong', 'Trước khi đi ngủ', 'Khi ra khỏi nhà'],
                    correctIndex: 0,
                    explanation: 'いただきます được người Nhật nói trước bữa ăn để cảm ơn vì đồ ăn ngon.'
                }
            ]
        }
    ]
};

