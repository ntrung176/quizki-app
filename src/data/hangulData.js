// Bảng chữ cái tiếng Hàn (Hangul - 한글)
// 14 Phụ âm cơ bản + 5 Phụ âm đôi + 10 Nguyên âm cơ bản + 11 Nguyên âm ghép + 7 Nhóm Batchim

export const HANGUL_CATEGORIES = [
    { id: 'basic_consonants', name: 'Phụ âm cơ bản (14)', shortName: 'Phụ âm cơ bản' },
    { id: 'double_consonants', name: 'Phụ âm căng/đôi (5)', shortName: 'Phụ âm căng' },
    { id: 'basic_vowels', name: 'Nguyên âm cơ bản (10)', shortName: 'Nguyên âm cơ bản' },
    { id: 'compound_vowels', name: 'Nguyên âm ghép (11)', shortName: 'Nguyên âm ghép' },
    { id: 'batchim', name: 'Quy tắc Batchim (Âm cuối)', shortName: 'Batchim' },
];

export const HANGUL_DICTIONARY = {
    // --- 1. PHỤ ÂM CƠ BẢN (14) ---
    'g': {
        id: 'g',
        char: 'ㄱ',
        name: 'Giyeok (기역)',
        romaji: 'g / k',
        category: 'basic_consonants',
        strokes: 1,
        strokeHints: ['Kéo ngang từ trái qua phải, sau đó bẻ góc vuông kéo thẳng xuống'],
        mnemonic: 'Hình dáng giống khẩu súng hoặc chiếc ghế gập góc vuông, phát âm như "g/k"',
        pronunciationGuide: 'Đầu từ đọc là "k" nhẹ, giữa hai nguyên âm đọc là "g"',
        examples: [
            { word: '가방', romaji: 'gabang', meaning: 'Cái cặp / Túi xách' },
            { word: '고기', romaji: 'gogi', meaning: 'Thịt' },
            { word: '가수', romaji: 'gasu', meaning: 'Ca sĩ' }
        ]
    },
    'n': {
        id: 'n',
        char: 'ㄴ',
        name: 'Nieun (니은)',
        romaji: 'n',
        category: 'basic_consonants',
        strokes: 1,
        strokeHints: ['Kéo thẳng từ trên xuống, rồi bẻ góc vuông kéo sang phải'],
        mnemonic: 'Hình chiếc mũi (Nose) hoặc chiếc hài cong, phát âm là "n"',
        pronunciationGuide: 'Phát âm chuẩn âm "n", đầu lưỡi chạm vào lợi trên',
        examples: [
            { word: '나무', romaji: 'namu', meaning: 'Cái cây' },
            { word: '나비', romaji: 'nabi', meaning: 'Con bướm' },
            { word: '눈', romaji: 'nun', meaning: 'Mắt / Tuyết' }
        ]
    },
    'd': {
        id: 'd',
        char: 'ㄷ',
        name: 'Digeut (디귿)',
        romaji: 'd / t',
        category: 'basic_consonants',
        strokes: 2,
        strokeHints: [
            'Nét 1: Kéo ngang trên từ trái sang phải',
            'Nét 2: Kéo dọc xuống từ mép trái rồi bẻ ngang dưới sang phải'
        ],
        mnemonic: 'Hình dáng giống cánh cửa (Door) mở, phát âm là "d/t"',
        pronunciationGuide: 'Đầu từ phát âm bật nhẹ như "t", ở giữa từ phát âm như "d"',
        examples: [
            { word: '다리', romaji: 'dari', meaning: 'Cái chân / Cây cầu' },
            { word: '달', romaji: 'dal', meaning: 'Mặt trăng / Tháng' },
            { word: '돈', romaji: 'don', meaning: 'Tiền' }
        ]
    },
    'r': {
        id: 'r',
        char: 'ㄹ',
        name: 'Rieul (리을)',
        romaji: 'r / l',
        category: 'basic_consonants',
        strokes: 3,
        strokeHints: [
            'Nét 1: Kéo ngang rồi bẻ dọc xuống (như ㄱ)',
            'Nét 2: Kéo ngang nối từ điểm gấp',
            'Nét 3: Kéo góc từ mép trái rồi ngang sang phải (như ㄴ)'
        ],
        mnemonic: 'Hình con rắn uốn lượn hình chữ Z/S, phát âm là "r/l"',
        pronunciationGuide: 'Đứng đầu đọc lướt như "r" rung nhẹ, đứng cuối (batchim) đọc uốn lưỡi như "l"',
        examples: [
            { word: '라디오', romaji: 'radio', meaning: 'Đài Radio' },
            { word: '라면', romaji: 'ramyeon', meaning: 'Mì gói' },
            { word: '물', romaji: 'mul', meaning: 'Nước' }
        ]
    },
    'm': {
        id: 'm',
        char: 'ㅁ',
        name: 'Mieum (미음)',
        romaji: 'm',
        category: 'basic_consonants',
        strokes: 3,
        strokeHints: [
            'Nét 1: Kéo thẳng dọc bên trái xuống',
            'Nét 2: Kéo ngang trên rồi bẻ góc dọc xuống bên phải',
            'Nét 3: Kéo ngang đáy để đóng kín hình vuông'
        ],
        mnemonic: 'Hình chiếc miệng vuông vức (Mouth), phát âm là "m"',
        pronunciationGuide: 'Phát âm khép hai môi tự nhiên như âm "m" trong tiếng Việt',
        examples: [
            { word: '모자', romaji: 'moja', meaning: 'Cái mũ / Nón' },
            { word: '마음', romaji: 'maeum', meaning: 'Tấm lòng / Trái tim' },
            { word: '물고기', romaji: 'mulgogi', meaning: 'Con cá' }
        ]
    },
    'b': {
        id: 'b',
        char: 'ㅂ',
        name: 'Bieup (비읍)',
        romaji: 'b / p',
        category: 'basic_consonants',
        strokes: 4,
        strokeHints: [
            'Nét 1: Kéo dọc bên trái',
            'Nét 2: Kéo dọc bên phải song song',
            'Nét 3: Kéo ngang ở giữa',
            'Nét 4: Kéo ngang ở đáy'
        ],
        mnemonic: 'Hình chiếc xô / xô nước có quai đựng đồ (Bucket), phát âm là "b/p"',
        pronunciationGuide: 'Đầu từ phát âm như "p" nhẹ, giữa hai nguyên âm đọc là "b"',
        examples: [
            { word: '바지', romaji: 'baji', meaning: 'Cái quần' },
            { word: '바다', romaji: 'bada', meaning: 'Biển cả' },
            { word: '밥', romaji: 'bap', meaning: 'Cơm / Bữa ăn' }
        ]
    },
    's': {
        id: 's',
        char: 'ㅅ',
        name: 'Siot (시옷)',
        romaji: 's',
        category: 'basic_consonants',
        strokes: 2,
        strokeHints: [
            'Nét 1: Kéo chéo từ đỉnh sang trái xuống',
            'Nét 2: Kéo chéo từ giữa nét 1 sang phải xuống'
        ],
        mnemonic: 'Hình ngôi nhà nhỏ hoặc đôi chân người đứng thẳng, phát âm là "s"',
        pronunciationGuide: 'Phát âm nhẹ như "x", khi đi với "ㅣ, ㅑ, ㅕ, ㅛ, ㅠ" thì đọc là "sh"',
        examples: [
            { word: '사과', romaji: 'sagwa', meaning: 'Quả táo' },
            { word: '사람', romaji: 'saram', meaning: 'Con người' },
            { word: '시간', romaji: 'sigan', meaning: 'Thời gian' }
        ]
    },
    'ng': {
        id: 'ng',
        char: 'ㅇ',
        name: 'Ieung (이응)',
        romaji: 'ng / câm',
        category: 'basic_consonants',
        strokes: 1,
        strokeHints: ['Vẽ một vòng tròn tròn đều khép kín theo chiều kim đồng hồ'],
        mnemonic: 'Hình số 0 hoặc quả bóng tròn, đứng đầu là âm câm, đứng cuối đọc là "ng"',
        pronunciationGuide: 'Khi đứng đầu âm tiết thì là phụ âm câm; khi làm batchim thì đọc là "ng"',
        examples: [
            { word: '아이', romaji: 'ai', meaning: 'Em bé / Trẻ em' },
            { word: '우유', romaji: 'uyu', meaning: 'Sữa tươi' },
            { word: '강', romaji: 'gang', meaning: 'Dòng sông' }
        ]
    },
    'j': {
        id: 'j',
        char: 'ㅈ',
        name: 'Jieut (지읒)',
        romaji: 'j / ch',
        category: 'basic_consonants',
        strokes: 2,
        strokeHints: [
            'Nét 1: Kéo ngang trên rồi bẻ chéo sang trái',
            'Nét 2: Kéo chéo sang phải từ điểm gấp'
        ],
        mnemonic: 'Giống chữ ㅅ nhưng có thêm thanh ngang trên đầu, phát âm là "ch/j"',
        pronunciationGuide: 'Đầu từ phát âm như "ch", giữa từ phát âm nhẹ như "j/d"',
        examples: [
            { word: '지도', romaji: 'jido', meaning: 'Bản đồ' },
            { word: '집', romaji: 'jip', meaning: 'Ngôi nhà' },
            { word: '자동차', romaji: 'jadongcha', meaning: 'Xe ô tô' }
        ]
    },
    'ch': {
        id: 'ch',
        char: 'ㅊ',
        name: 'Chieut (치읓)',
        romaji: 'ch (bật hơi)',
        category: 'basic_consonants',
        strokes: 3,
        strokeHints: [
            'Nét 1: Nét phẩy ngắn trên đỉnh',
            'Nét 2: Kéo ngang rồi bẻ chéo trái',
            'Nét 3: Kéo chéo phải'
        ],
        mnemonic: 'Chữ ㅈ đội thêm chiếc nón nhọn trên đầu, phát âm bật hơi mạnh "ch!"',
        pronunciationGuide: 'Bật luồng hơi mạnh từ vòm miệng ra ngoài khi phát âm',
        examples: [
            { word: '치마', romaji: 'chima', meaning: 'Cái váy' },
            { word: '친구', romaji: 'chingu', meaning: 'Bạn bè' },
            { word: '차', romaji: 'cha', meaning: 'Trà / Xe cộ' }
        ]
    },
    'k': {
        id: 'k',
        char: 'ㅋ',
        name: 'Kieuk (키윽)',
        romaji: 'k (bật hơi)',
        category: 'basic_consonants',
        strokes: 2,
        strokeHints: [
            'Nét 1: Kéo ngang rồi bẻ dọc xuống (ㄱ)',
            'Nét 2: Kéo một nét ngang ở giữa'
        ],
        mnemonic: 'Chữ ㄱ có thêm thanh ngang phụ, phát âm là âm "k" bật hơi mạnh',
        pronunciationGuide: 'Bật hơi mạnh từ cổ họng như chữ "kh/k" trong tiếng Anh "Key"',
        examples: [
            { word: '코', romaji: 'ko', meaning: 'Cái mũi' },
            { word: '카메라', romaji: 'kamera', meaning: 'Máy ảnh' },
            { word: '커피', romaji: 'keopi', meaning: 'Cà phê' }
        ]
    },
    't': {
        id: 't',
        char: 'ㅌ',
        name: 'Tieut (티읕)',
        romaji: 't (bật hơi)',
        category: 'basic_consonants',
        strokes: 3,
        strokeHints: [
            'Nét 1: Kéo ngang trên',
            'Nét 2: Kéo ngang giữa',
            'Nét 3: Kéo dọc rồi ngang dưới (như ㄴ)'
        ],
        mnemonic: 'Giống chữ cái E trong tiếng Anh hoặc chiếc răng lược, phát âm "t" bật hơi',
        pronunciationGuide: 'Bật luồng hơi rõ rệt từ đầu răng ra ngoài',
        examples: [
            { word: '토마토', romaji: 'tomato', meaning: 'Quả cà chua' },
            { word: '탁자', romaji: 'takja', meaning: 'Cái bàn' },
            { word: '타조', romaji: 'tajo', meaning: 'Con đà điểu' }
        ]
    },
    'p': {
        id: 'p',
        char: 'ㅍ',
        name: 'Pieup (피읖)',
        romaji: 'p (bật hơi)',
        category: 'basic_consonants',
        strokes: 4,
        strokeHints: [
            'Nét 1: Kéo ngang trên',
            'Nét 2 & 3: Kéo hai nét dọc song song bên trong',
            'Nét 4: Kéo ngang đáy đóng lại'
        ],
        mnemonic: 'Hình cánh cổng Đền hoặc ký hiệu số Pi (π), phát âm "p" bật hơi',
        pronunciationGuide: 'Mím hai môi rồi bật bung hơi mạnh ra phía trước',
        examples: [
            { word: '포도', romaji: 'podo', meaning: 'Quả nho' },
            { word: '피아노', romaji: 'piano', meaning: 'Đàn Piano' },
            { word: '파', romaji: 'pa', meaning: 'Cây hành lá' }
        ]
    },
    'h': {
        id: 'h',
        char: 'ㅎ',
        name: 'Hieut (히읗)',
        romaji: 'h',
        category: 'basic_consonants',
        strokes: 3,
        strokeHints: [
            'Nét 1: Nét chấm/ngắn trên đỉnh',
            'Nét 2: Kéo ngang dài ở giữa',
            'Nét 3: Vẽ hình tròn ㅇ ở dưới'
        ],
        mnemonic: 'Hình người đang đội mũ rơm tròn, phát âm là "h"',
        pronunciationGuide: 'Phát âm đẩy nhẹ hơi từ họng như âm "h" trong tiếng Việt',
        examples: [
            { word: '하늘', romaji: 'haneul', meaning: 'Bầu trời' },
            { word: '하루', romaji: 'haru', meaning: 'Một ngày' },
            { word: '학교', romaji: 'hakgyo', meaning: 'Trường học' }
        ]
    },

    // --- 2. PHỤ ÂM ĐÔI / CĂNG (5) ---
    'kk': {
        id: 'kk',
        char: 'ㄲ',
        name: 'Ssang-giyeok (쌍기역)',
        romaji: 'kk',
        category: 'double_consonants',
        strokes: 2,
        strokeHints: ['Viết 2 chữ ㄱ đứng sát nhau'],
        mnemonic: 'Hai chữ ㄱ kép lại, đọc gằn giọng và căng cứng họng thành âm "c/k" đanh',
        pronunciationGuide: 'Nén hơi trong cuống họng, không bật hơi ra ngoài, phát âm đanh chắc',
        examples: [
            { word: '꽃', romaji: 'kkot', meaning: 'Bông hoa' },
            { word: '꼬리', romaji: 'kkori', meaning: 'Cái đuôi' },
            { word: '꿈', romaji: 'kkum', meaning: 'Giấc mơ' }
        ]
    },
    'tt': {
        id: 'tt',
        char: 'ㄸ',
        name: 'Ssang-digeut (쌍디귿)',
        romaji: 'tt',
        category: 'double_consonants',
        strokes: 4,
        strokeHints: ['Viết 2 chữ ㄷ đứng sát nhau'],
        mnemonic: 'Hai chữ ㄷ kép lại, đọc căng giọng thành âm "t" sắc nét',
        pronunciationGuide: 'Nén thanh quản và phát âm "t" căng, không thoát luồng hơi mạnh',
        examples: [
            { word: '딸기', romaji: 'ttalgi', meaning: 'Quả dâu tây' },
            { word: '떡', romaji: 'tteok', meaning: 'Bánh gạo Tteok' },
            { word: '뜨겁다', romaji: 'tteugeopda', meaning: 'Nóng bỏng' }
        ]
    },
    'pp': {
        id: 'pp',
        char: 'ㅃ',
        name: 'Ssang-bieup (쌍비읍)',
        romaji: 'pp',
        category: 'double_consonants',
        strokes: 8,
        strokeHints: ['Viết 2 chữ ㅂ đứng sát nhau'],
        mnemonic: 'Hai chữ ㅂ kép lại, đọc mím chặt môi phát âm "p" đanh',
        pronunciationGuide: 'Mím chặt hai môi nén hơi rồi bật ra gọn ghẽ, phát âm như "p" căng',
        examples: [
            { word: '빵', romaji: 'ppang', meaning: 'Bánh mì' },
            { word: '뽀뽀', romaji: 'ppoppo', meaning: 'Nụ hôn má' },
            { word: '빨간색', romaji: 'ppalgansaek', meaning: 'Màu đỏ' }
        ]
    },
    'ss': {
        id: 'ss',
        char: 'ㅆ',
        name: 'Ssang-siot (쌍시옷)',
        romaji: 'ss',
        category: 'double_consonants',
        strokes: 4,
        strokeHints: ['Viết 2 chữ ㅅ đứng sát nhau'],
        mnemonic: 'Hai chữ ㅅ kép lại, đọc xì hơi mạnh và căng thành âm "s" đặc trưng',
        pronunciationGuide: 'Ép lưỡi sát hàm trên phát ra âm "x/s" sắc và căng',
        examples: [
            { word: '쌀', romaji: 'ssal', meaning: 'Gạo' },
            { word: '쓰다', romaji: 'sseuda', meaning: 'Viết / Đắng / Đội' },
            { word: '싸다', romaji: 'ssada', meaning: 'Rẻ / Gói bọc' }
        ]
    },
    'jj': {
        id: 'jj',
        char: 'ㅉ',
        name: 'Ssang-jieut (쌍지읒)',
        romaji: 'jj',
        category: 'double_consonants',
        strokes: 4,
        strokeHints: ['Viết 2 chữ ㅈ đứng sát nhau'],
        mnemonic: 'Hai chữ ㅈ kép lại, đọc căng đanh âm "ch"',
        pronunciationGuide: 'Khép chặt răng, phát âm "ch" căng mạnh không thoát hơi',
        examples: [
            { word: '찌개', romaji: 'jjigae', meaning: 'Món canh hầm' },
            { word: '짜다', romaji: 'jjada', meaning: 'Mặn' },
            { word: '찍다', romaji: 'jjikda', meaning: 'Chụp ảnh' }
        ]
    },

    // --- 3. NGUYÊN ÂM CƠ BẢN (10) ---
    'a': {
        id: 'a',
        char: 'ㅏ',
        name: 'A (아)',
        romaji: 'a',
        category: 'basic_vowels',
        strokes: 2,
        strokeHints: ['Nét 1: Kéo dọc từ trên xuống', 'Nét 2: Nét ngang ngắn chỉ sang phải'],
        mnemonic: 'Cột đứng thẳng có nhánh chỉ sang phải hướng về Mặt Trời, phát âm là "a"',
        pronunciationGuide: 'Mở rộng miệng tự nhiên phát âm âm "a"',
        examples: [
            { word: '아버지', romaji: 'abeoji', meaning: 'Bố / Cha' },
            { word: '아침', romaji: 'achim', meaning: 'Buổi sáng' },
            { word: '아기', romaji: 'agi', meaning: 'Em bé' }
        ]
    },
    'ya': {
        id: 'ya',
        char: 'ㅑ',
        name: 'Ya (야)',
        romaji: 'ya',
        category: 'basic_vowels',
        strokes: 3,
        strokeHints: ['Nét 1: Kéo dọc', 'Nét 2 & 3: Hai nét ngang ngắn sang phải'],
        mnemonic: 'Chữ ㅏ có 2 gạch sang phải, phát âm là "ya"',
        pronunciationGuide: 'Lướt nhanh từ âm "i" sang âm "a"',
        examples: [
            { word: '야구', romaji: 'yagu', meaning: 'Bóng chày' },
            { word: '야채', romaji: 'yachae', meaning: 'Rau củ' },
            { word: '약', romaji: 'yak', meaning: 'Thuốc' }
        ]
    },
    'eo': {
        id: 'eo',
        char: 'ㅓ',
        name: 'Eo (어)',
        romaji: 'eo (ơ/o)',
        category: 'basic_vowels',
        strokes: 2,
        strokeHints: ['Nét 1: Nét ngang ngắn bên trái', 'Nét 2: Kéo dọc từ trên xuống'],
        mnemonic: 'Cột đứng có nhánh chỉ sang trái hướng vào trong, phát âm là "ơ / o mở"',
        pronunciationGuide: 'Mở khẩu hình miệng hình chữ "ơ", phát âm giữa "ơ" và "o"',
        examples: [
            { word: '어머니', romaji: 'eomeoni', meaning: 'Mẹ' },
            { word: '어제', romaji: 'eoje', meaning: 'Hôm qua' },
            { word: '얼굴', romaji: 'eolgul', meaning: 'Khuôn mặt' }
        ]
    },
    'yeo': {
        id: 'yeo',
        char: 'ㅕ',
        name: 'Yeo (여)',
        romaji: 'yeo (yơ)',
        category: 'basic_vowels',
        strokes: 3,
        strokeHints: ['Nét 1 & 2: Hai nét ngang ngắn bên trái', 'Nét 3: Kéo dọc từ trên xuống'],
        mnemonic: 'Chữ ㅓ có 2 gạch bên trái, phát âm là "yơ"',
        pronunciationGuide: 'Lướt nhanh từ "i" sang "ơ"',
        examples: [
            { word: '여자', romaji: 'yeoja', meaning: 'Phụ nữ / Con gái' },
            { word: '여름', romaji: 'yeoreum', meaning: 'Mùa hè' },
            { word: '여권', romaji: 'yeogwon', meaning: 'Hộ chiếu' }
        ]
    },
    'o': {
        id: 'o',
        char: 'ㅗ',
        name: 'O (오)',
        romaji: 'o',
        category: 'basic_vowels',
        strokes: 2,
        strokeHints: ['Nét 1: Nét dọc ngắn bên trên', 'Nét 2: Kéo ngang dài bên dưới'],
        mnemonic: 'Hình chiếc mầm cây mọc trồi lên mặt đất, phát âm tròn môi "ô / o"',
        pronunciationGuide: 'Tròn môi phát âm như âm "ô" trong tiếng Việt',
        examples: [
            { word: '오이', romaji: 'oi', meaning: 'Dưa chuột' },
            { word: '오늘', romaji: 'oneul', meaning: 'Hôm nay' },
            { word: '오빠', romaji: 'oppa', meaning: 'Anh trai (em gái gọi)' }
        ]
    },
    'yo': {
        id: 'yo',
        char: 'ㅛ',
        name: 'Yo (요)',
        romaji: 'yo',
        category: 'basic_vowels',
        strokes: 3,
        strokeHints: ['Nét 1 & 2: Hai nét dọc ngắn trên', 'Nét 3: Kéo ngang dài bên dưới'],
        mnemonic: 'Chữ ㅗ có 2 chồi mọc lên trên, phát âm là "yô"',
        pronunciationGuide: 'Tròn môi và lướt nhanh từ âm "i" sang "ô"',
        examples: [
            { word: '요리', romaji: 'yori', meaning: 'Món ăn / Nấu ăn' },
            { word: '요즘', romaji: 'yojeum', meaning: 'Dạo này' },
            { word: '요일', romaji: 'yoil', meaning: 'Thứ trong tuần' }
        ]
    },
    'u': {
        id: 'u',
        char: 'ㅜ',
        name: 'U (우)',
        romaji: 'u',
        category: 'basic_vowels',
        strokes: 2,
        strokeHints: ['Nét 1: Kéo ngang dài trên', 'Nét 2: Nét dọc ngắn ở giữa kéo xuống'],
        mnemonic: 'Hình củ cải đâm rễ xuống lòng đất, phát âm tròn môi "u"',
        pronunciationGuide: 'Chu môi tròn phát âm âm "u"',
        examples: [
            { word: '우산', romaji: 'usan', meaning: 'Cây dù / Ô' },
            { word: '우주', romaji: 'uju', meaning: 'Vũ trụ' },
            { word: '우리', romaji: 'uri', meaning: 'Chúng ta / Chúng tôi' }
        ]
    },
    'yu': {
        id: 'yu',
        char: 'ㅠ',
        name: 'Yu (유)',
        romaji: 'yu',
        category: 'basic_vowels',
        strokes: 3,
        strokeHints: ['Nét 1: Kéo ngang dài trên', 'Nét 2 & 3: Hai nét dọc ngắn chúc xuống'],
        mnemonic: 'Chữ ㅜ có 2 gạch chúc xuống như giọt nước mắt (T_T), phát âm là "yu"',
        pronunciationGuide: 'Chu môi lướt từ "i" sang "u"',
        examples: [
            { word: '유리', romaji: 'yuri', meaning: 'Thủy tinh / Kính' },
            { word: '유명', romaji: 'yumyeong', meaning: 'Nổi tiếng' },
            { word: '휴지', romaji: 'hyuji', meaning: 'Giấy vệ sinh / Giấy ăn' }
        ]
    },
    'eu': {
        id: 'eu',
        char: 'ㅡ',
        name: 'Eu (으)',
        romaji: 'eu (ư)',
        category: 'basic_vowels',
        strokes: 1,
        strokeHints: ['Kéo một nét ngang thẳng từ trái sang phải'],
        mnemonic: 'Hình mặt đất bằng phẳng bao la, phát âm bẹt miệng là "ư"',
        pronunciationGuide: 'Kéo căng khóe môi sang hai bên và phát âm âm "ư"',
        examples: [
            { word: '은행', romaji: 'eunhaeng', meaning: 'Ngân hàng' },
            { word: '음악', romaji: 'eumak', meaning: 'Âm nhạc' },
            { word: '음식', romaji: 'eumsik', meaning: 'Đồ ăn' }
        ]
    },
    'i': {
        id: 'i',
        char: 'ㅣ',
        name: 'I (이)',
        romaji: 'i',
        category: 'basic_vowels',
        strokes: 1,
        strokeHints: ['Kéo một nét dọc thẳng từ trên xuống dưới'],
        mnemonic: 'Hình bóng người đứng thẳng đứng vươn lên, phát âm là "i"',
        pronunciationGuide: 'Cười nhẹ phát âm âm "i"',
        examples: [
            { word: '이름', romaji: 'ireum', meaning: 'Họ tên' },
            { word: '이야기', romaji: 'iyagi', meaning: 'Câu chuyện' },
            { word: '이', romaji: 'i', meaning: 'Chiếc răng / Số 2' }
        ]
    },

    // --- 4. NGUYÊN ÂM GHÉP (11) ---
    'ae': {
        id: 'ae',
        char: 'ㅐ',
        name: 'Ae (애)',
        romaji: 'ae (e)',
        category: 'compound_vowels',
        strokes: 3,
        strokeHints: ['ㅏ + ㅣ ghép lại'],
        mnemonic: 'Ghép từ ㅏ và ㅣ, phát âm mở rộng miệng như "e / ae"',
        pronunciationGuide: 'Mở rộng miệng phát âm như chữ "e/e bẹt" trong tiếng Việt',
        examples: [
            { word: '개', romaji: 'gae', meaning: 'Con chó' },
            { word: '배', romaji: 'bae', meaning: 'Quả lê / Bụng / Con thuyền' }
        ]
    },
    'yae': {
        id: 'yae',
        char: 'ㅒ',
        name: 'Yae (얘)',
        romaji: 'yae (ye)',
        category: 'compound_vowels',
        strokes: 4,
        strokeHints: ['ㅑ + ㅣ ghép lại'],
        mnemonic: 'Ghép từ ㅑ và ㅣ, phát âm là "ye"',
        pronunciationGuide: 'Lướt nhanh từ "i" sang "e"',
        examples: [
            { word: '얘기', romaji: 'yaegi', meaning: 'Cuộc trò chuyện' }
        ]
    },
    'e': {
        id: 'e',
        char: 'ㅔ',
        name: 'E (에)',
        romaji: 'e',
        category: 'compound_vowels',
        strokes: 3,
        strokeHints: ['ㅓ + ㅣ ghép lại'],
        mnemonic: 'Ghép từ ㅓ và ㅣ, phát âm miệng vừa như "ê / e"',
        pronunciationGuide: 'Phát âm tương tự âm "ê" nhẹ trong tiếng Việt',
        examples: [
            { word: '가게', romaji: 'gage', meaning: 'Cửa hàng' },
            { word: '세계', romaji: 'segye', meaning: 'Thế giới' }
        ]
    },
    'ye': {
        id: 'ye',
        char: 'ㅖ',
        name: 'Ye (예)',
        romaji: 'ye',
        category: 'compound_vowels',
        strokes: 4,
        strokeHints: ['ㅕ + ㅣ ghép lại'],
        mnemonic: 'Ghép từ ㅕ và ㅣ, phát âm là "yê"',
        pronunciationGuide: 'Lướt nhanh từ "i" sang "ê"',
        examples: [
            { word: '예술', romaji: 'yesul', meaning: 'Nghệ thuật' },
            { word: '시계', romaji: 'sigye', meaning: 'Đồng hồ' }
        ]
    },
    'wa': {
        id: 'wa',
        char: 'ㅘ',
        name: 'Wa (와)',
        romaji: 'wa',
        category: 'compound_vowels',
        strokes: 4,
        strokeHints: ['ㅗ + ㅏ ghép lại'],
        mnemonic: 'Ghép từ ㅗ và ㅏ, phát âm là "oa / wa"',
        pronunciationGuide: 'Tròn môi rồi mở rộng miệng phát âm "oa"',
        examples: [
            { word: '사과', romaji: 'sagwa', meaning: 'Quả táo' },
            { word: '화요일', romaji: 'hwayoil', meaning: 'Thứ Ba' }
        ]
    },
    'wae': {
        id: 'wae',
        char: 'ㅙ',
        name: 'Wae (왜)',
        romaji: 'wae',
        category: 'compound_vowels',
        strokes: 5,
        strokeHints: ['ㅗ + ㅐ ghép lại'],
        mnemonic: 'Ghép từ ㅗ và ㅐ, phát âm là "oe / we"',
        pronunciationGuide: 'Tròn môi rồi phát âm sang "e"',
        examples: [
            { word: '왜', romaji: 'wae', meaning: 'Tại sao?' },
            { word: '돼지', romaji: 'dwaeji', meaning: 'Con heo / Con lợn' }
        ]
    },
    'oe': {
        id: 'oe',
        char: 'ㅚ',
        name: 'Oe (외)',
        romaji: 'oe (ue)',
        category: 'compound_vowels',
        strokes: 3,
        strokeHints: ['ㅗ + ㅣ ghép lại'],
        mnemonic: 'Ghép từ ㅗ và ㅣ, phát âm như "uê"',
        pronunciationGuide: 'Khẩu hình tròn môi phát âm âm "uê"',
        examples: [
            { word: '외국', romaji: 'oeguk', meaning: 'Nước ngoài' },
            { word: '회사', romaji: 'hoesa', meaning: 'Công ty' }
        ]
    },
    'wo': {
        id: 'wo',
        char: 'ㅝ',
        name: 'Wo (워)',
        romaji: 'wo (uơ)',
        category: 'compound_vowels',
        strokes: 4,
        strokeHints: ['ㅜ + ㅓ ghép lại'],
        mnemonic: 'Ghép từ ㅜ và ㅓ, phát âm là "uơ / wo"',
        pronunciationGuide: 'Tròn môi lướt sang âm "ơ"',
        examples: [
            { word: '월요일', romaji: 'woryoil', meaning: 'Thứ Hai' },
            { word: '병원', romaji: 'byeong-won', meaning: 'Bệnh viện' }
        ]
    },
    'we': {
        id: 'we',
        char: 'ㅞ',
        name: 'We (웨)',
        romaji: 'we',
        category: 'compound_vowels',
        strokes: 5,
        strokeHints: ['ㅜ + ㅔ ghép lại'],
        mnemonic: 'Ghép từ ㅜ và ㅔ, phát âm là "uê / we"',
        pronunciationGuide: 'Phát âm tương tự âm "uê" (dùng nhiều trong từ mượn)',
        examples: [
            { word: '웨이터', romaji: 'weiteo', meaning: 'Người phục vụ' },
            { word: '웹툰', romaji: 'weptun', meaning: 'Truyện tranh Webtoon' }
        ]
    },
    'wi': {
        id: 'wi',
        char: 'ㅟ',
        name: 'Wi (위)',
        romaji: 'wi (uy)',
        category: 'compound_vowels',
        strokes: 3,
        strokeHints: ['ㅜ + ㅣ ghép lại'],
        mnemonic: 'Ghép từ ㅜ và ㅣ, phát âm là "uy / wi"',
        pronunciationGuide: 'Tròn môi chu ra phía trước rồi phát âm "uy"',
        examples: [
            { word: '위', romaji: 'wi', meaning: 'Phía trên / Dạ dày' },
            { word: '귀', romaji: 'gwi', meaning: 'Cái tai' }
        ]
    },
    'ui': {
        id: 'ui',
        char: 'ㅢ',
        name: 'Ui (의)',
        romaji: 'ui (ưi)',
        category: 'compound_vowels',
        strokes: 2,
        strokeHints: ['ㅡ + ㅣ ghép lại'],
        mnemonic: 'Ghép từ ㅡ và ㅣ, phát âm là "ưi"',
        pronunciationGuide: 'Lướt nhanh từ "ư" sang "i". Khi làm trợ từ sở hữu thì đọc là "e"',
        examples: [
            { word: '의사', romaji: 'uisa', meaning: 'Bác sĩ' },
            { word: '의자', romaji: 'uija', meaning: 'Cái ghế' }
        ]
    },

    // --- 5. QUY TẮC BATCHIM (ÂM CUỐI - 7 NHÓM CHUẨN) ---
    'bat_k': {
        id: 'bat_k',
        char: 'ㄱ/ㄲ/ㅋ',
        name: 'Nhóm âm cuối [k]',
        romaji: '[k]',
        category: 'batchim',
        strokes: 1,
        mnemonic: 'Các chữ ㄱ, ㄲ, ㅋ khi đứng làm âm cuối (batchim) đều phát âm ngắt hơi là [k]',
        pronunciationGuide: 'Khép lưỡi chặn luồng hơi lại, phát âm âm [k] tắc không bật hơi',
        examples: [
            { word: '책', romaji: 'chaek', meaning: 'Quyển sách' },
            { word: '부엌', romaji: 'bueok', meaning: 'Nhà bếp (ㅋ -> k)' },
            { word: '밖', romaji: 'bak', meaning: 'Bên ngoài (ㄲ -> k)' }
        ]
    },
    'bat_n': {
        id: 'bat_n',
        char: 'ㄴ',
        name: 'Nhóm âm cuối [n]',
        romaji: '[n]',
        category: 'batchim',
        strokes: 1,
        mnemonic: 'Chữ ㄴ làm batchim phát âm chuẩn là [n]',
        pronunciationGuide: 'Đầu lưỡi chạm lợi trên giữ âm [n]',
        examples: [
            { word: '문', romaji: 'mun', meaning: 'Cửa ra vào' },
            { word: '산', romaji: 'san', meaning: 'Ngọn núi' },
            { word: '눈', romaji: 'nun', meaning: 'Mắt / Tuyết' }
        ]
    },
    'bat_t': {
        id: 'bat_t',
        char: 'ㄷ/ㅅ/ㅆ/ㅈ/ㅊ/ㅌ/ㅎ',
        name: 'Nhóm âm cuối [t]',
        romaji: '[t]',
        category: 'batchim',
        strokes: 2,
        mnemonic: '7 phụ âm này khi đứng làm âm cuối đều quy về phát âm ngắt tắc là [t]',
        pronunciationGuide: 'Đầu lưỡi chặn sau răng cửa hàm trên, ngắt âm [t]',
        examples: [
            { word: '옷', romaji: 'ot', meaning: 'Quần áo (ㅅ -> t)' },
            { word: '꽃', romaji: 'kkot', meaning: 'Bông hoa (ㅊ -> t)' },
            { word: '낮', romaji: 'nat', meaning: 'Ban ngày (ㅈ -> t)' },
            { word: '끝', romaji: 'kkeut', meaning: 'Kết thúc (ㅌ -> t)' }
        ]
    },
    'bat_l': {
        id: 'bat_l',
        char: 'ㄹ',
        name: 'Nhóm âm cuối [l]',
        romaji: '[l]',
        category: 'batchim',
        strokes: 3,
        mnemonic: 'Chữ ㄹ làm batchim phát âm uốn lưỡi chạm hàm trên là [l]',
        pronunciationGuide: 'Uốn cong đầu lưỡi chạm vào vòm miệng trên',
        examples: [
            { word: '물', romaji: 'mul', meaning: 'Nước' },
            { word: '달', romaji: 'dal', meaning: 'Mặt trăng' },
            { word: '길', romaji: 'gil', meaning: 'Con đường' }
        ]
    },
    'bat_m': {
        id: 'bat_m',
        char: 'ㅁ',
        name: 'Nhóm âm cuối [m]',
        romaji: '[m]',
        category: 'batchim',
        strokes: 3,
        mnemonic: 'Chữ ㅁ làm batchim phát âm ngậm môi là [m]',
        pronunciationGuide: 'Ngậm hai môi lại giữ luồng hơi qua mũi',
        examples: [
            { word: '밤', romaji: 'bam', meaning: 'Ban đêm / Hạt dẻ' },
            { word: '마음', romaji: 'maeum', meaning: 'Tấm lòng' },
            { word: '김밥', romaji: 'gimbap', meaning: 'Cơm cuộn rong biển' }
        ]
    },
    'bat_p': {
        id: 'bat_p',
        char: 'ㅂ/ㅍ',
        name: 'Nhóm âm cuối [p]',
        romaji: '[p]',
        category: 'batchim',
        strokes: 4,
        mnemonic: 'Chữ ㅂ và ㅍ khi làm batchim đều phát âm ngậm môi ngắt tắc [p]',
        pronunciationGuide: 'Ngậm chặt hai môi lại chặn luồng hơi thoát ra',
        examples: [
            { word: '밥', romaji: 'bap', meaning: 'Cơm' },
            { word: '집', romaji: 'jip', meaning: 'Ngôi nhà' },
            { word: '숲', romaji: 'sup', meaning: 'Khu rừng (ㅍ -> p)' }
        ]
    },
    'bat_ng': {
        id: 'bat_ng',
        char: 'ㅇ',
        name: 'Nhóm âm cuối [ng]',
        romaji: '[ng]',
        category: 'batchim',
        strokes: 1,
        mnemonic: 'Chữ ㅇ khi đứng cuối từ (batchim) phát âm tròn vành là [ng]',
        pronunciationGuide: 'Hạ vòm họng mềm đẩy hơi qua khoang mũi phát âm "ng"',
        examples: [
            { word: '사랑', romaji: 'sarang', meaning: 'Tình yêu' },
            { word: '공항', romaji: 'gonghang', meaning: 'Sân bay' },
            { word: '식당', romaji: 'sikdang', meaning: 'Nhà hàng / Quán ăn' }
        ]
    }
};

/**
 * Lấy danh sách ký tự Hangul theo phân loại
 */
export const getHangulList = (categoryId = 'basic_consonants') => {
    return Object.values(HANGUL_DICTIONARY).filter(item => {
        if (!categoryId || categoryId === 'all') return true;
        return item.category === categoryId;
    });
};
