// =============================================================================
// Comprehensive Japanese Kana Dataset (Hiragana & Katakana)
// Covers: 46 Base Gojūon + 25 Dakuon/Handakuon + 36 Yoon per syllabary
// =============================================================================

export const KANA_ROWS = [
    { id: 'a', name: 'Hàng A (あ/ア)', vowels: ['a', 'i', 'u', 'e', 'o'] },
    { id: 'ka', name: 'Hàng Ka (か/カ)', vowels: ['ka', 'ki', 'ku', 'ke', 'ko'] },
    { id: 'sa', name: 'Hàng Sa (さ/サ)', vowels: ['sa', 'shi', 'su', 'se', 'so'] },
    { id: 'ta', name: 'Hàng Ta (た/タ)', vowels: ['ta', 'chi', 'tsu', 'te', 'to'] },
    { id: 'na', name: 'Hàng Na (な/ナ)', vowels: ['na', 'ni', 'nu', 'ne', 'no'] },
    { id: 'ha', name: 'Hàng Ha (は/ハ)', vowels: ['ha', 'hi', 'fu', 'he', 'ho'] },
    { id: 'ma', name: 'Hàng Ma (ま/マ)', vowels: ['ma', 'mi', 'mu', 'me', 'mo'] },
    { id: 'ya', name: 'Hàng Ya (や/ヤ)', vowels: ['ya', null, 'yu', null, 'yo'] },
    { id: 'ra', name: 'Hàng Ra (ら/ラ)', vowels: ['ra', 'ri', 'ru', 're', 'ro'] },
    { id: 'wa', name: 'Hàng Wa / N (わ/ワ/ん)', vowels: ['wa', null, null, null, 'wo', 'n'] },
];

export const DAKUON_ROWS = [
    { id: 'ga', name: 'Hàng Ga (Âm đục が/ガ)', vowels: ['ga', 'gi', 'gu', 'ge', 'go'] },
    { id: 'za', name: 'Hàng Za (Âm đục ざ/ザ)', vowels: ['za', 'ji', 'zu', 'ze', 'zo'] },
    { id: 'da', name: 'Hàng Da (Âm đục だ/ダ)', vowels: ['da', 'dji', 'dzu', 'de', 'do'] },
    { id: 'ba', name: 'Hàng Ba (Âm đục ば/バ)', vowels: ['ba', 'bi', 'bu', 'be', 'bo'] },
    { id: 'pa', name: 'Hàng Pa (Âm bán đục ぱ/パ)', vowels: ['pa', 'pi', 'pu', 'pe', 'po'] },
];

export const YOON_GROUPS = [
    { id: 'kya', name: 'Hàng Kya (きゃ/キャ)', romajis: ['kya', 'kyu', 'kyo'] },
    { id: 'sha', name: 'Hàng Sha (しゃ/シャ)', romajis: ['sha', 'shu', 'sho'] },
    { id: 'cha', name: 'Hàng Cha (ちゃ/チャ)', romajis: ['cha', 'chu', 'cho'] },
    { id: 'nya', name: 'Hàng Nya (にゃ/ニャ)', romajis: ['nya', 'nyu', 'nyo'] },
    { id: 'hya', name: 'Hàng Hya (ひゃ/ヒャ)', romajis: ['hya', 'hyu', 'hyo'] },
    { id: 'mya', name: 'Hàng Mya (みゃ/ミャ)', romajis: ['mya', 'myu', 'myo'] },
    { id: 'rya', name: 'Hàng Rya (りゃ/リャ)', romajis: ['rya', 'ryu', 'ryo'] },
    { id: 'gya', name: 'Hàng Gya (ぎゃ/ギャ)', romajis: ['gya', 'gyu', 'gyo'] },
    { id: 'ja',  name: 'Hàng Ja (じゃ/ジャ)', romajis: ['ja', 'ju', 'jo'] },
    { id: 'bya', name: 'Hàng Bya (びゃ/ビャ)', romajis: ['bya', 'byu', 'byo'] },
    { id: 'pya', name: 'Hàng Pya (ぴゃ/ピャ)', romajis: ['pya', 'pyu', 'pyo'] },
];

// Master Dictionary of Kana Characters
export const KANA_DICTIONARY = {
    // ==========================================
    // 1. HIRAGANA - BASE 46
    // ==========================================
    'a': {
        hira: 'あ', kata: 'ア', romaji: 'a', row: 'a', strokes: 3,
        mnemonic: 'Giống một quả táo Apple có cuống và thân tròn tròn.',
        strokeHints: ['Nét 1: Gạch ngang ngắn từ trái sang phải', 'Nét 2: Gạch dọc uốn cong từ trên xuống', 'Nét 3: Vòng xoắn tròn qua phải'],
        examples: [
            { word: 'あさ', romaji: 'asa', meaning: 'Buổi sáng' },
            { word: 'あめ', romaji: 'ame', meaning: 'Mưa / Kẹo' },
            { word: 'ありがとう', romaji: 'arigatou', meaning: 'Cảm ơn' }
        ]
    },
    'i': {
        hira: 'い', kata: 'イ', romaji: 'i', row: 'a', strokes: 2,
        mnemonic: 'Giống 2 con lươn Eel / 2 cái que song song bên trái cong nhẹ.',
        strokeHints: ['Nét 1: Nét cong đứng bên trái vuốt móc nhẹ', 'Nét 2: Nét cong ngắn hơn bên phải'],
        examples: [
            { word: 'いぬ', romaji: 'inu', meaning: 'Con chó' },
            { word: 'いえ', romaji: 'ie', meaning: 'Ngôi nhà' },
            { word: 'いち', romaji: 'ichi', meaning: 'Số 1' }
        ]
    },
    'u': {
        hira: 'う', kata: 'ウ', romaji: 'u', row: 'a', strokes: 2,
        mnemonic: 'Giống lưng một võ sĩ sumo đang gù xuống Oof.',
        strokeHints: ['Nét 1: Chấm chéo nhỏ ở trên', 'Nét 2: Nét vòng cung lớn uốn cong bên dưới'],
        examples: [
            { word: 'うみ', romaji: 'umi', meaning: 'Biển' },
            { word: 'うた', romaji: 'uta', meaning: 'Bài hát' },
            { word: 'うし', romaji: 'ushi', meaning: 'Con bò' }
        ]
    },
    'e': {
        hira: 'え', kata: 'エ', romaji: 'e', row: 'a', strokes: 2,
        mnemonic: 'Giống một chú chim Exotic bird hoặc người đang chạy Energetic.',
        strokeHints: ['Nét 1: Chấm chéo phía trên', 'Nét 2: Nét liền zic-zac kéo xuống uốn lượn sang phải'],
        examples: [
            { word: 'えき', romaji: 'eki', meaning: 'Nhà ga' },
            { word: 'えん', romaji: 'en', meaning: 'Yên Nhật' },
            { word: 'えんぴつ', romaji: 'enpitsu', meaning: 'Bút chì' }
        ]
    },
    'o': {
        hira: 'お', kata: 'オ', romaji: 'o', row: 'a', strokes: 3,
        mnemonic: 'Một người đang nhảy qua chướng ngại vật Over obstacle.',
        strokeHints: ['Nét 1: Gạch ngang ngắn', 'Nét 2: Nét đứng móc ngược rồi vòng tròn sang phải', 'Nét 3: Dấu chấm phẩy phía trên bên phải'],
        examples: [
            { word: 'お茶（おちゃ）', romaji: 'ocha', meaning: 'Trà xanh' },
            { word: 'お金（おかね）', romaji: 'okane', meaning: 'Tiền' },
            { word: 'おにぎり', romaji: 'onigiri', meaning: 'Cơm nắm' }
        ]
    },

    // --- Hàng KA ---
    'ka': {
        hira: 'か', kata: 'カ', romaji: 'ka', row: 'ka', strokes: 3,
        mnemonic: 'Một lưỡi dao sắc Katana hoặc người đang mở miệng Ca hát.',
        strokeHints: ['Nét 1: Gạch ngang rồi gấp khúc xuống móc nhẹ', 'Nét 2: Nét chém dọc từ trên xuống', 'Nét 3: Dấu phẩy nhỏ phía ngoài bên phải'],
        examples: [
            { word: 'かさ', romaji: 'kasa', meaning: 'Cái ô (dù)' },
            { word: 'かわ', romaji: 'kawa', meaning: 'Dòng sông' },
            { word: 'かぞく', romaji: 'kazoku', meaning: 'Gia đình' }
        ]
    },
    'ki': {
        hira: 'き', kata: 'キ', romaji: 'ki', row: 'ka', strokes: 4,
        mnemonic: 'Giống hình chiếc chìa khóa Key mở cánh cửa.',
        strokeHints: ['Nét 1: Gạch ngang trên', 'Nét 2: Gạch ngang dưới hơi dài hơn', 'Nét 3: Nét chéo cắt ngang 2 nét', 'Nét 4: Vòng cung cong dưới đáy'],
        examples: [
            { word: 'き', romaji: 'ki', meaning: 'Cây cối' },
            { word: 'きっぷ', romaji: 'kippu', meaning: 'Vé xe / tàu' },
            { word: 'きょう', romaji: 'kyou', meaning: 'Hôm nay' }
        ]
    },
    'ku': {
        hira: 'く', kata: 'ク', romaji: 'ku', row: 'ka', strokes: 1,
        mnemonic: 'Giống mỏ chim Cuckoo đang kêu cúc cu.',
        strokeHints: ['Nét 1: Nét gập góc nhọn sang trái mở rộng sang phải'],
        examples: [
            { word: 'くるま', romaji: 'kuruma', meaning: 'Xe hơi' },
            { word: 'くつ', romaji: 'kutsu', meaning: 'Giày' },
            { word: 'くだもの', romaji: 'kudamono', meaning: 'Hoa quả' }
        ]
    },
    'ke': {
        hira: 'け', kata: 'ケ', romaji: 'ke', row: 'ka', strokes: 3,
        mnemonic: 'Giống một thùng bia Keg hoặc thanh kiếm kiếm đạo Kendo.',
        strokeHints: ['Nét 1: Nét đứng hơi cong bên trái', 'Nét 2: Gạch ngang bên phải', 'Nét 3: Nét đứng cắt gạch ngang uốn nhẹ sang phải'],
        examples: [
            { word: 'けさ', romaji: 'kesa', meaning: 'Sáng nay' },
            { word: 'けいさつ', romaji: 'keisatsu', meaning: 'Cảnh sát' },
            { word: 'けいたい', romaji: 'keitai', meaning: 'Điện thoại di động' }
        ]
    },
    'ko': {
        hira: 'こ', kata: 'コ', romaji: 'ko', row: 'ka', strokes: 2,
        mnemonic: 'Giống hai khúc gỗ nối lại hoặc con cá chép Koi.',
        strokeHints: ['Nét 1: Nét ngang trên uốn nhẹ', 'Nét 2: Nét cong đáy bên dưới'],
        examples: [
            { word: 'こども', romaji: 'kodomo', meaning: 'Trẻ em' },
            { word: 'これ', romaji: 'kore', meaning: 'Cái này' },
            { word: 'こおり', romaji: 'koori', meaning: 'Đá lạnh' }
        ]
    },

    // --- Hàng SA ---
    'sa': {
        hira: 'さ', kata: 'サ', romaji: 'sa', row: 'sa', strokes: 3,
        mnemonic: 'Một ly Samurai đang giơ thanh kiếm chém.',
        strokeHints: ['Nét 1: Gạch ngang', 'Nét 2: Nét chéo xuống', 'Nét 3: Vòng cung đón dưới đáy'],
        examples: [
            { word: 'さくら', romaji: 'sakura', meaning: 'Hoa anh đào' },
            { word: 'さかな', romaji: 'sakana', meaning: 'Con cá' },
            { word: 'さとう', romaji: 'satou', meaning: 'Đường cát' }
        ]
    },
    'shi': {
        hira: 'し', kata: 'シ', romaji: 'shi', row: 'sa', strokes: 1,
        mnemonic: 'Giống lưỡi câu cá chìm sâu dưới biển She-hook.',
        strokeHints: ['Nét 1: Nét thẳng từ trên xuống uốn cong móc tròn sang phải'],
        examples: [
            { word: 'しんぶん', romaji: 'shinbun', meaning: 'Báo chí' },
            { word: 'しろい', romaji: 'shiroi', meaning: 'Màu trắng' },
            { word: 'しごと', romaji: 'shigoto', meaning: 'Công việc' }
        ]
    },
    'su': {
        hira: 'す', kata: 'ス', romaji: 'su', row: 'sa', strokes: 2,
        mnemonic: 'Hình người đang đu dây Swing hoặc bông hoa đang nở.',
        strokeHints: ['Nét 1: Gạch ngang', 'Nét 2: Nét sổ dọc xoắn vòng tròn sang trái rồi kéo thẳng xuống'],
        examples: [
            { word: 'すし', romaji: 'sushi', meaning: 'Món Sushi' },
            { word: 'すき', romaji: 'suki', meaning: 'Thích' },
            { word: 'すいか', romaji: 'suika', meaning: 'Dưa hấu' }
        ]
    },
    'se': {
        hira: 'せ', kata: 'セ', romaji: 'se', row: 'sa', strokes: 3,
        mnemonic: 'Người ngồi trên bậc thang ngắm hoàng hôn Sunset.',
        strokeHints: ['Nét 1: Gạch ngang dài uốn góc xuống', 'Nét 2: Nét đứng ngắn bên phải', 'Nét 3: Nét đứng dài bên trái vòng sang'],
        examples: [
            { word: 'せんせい', romaji: 'sensei', meaning: 'Thầy cô giáo' },
            { word: 'せかい', romaji: 'sekai', meaning: 'Thế giới' },
            { word: 'せんたく', romaji: 'sentaku', meaning: 'Giặt giũ' }
        ]
    },
    'so': {
        hira: 'そ', kata: 'ソ', romaji: 'so', row: 'sa', strokes: 1,
        mnemonic: 'Đường chỉ khâu zic-zac Sewing stitch.',
        strokeHints: ['Nét 1: Gạch ngang trên, chéo xuống trái, ngang dưới rồi cong tròn sang phải'],
        examples: [
            { word: 'そら', romaji: 'sora', meaning: 'Bầu trời' },
            { word: 'そこ', romaji: 'soko', meaning: 'Chỗ đó' },
            { word: 'そば', romaji: 'soba', meaning: 'Mì soba / Bên cạnh' }
        ]
    },

    // --- Hàng TA ---
    'ta': {
        hira: 'た', kata: 'タ', romaji: 'ta', row: 'ta', strokes: 4,
        mnemonic: 'Nhìn giống chữ cái "ta" ghép từ t và a.',
        strokeHints: ['Nét 1: Gạch ngang ngắn', 'Nét 2: Nét chéo dọc', 'Nét 3 & 4: Hai nét cong nhỏ như chữ こ'],
        examples: [
            { word: 'たべる', romaji: 'taberu', meaning: 'Ăn' },
            { word: 'たまご', romaji: 'tamago', meaning: 'Quả trứng' },
            { word: 'たいよう', romaji: 'taiyou', meaning: 'Mặt trời' }
        ]
    },
    'chi': {
        hira: 'ち', kata: 'チ', romaji: 'chi', row: 'ta', strokes: 2,
        mnemonic: 'Một cô hoạt náo viên Cheerleader tràn đầy năng lượng.',
        strokeHints: ['Nét 1: Gạch ngang ngắn hơi chéo', 'Nét 2: Nét sổ dọc uốn thành bụng tròn chữ 5'],
        examples: [
            { word: 'ちず', romaji: 'chizu', meaning: 'Bản đồ' },
            { word: 'ちいさい', romaji: 'chiisai', meaning: 'Nhỏ bé' },
            { word: 'ちち', romaji: 'chichi', meaning: 'Bố (của mình)' }
        ]
    },
    'tsu': {
        hira: 'つ', kata: 'ツ', romaji: 'tsu', row: 'ta', strokes: 1,
        mnemonic: 'Một ngọn sóng thần khổng lồ Tsunami.',
        strokeHints: ['Nét 1: Nét ngang cong tròn lớn qua phải rồi thu đuôi về trái'],
        examples: [
            { word: 'つき', romaji: 'tsuki', meaning: 'Mặt trăng / Tháng' },
            { word: 'つくえ', romaji: 'tsukue', meaning: 'Cái bàn' },
            { word: 'つぎ', romaji: 'tsugi', meaning: 'Tiếp theo' }
        ]
    },
    'te': {
        hira: 'て', kata: 'テ', romaji: 'te', row: 'ta', strokes: 1,
        mnemonic: 'Hình bàn tay hoặc nhánh cây Tenacious branch.',
        strokeHints: ['Nét 1: Gạch ngang rồi uốn cong tròn như nửa hình bầu dục'],
        examples: [
            { word: 'て', romaji: 'te', meaning: 'Bàn tay' },
            { word: 'てがみ', romaji: 'tegami', meaning: 'Lá thư' },
            { word: 'てんき', romaji: 'tenki', meaning: 'Thời tiết' }
        ]
    },
    'to': {
        hira: 'と', kata: 'ト', romaji: 'to', row: 'ta', strokes: 2,
        mnemonic: 'Một cái gai cắm vào ngón chân Toe.',
        strokeHints: ['Nét 1: Nét chéo ngắn từ trên xuống', 'Nét 2: Nét cong lớn bao trọn bên phải'],
        examples: [
            { word: 'ともだち', romaji: 'tomodachi', meaning: 'Bạn bè' },
            { word: 'とり', romaji: 'tori', meaning: 'Con chim' },
            { word: 'とけい', romaji: 'tokei', meaning: 'Đồng hồ' }
        ]
    },

    // --- Hàng NA ---
    'na': {
        hira: 'な', kata: 'ナ', romaji: 'na', row: 'na', strokes: 4,
        mnemonic: 'Người phụ nữ đang quỳ cầu nguyện Nun.',
        strokeHints: ['Nét 1: Gạch ngang', 'Nét 2: Nét chéo', 'Nét 3: Dấu phẩy trên', 'Nét 4: Nét thắt nút dưới'],
        examples: [
            { word: 'なつ', romaji: 'natsu', meaning: 'Mùa hè' },
            { word: 'なまえ', romaji: 'namae', meaning: 'Tên' },
            { word: 'なに', romaji: 'nani', meaning: 'Cái gì' }
        ]
    },
    'ni': {
        hira: 'に', kata: 'ニ', romaji: 'ni', row: 'na', strokes: 3,
        mnemonic: 'Kim khâu chỉ Needle & thread.',
        strokeHints: ['Nét 1: Nét sổ đứng uốn móc', 'Nét 2: Gạch ngang trên', 'Nét 3: Gạch ngang dưới'],
        examples: [
            { word: 'にほん', romaji: 'nihon', meaning: 'Nhật Bản' },
            { word: 'にく', romaji: 'niku', meaning: 'Thịt' },
            { word: 'にわ', romaji: 'niwa', meaning: 'Khu vườn' }
        ]
    },
    'nu': {
        hira: 'ぬ', kata: 'ヌ', romaji: 'nu', row: 'na', strokes: 2,
        mnemonic: 'Một sợi mì Noodles xoắn tròn có đuôi vòng.',
        strokeHints: ['Nét 1: Nét chéo trái', 'Nét 2: Nét uốn lượn thắt một vòng tròn ở đuôi'],
        examples: [
            { word: 'ぬいぐるみ', romaji: 'nuigurumi', meaning: 'Gấu bông' },
            { word: 'ぬる', romaji: 'nuru', meaning: 'Sơn / Thoa' },
            { word: 'ぬま', romaji: 'numa', meaning: 'Đầm lầy' }
        ]
    },
    'ne': {
        hira: 'ね', kata: 'ネ', romaji: 'ne', row: 'na', strokes: 2,
        mnemonic: 'Con mèo Neko đang ngồi cuộn tròn đuôi.',
        strokeHints: ['Nét 1: Nét thẳng đứng', 'Nét 2: Nét zic-zac kéo sang vòng thắt nút'],
        examples: [
            { word: 'ねこ', romaji: 'neko', meaning: 'Con mèo' },
            { word: 'ねる', romaji: 'neru', meaning: 'Ngủ' },
            { word: 'ねつ', romaji: 'netsu', meaning: 'Cơn sốt' }
        ]
    },
    'no': {
        hira: 'の', kata: 'ノ', romaji: 'no', row: 'na', strokes: 1,
        mnemonic: 'Biển báo cấm No sign hình tròn.',
        strokeHints: ['Nét 1: Nét chéo xuống rồi uốn tròn ngược lên bao quanh'],
        examples: [
            { word: 'のみもの', romaji: 'nomimono', meaning: 'Đồ uống' },
            { word: 'のる', romaji: 'noru', meaning: 'Lên xe / tàu' },
            { word: 'ノート', romaji: 'nooto', meaning: 'Cuốn vở' }
        ]
    },

    // --- Hàng HA ---
    'ha': {
        hira: 'は', kata: 'ハ', romaji: 'ha', row: 'ha', strokes: 3,
        mnemonic: 'Chữ H và chiếc mặt cười Ha ha ha.',
        strokeHints: ['Nét 1: Nét sổ đứng bên trái', 'Nét 2: Gạch ngang', 'Nét 3: Nét sổ thắt nút tròn dưới'],
        examples: [
            { word: 'はな', romaji: 'hana', meaning: 'Hoa / Cái mũi' },
            { word: 'はる', romaji: 'haru', meaning: 'Mùa xuân' },
            { word: 'はい', romaji: 'hai', meaning: 'Vâng / Đúng' }
        ]
    },
    'hi': {
        hira: 'ひ', kata: 'ヒ', romaji: 'hi', row: 'ha', strokes: 1,
        mnemonic: 'Một nụ cười Toe toét He-he-he.',
        strokeHints: ['Nét 1: Ngang ngắn, uốn võng sâu xuống rồi kéo lên gập xuống'],
        examples: [
            { word: 'ひ', romaji: 'hi', meaning: 'Mặt trời / Ngọn lửa / Ngày' },
            { word: 'ひと', romaji: 'hito', meaning: 'Con người' },
            { word: 'ひる', romaji: 'hiru', meaning: 'Buổi trưa' }
        ]
    },
    'fu': {
        hira: 'ふ', kata: 'フ', romaji: 'fu', row: 'ha', strokes: 4,
        mnemonic: 'Núi Phú Sĩ Mt. Fuji phủ tuyết trắng.',
        strokeHints: ['Nét 1: Chấm trên đỉnh núi', 'Nét 2: Thân núi uốn cong', 'Nét 3 & 4: Hai chấm sườn núi'],
        examples: [
            { word: 'ふゆ', romaji: 'fuyu', meaning: 'Mùa đông' },
            { word: 'ふね', romaji: 'fune', meaning: 'Con thuyền' },
            { word: 'ふじさん', romaji: 'fujisan', meaning: 'Núi Phú Sĩ' }
        ]
    },
    'he': {
        hira: 'へ', kata: 'ヘ', romaji: 'he', row: 'ha', strokes: 1,
        mnemonic: 'Một ngọn đồi thoai thoải Help up the hill.',
        strokeHints: ['Nét 1: Đi lên dốc ngắn rồi đi xuống dốc dài'],
        examples: [
            { word: 'へや', romaji: 'heya', meaning: 'Căn phòng' },
            { word: 'へび', romaji: 'hebi', meaning: 'Con rắn' },
            { word: 'へいわ', romaji: 'heiwa', meaning: 'Hòa bình' }
        ]
    },
    'ho': {
        hira: 'ほ', kata: 'ホ', romaji: 'ho', row: 'ha', strokes: 4,
        mnemonic: 'Giống chữ は nhưng có thêm cái nón trên đầu Hot!',
        strokeHints: ['Nét 1: Nét sổ trái', 'Nét 2: Gạch ngang trên', 'Nét 3: Gạch ngang dưới', 'Nét 4: Nét sổ thắt nút tròn'],
        examples: [
            { word: 'ほん', romaji: 'hon', meaning: 'Quyển sách' },
            { word: 'ほし', romaji: 'hoshi', meaning: 'Ngôi sao' },
            { word: 'ホテル', romaji: 'hoteru', meaning: 'Khách sạn' }
        ]
    },

    // --- Hàng MA ---
    'ma': {
        hira: 'ま', kata: 'マ', romaji: 'ma', row: 'ma', strokes: 3,
        mnemonic: 'Một người mẹ Mama dịu hiền.',
        strokeHints: ['Nét 1: Gạch ngang trên', 'Nét 2: Gạch ngang dưới', 'Nét 3: Nét sổ thắt nút tròn'],
        examples: [
            { word: 'まち', romaji: 'machi', meaning: 'Thành phố' },
            { word: 'まど', romaji: 'mado', meaning: 'Cửa sổ' },
            { word: 'また', romaji: 'mata', meaning: 'Hẹn gặp lại' }
        ]
    },
    'mi': {
        hira: 'み', kata: 'ミ', romaji: 'mi', row: 'ma', strokes: 2,
        mnemonic: 'Nốt nhạc số 21 hoặc gương mặt của Me.',
        strokeHints: ['Nét 1: Nét số 2 uốn vòng', 'Nét 2: Nét gạch chéo cắt đuôi'],
        examples: [
            { word: 'みず', romaji: 'mizu', meaning: 'Nước' },
            { word: 'みち', romaji: 'michi', meaning: 'Con đường' },
            { word: 'みみ', romaji: 'mimi', meaning: 'Cái tai' }
        ]
    },
    'mu': {
        hira: 'む', kata: 'ム', romaji: 'mu', row: 'ma', strokes: 3,
        mnemonic: 'Tiếng bò kêu Moo với chiếc sừng cong.',
        strokeHints: ['Nét 1: Gạch ngang', 'Nét 2: Sổ xuống thắt vòng rồi kéo sang phải vểnh lên', 'Nét 3: Chấm nhỏ trên'],
        examples: [
            { word: 'むし', romaji: 'mushi', meaning: 'Côn trùng' },
            { word: 'むずかしい', romaji: 'muzukashii', meaning: 'Khó khăn' },
            { word: 'むら', romaji: 'mura', meaning: 'Ngôi làng' }
        ]
    },
    'me': {
        hira: 'め', kata: 'メ', romaji: 'me', row: 'ma', strokes: 2,
        mnemonic: 'Giống chữ ぬ nhưng không có đuôi xoắn (Mắt - Me).',
        strokeHints: ['Nét 1: Nét cong chéo trái', 'Nét 2: Nét vòng cung to bao tròn'],
        examples: [
            { word: 'め', romaji: 'me', meaning: 'Mắt' },
            { word: 'めがね', romaji: 'megane', meaning: 'Kính mắt' },
            { word: 'メニュー', romaji: 'menyuu', meaning: 'Thực đơn' }
        ]
    },
    'mo': {
        hira: 'も', kata: 'モ', romaji: 'mo', row: 'ma', strokes: 3,
        mnemonic: 'Móc câu cá gắn thêm More mồi.',
        strokeHints: ['Nét 1: Nét móc câu chính giữa', 'Nét 2 & 3: Hai gạch ngang cắt thân móc'],
        examples: [
            { word: 'もり', romaji: 'mori', meaning: 'Khu rừng' },
            { word: 'もの', romaji: 'mono', meaning: 'Đồ vật' },
            { word: 'もも', romaji: 'momo', meaning: 'Quả đào' }
        ]
    },

    // --- Hàng YA ---
    'ya': {
        hira: 'や', kata: 'ヤ', romaji: 'ya', row: 'ya', strokes: 3,
        mnemonic: 'Chiếc du thuyền Yacht trên biển.',
        strokeHints: ['Nét 1: Mũi thuyền uốn cong', 'Nét 2: Chấm nhỏ bên phải', 'Nét 3: Cột buồm chéo'],
        examples: [
            { word: 'やま', romaji: 'yama', meaning: 'Ngọn núi' },
            { word: 'やすみ', romaji: 'yasumi', meaning: 'Nghỉ ngơi / Ngày nghỉ' },
            { word: 'やさい', romaji: 'yasai', meaning: 'Rau củ' }
        ]
    },
    'yu': {
        hira: 'ゆ', kata: 'ユ', romaji: 'yu', row: 'ya', strokes: 2,
        mnemonic: 'Con cá bơi lội hoặc chú cá ngừ béo tròn You.',
        strokeHints: ['Nét 1: Nét uốn vòng xoắn cong', 'Nét 2: Nét sổ chém qua'],
        examples: [
            { word: 'ゆき', romaji: 'yuki', meaning: 'Tuyết' },
            { word: 'ゆめ', romaji: 'yume', meaning: 'Giấc mơ' },
            { word: 'ゆうがた', romaji: 'yuugata', meaning: 'Chiều tối' }
        ]
    },
    'yo': {
        hira: 'よ', kata: 'ヨ', romaji: 'yo', row: 'ya', strokes: 2,
        mnemonic: 'Con quay Yo-yo đang cuộn dây.',
        strokeHints: ['Nét 1: Gạch ngang ngắn', 'Nét 2: Nét sổ thắt nút tròn qua trái'],
        examples: [
            { word: 'よる', romaji: 'yoru', meaning: 'Ban đêm' },
            { word: 'よむ', romaji: 'yomu', meaning: 'Đọc' },
            { word: 'よい', romaji: 'yoi', meaning: 'Tốt lành' }
        ]
    },

    // --- Hàng RA ---
    'ra': {
        hira: 'ら', kata: 'ラ', romaji: 'ra', row: 'ra', strokes: 2,
        mnemonic: 'Một chú lạc đà Camel / Rapper đang nhảy.',
        strokeHints: ['Nét 1: Dấu chấm trên', 'Nét 2: Nét cong như số 5'],
        examples: [
            { word: 'らいしゅう', romaji: 'raishuu', meaning: 'Tuần sau' },
            { word: 'ラジオ', romaji: 'rajio', meaning: 'Đài Radio' },
            { word: 'ラーメン', romaji: 'raamen', meaning: 'Mì Ramen' }
        ]
    },
    'ri': {
        hira: 'り', kata: 'リ', romaji: 'ri', row: 'ra', strokes: 2,
        mnemonic: 'Hai dải ruy băng Ribbon thướt tha.',
        strokeHints: ['Nét 1: Nét ngắn bên trái móc nhẹ', 'Nét 2: Nét dài hơn bên phải cong xuống'],
        examples: [
            { word: 'りんご', romaji: 'ringo', meaning: 'Quả táo' },
            { word: 'りょうり', romaji: 'ryouri', meaning: 'Món ăn / Nấu ăn' },
            { word: 'りょこう', romaji: 'ryokou', meaning: 'Du lịch' }
        ]
    },
    'ru': {
        hira: 'る', kata: 'ル', romaji: 'ru', row: 'ra', strokes: 1,
        mnemonic: 'Một viên ngọc Ruby trong vòng tròn.',
        strokeHints: ['Nét 1: Gạch ngang, chéo xuống, cong tròn và thắt nút ở đuôi'],
        examples: [
            { word: 'くるま', romaji: 'kuruma', meaning: 'Xe hơi' },
            { word: 'ルール', romaji: 'ruuru', meaning: 'Quy tắc' },
            { word: 'るす', romaji: 'rusu', meaning: 'Vắng nhà' }
        ]
    },
    're': {
        hira: 'れ', kata: 'レ', romaji: 're', row: 'ra', strokes: 2,
        mnemonic: 'Người đang ngồi nghỉ Rest sau khi chạy.',
        strokeHints: ['Nét 1: Nét đứng', 'Nét 2: Nét zic-zac kéo sang vểnh cong đuôi'],
        examples: [
            { word: 'れきし', romaji: 'rekishi', meaning: 'Lịch sử' },
            { word: 'れんしゅう', romaji: 'renshuu', meaning: 'Luyện tập' },
            { word: 'れいぞうこ', romaji: 'reizouko', meaning: 'Tủ lạnh' }
        ]
    },
    'ro': {
        hira: 'ろ', kata: 'ロ', romaji: 'ro', row: 'ra', strokes: 1,
        mnemonic: 'Giống chữ る nhưng không có hạt ngọc (bị cướp Robbed).',
        strokeHints: ['Nét 1: Gạch ngang, chéo xuống rồi cong tròn không thắt nút'],
        examples: [
            { word: 'ろうそく', romaji: 'rousoku', meaning: 'Cây nến' },
            { word: 'ろく', romaji: 'roku', meaning: 'Số 6' },
            { word: 'ロボット', romaji: 'robotto', meaning: 'Người máy' }
        ]
    },

    // --- Hàng WA / N ---
    'wa': {
        hira: 'わ', kata: 'ワ', romaji: 'wa', row: 'wa', strokes: 2,
        mnemonic: 'Một con thiên nga White swan xinh đẹp.',
        strokeHints: ['Nét 1: Nét đứng', 'Nét 2: Nét zic-zac uốn tròn phồng to'],
        examples: [
            { word: 'わたし', romaji: 'watashi', meaning: 'Tôi' },
            { word: 'わかる', romaji: 'wakaru', meaning: 'Hiểu' },
            { word: 'わに', romaji: 'wani', meaning: 'Cá sấu' }
        ]
    },
    'wo': {
        hira: 'を', kata: 'ヲ', romaji: 'wo', row: 'wa', strokes: 3,
        mnemonic: 'Một người cổ vũ Whoa! Đang reo hò (Trợ từ O).',
        strokeHints: ['Nét 1: Gạch ngang', 'Nét 2: Nét chéo gập chữ C', 'Nét 3: Vòng cung cắt ngang'],
        examples: [
            { word: 'ほん を よむ', romaji: 'hon o yomu', meaning: 'Đọc sách' },
            { word: 'みず を のむ', romaji: 'mizu o nomu', meaning: 'Uống nước' }
        ]
    },
    'n': {
        hira: 'ん', kata: 'ン', romaji: 'n', row: 'wa', strokes: 1,
        mnemonic: 'Chữ n viết hoa uốn lượn phong cách thư pháp.',
        strokeHints: ['Nét 1: Chéo xuống rồi uốn cong vểnh lên như chữ n'],
        examples: [
            { word: 'おんがく', romaji: 'ongaku', meaning: 'Âm nhạc' },
            { word: 'てんき', romaji: 'tenki', meaning: 'Thời tiết' },
            { word: 'かんじ', romaji: 'kanji', meaning: 'Chữ Hán' }
        ]
    },

    // ==========================================
    // 2. DAKUON (ÂM ĐỤC) & HANDAKUON
    // ==========================================
    'ga': { hira: 'が', kata: 'ガ', romaji: 'ga', row: 'ga', strokes: 5, examples: [{ word: 'がくせい', romaji: 'gakusei', meaning: 'Học sinh' }] },
    'gi': { hira: 'ぎ', kata: 'ギ', romaji: 'gi', row: 'ga', strokes: 6, examples: [{ word: 'ぎんこう', romaji: 'ginkou', meaning: 'Ngân hàng' }] },
    'gu': { hira: 'ぐ', kata: 'グ', romaji: 'gu', row: 'ga', strokes: 3, examples: [{ word: 'ぐんじん', romaji: 'gunjin', meaning: 'Quân nhân' }] },
    'ge': { hira: 'げ', kata: 'ゲ', romaji: 'ge', row: 'ga', strokes: 5, examples: [{ word: 'げんき', romaji: 'genki', meaning: 'Khỏe mạnh' }] },
    'go': { hira: 'ご', kata: 'ゴ', romaji: 'go', row: 'ga', strokes: 4, examples: [{ word: 'ごはん', romaji: 'gohan', meaning: 'Cơm' }] },

    'za': { hira: 'ざ', kata: 'ザ', romaji: 'za', row: 'za', strokes: 5, examples: [{ word: 'ざっし', romaji: 'zasshi', meaning: 'Tạp chí' }] },
    'ji': { hira: 'じ', kata: 'ジ', romaji: 'ji', row: 'za', strokes: 3, examples: [{ word: 'じかん', romaji: 'jikan', meaning: 'Thời gian' }] },
    'zu': { hira: 'ず', kata: 'ズ', romaji: 'zu', row: 'za', strokes: 4, examples: [{ word: 'ちず', romaji: 'chizu', meaning: 'Bản đồ' }] },
    'ze': { hira: 'ぜ', kata: 'ゼ', romaji: 'ze', row: 'za', strokes: 5, examples: [{ word: 'ぜんぶ', romaji: 'zenbu', meaning: 'Tất cả' }] },
    'zo': { hira: 'ぞ', kata: 'ゾ', romaji: 'zo', row: 'za', strokes: 3, examples: [{ word: 'ぞう', romaji: 'zou', meaning: 'Con voi' }] },

    'da': { hira: 'だ', kata: 'ダ', romaji: 'da', row: 'da', strokes: 6, examples: [{ word: 'だいがく', romaji: 'daigaku', meaning: 'Đại học' }] },
    'dji': { hira: 'ぢ', kata: 'ヂ', romaji: 'dji', row: 'da', strokes: 4, examples: [{ word: 'はなぢ', romaji: 'hanaji', meaning: 'Chảy máu cam' }] },
    'dzu': { hira: 'づ', kata: 'ヅ', romaji: 'dzu', row: 'da', strokes: 3, examples: [{ word: 'つづく', romaji: 'tsuzuku', meaning: 'Tiếp tục' }] },
    'de': { hira: 'で', kata: 'デ', romaji: 'de', row: 'da', strokes: 3, examples: [{ word: 'でんしゃ', romaji: 'densha', meaning: 'Tàu điện' }] },
    'do': { hira: 'ど', kata: 'ド', romaji: 'do', row: 'da', strokes: 4, examples: [{ word: 'どこ', romaji: 'doko', meaning: 'Ở đâu' }] },

    'ba': { hira: 'ば', kata: 'バ', romaji: 'ba', row: 'ba', strokes: 5, examples: [{ word: 'ばしょ', romaji: 'basho', meaning: 'Địa điểm' }] },
    'bi': { hira: 'び', kata: 'ビ', romaji: 'bi', row: 'ba', strokes: 3, examples: [{ word: 'びょういん', romaji: 'byouin', meaning: 'Bệnh viện' }] },
    'bu': { hira: 'ぶ', kata: 'ブ', romaji: 'bu', row: 'ba', strokes: 6, examples: [{ word: 'ぶた', romaji: 'buta', meaning: 'Con heo' }] },
    'be': { hira: 'べ', kata: 'ベ', romaji: 'be', row: 'ba', strokes: 3, examples: [{ word: 'べんきょう', romaji: 'benkyou', meaning: 'Học tập' }] },
    'bo': { hira: 'ぼ', kata: 'ボ', romaji: 'bo', row: 'ba', strokes: 6, examples: [{ word: 'ぼうし', romaji: 'boushi', meaning: 'Cái mũ' }] },

    'pa': { hira: 'ぱ', kata: 'パ', romaji: 'pa', row: 'pa', strokes: 4, examples: [{ word: 'パン', romaji: 'pan', meaning: 'Bánh mì' }] },
    'pi': { hira: 'ぴ', kata: 'ピ', romaji: 'pi', row: 'pa', strokes: 2, examples: [{ word: 'ピアノ', romaji: 'piano', meaning: 'Đàn Piano' }] },
    'pu': { hira: 'ぷ', kata: 'プ', romaji: 'pu', row: 'pa', strokes: 5, examples: [{ word: 'プール', romaji: 'puuru', meaning: 'Bể bơi' }] },
    'pe': { hira: 'ぺ', kata: 'ペ', romaji: 'pe', row: 'pa', strokes: 2, examples: [{ word: 'ペン', romaji: 'pen', meaning: 'Cây bút' }] },
    'po': { hira: 'ぽ', kata: 'ポ', romaji: 'po', row: 'pa', strokes: 5, examples: [{ word: 'ポスト', romaji: 'posuto', meaning: 'Hòm thư' }] },

    // ==========================================
    // 3. YOON (ÂM GHÉP)
    // ==========================================
    'kya': { hira: 'きゃ', kata: 'キャ', romaji: 'kya', examples: [{ word: 'きゃく', romaji: 'kyaku', meaning: 'Khách hàng' }] },
    'kyu': { hira: 'きゅ', kata: 'キュ', romaji: 'kyu', examples: [{ word: 'きゅうり', romaji: 'kyuuri', meaning: 'Dưa leo' }] },
    'kyo': { hira: 'きょ', kata: 'キョ', romaji: 'kyo', examples: [{ word: 'きょうと', romaji: 'kyouto', meaning: 'Kyoto' }] },
    'sha': { hira: 'しゃ', kata: 'シャ', romaji: 'sha', examples: [{ word: 'しゃしん', romaji: 'shashin', meaning: 'Bức ảnh' }] },
    'shu': { hira: 'しゅ', kata: 'シュ', romaji: 'shu', examples: [{ word: 'しゅくだい', romaji: 'shukudai', meaning: 'Bài tập' }] },
    'sho': { hira: 'しょ', kata: 'ショ', romaji: 'sho', examples: [{ word: 'しょくどう', romaji: 'shokudou', meaning: 'Nhà ăn' }] },
    'cha': { hira: 'ちゃ', kata: 'チャ', romaji: 'cha', examples: [{ word: 'おちゃ', romaji: 'ocha', meaning: 'Trà' }] },
    'chu': { hira: 'ちゅ', kata: 'チュ', romaji: 'chu', examples: [{ word: 'ちゅうごく', romaji: 'chuugoku', meaning: 'Trung Quốc' }] },
    'cho': { hira: 'ちょ', kata: 'チョ', romaji: 'cho', examples: [{ word: 'ちょっと', romaji: 'chotto', meaning: 'Một chút' }] },
    'nya': { hira: 'にゃ', kata: 'ニャ', romaji: 'nya', examples: [{ word: 'にゃんこ', romaji: 'nyanko', meaning: 'Mèo con' }] },
    'nyu': { hira: 'にゅ', kata: 'ニュ', romaji: 'nyu', examples: [{ word: 'ぎゅうにゅう', romaji: 'gyuunyuu', meaning: 'Sữa bò' }] },
    'nyo': { hira: 'にょ', kata: 'ニョ', romaji: 'nyo', examples: [{ word: 'にょうぼう', romaji: 'nyoubou', meaning: 'Vợ' }] },
    'hya': { hira: 'ひゃ', kata: 'ヒャ', romaji: 'hya', examples: [{ word: 'ひゃく', romaji: 'hyaku', meaning: 'Số 100' }] },
    'hyu': { hira: 'ひゅ', kata: 'ヒュ', romaji: 'hyu', examples: [{ word: 'ひゅうひゅう', romaji: 'hyuuhyuu', meaning: 'Gió rít' }] },
    'hyo': { hira: 'ひょ', kata: 'ヒョ', romaji: 'hyo', examples: [{ word: 'ひょう', romaji: 'hyou', meaning: 'Bảng biểu' }] },
    'mya': { hira: 'みゃ', kata: 'ミャ', romaji: 'mya', examples: [{ word: 'みゃく', romaji: 'myaku', meaning: 'Mạch máu' }] },
    'myu': { hira: 'みゅ', kata: 'ミュ', romaji: 'myu', examples: [{ word: 'ミュージカル', romaji: 'myuujikaru', meaning: 'Nhạc kịch' }] },
    'myo': { hira: 'みょ', kata: 'ミョ', romaji: 'myo', examples: [{ word: 'みょうじ', romaji: 'myouji', meaning: 'Họ (tên họ)' }] },
    'rya': { hira: 'りゃ', kata: 'リャ', romaji: 'rya', examples: [{ word: 'りゃく', romaji: 'ryaku', meaning: 'Viết tắt' }] },
    'ryu': { hira: 'りゅ', kata: 'リュ', romaji: 'ryu', examples: [{ word: 'りゅうがく', romaji: 'ryuugaku', meaning: 'Du học' }] },
    'ryo': { hira: 'りょ', kata: 'リョ', romaji: 'ryo', examples: [{ word: 'りょこう', romaji: 'ryokou', meaning: 'Du lịch' }] },
    'gya': { hira: 'ぎゃ', kata: 'ギャ', romaji: 'gya', examples: [{ word: 'ギャグ', romaji: 'gyagu', meaning: 'Trò đùa' }] },
    'gyu': { hira: 'ぎゅ', kata: 'ギュ', romaji: 'gyu', examples: [{ word: 'ぎゅうにく', romaji: 'gyuuniku', meaning: 'Thịt bò' }] },
    'gyo': { hira: 'ぎょ', kata: 'ギョ', romaji: 'gyo', examples: [{ word: 'ぎょうざ', romaji: 'gyouza', meaning: 'Bánh sủi cảo' }] },
    'ja':  { hira: 'じゃ', kata: 'ジャ', romaji: 'ja',  examples: [{ word: 'じゃま', romaji: 'jama', meaning: 'Làm phiền' }] },
    'ju':  { hira: 'じゅ', kata: 'ジュ', romaji: 'ju',  examples: [{ word: 'じゅぎょう', romaji: 'jugyou', meaning: 'Tiết học' }] },
    'jo':  { hira: 'じょ', kata: 'ジョ', romaji: 'jo',  examples: [{ word: 'じょせい', romaji: 'josei', meaning: 'Phụ nữ' }] },
    'bya': { hira: 'びゃ', kata: 'ビャ', romaji: 'bya', examples: [{ word: 'びゃくや', romaji: 'byakuya', meaning: 'Đêm trắng' }] },
    'byu': { hira: 'びゅ', kata: 'ビュ', romaji: 'byu', examples: [{ word: 'ビュー', romaji: 'byuu', meaning: 'Khung cảnh' }] },
    'byo': { hira: 'びょ', kata: 'ビョ', romaji: 'byo', examples: [{ word: 'びょうき', romaji: 'byouki', meaning: 'Bệnh tật' }] },
    'pya': { hira: 'ぴゃ', kata: 'ピャ', romaji: 'pya', examples: [{ word: 'ろっぴゃく', romaji: 'roppyaku', meaning: 'Số 600' }] },
    'pyu': { hira: 'ぴゅ', kata: 'ピュ', romaji: 'pyu', examples: [{ word: 'ピューマ', romaji: 'pyuuma', meaning: 'Báo sư tử' }] },
    'pyo': { hira: 'ぴょ', kata: 'ピョ', romaji: 'pyo', examples: [{ word: 'はっぴょう', romaji: 'happyou', meaning: 'Phát biểu' }] },
};

// Helper: Get all characters for a specific syllabary and category
export const getKanaList = (type = 'hiragana', category = 'main') => {
    let keys = [];
    if (category === 'main') {
        KANA_ROWS.forEach(r => {
            r.vowels.forEach(v => {
                if (v && KANA_DICTIONARY[v]) keys.push(v);
            });
        });
    } else if (category === 'dakuon') {
        DAKUON_ROWS.forEach(r => {
            r.vowels.forEach(v => {
                if (v && KANA_DICTIONARY[v]) keys.push(v);
            });
        });
    } else if (category === 'yoon') {
        YOON_GROUPS.forEach(g => {
            g.romajis.forEach(r => {
                if (r && KANA_DICTIONARY[r]) keys.push(r);
            });
        });
    }

    return keys.map(key => {
        const item = KANA_DICTIONARY[key];
        return {
            id: key,
            char: type === 'hiragana' ? item.hira : item.kata,
            otherChar: type === 'hiragana' ? item.kata : item.hira,
            romaji: item.romaji,
            type,
            category,
            strokes: item.strokes,
            mnemonic: item.mnemonic,
            strokeHints: item.strokeHints || [],
            examples: item.examples || []
        };
    });
};
