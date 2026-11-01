/**
 * Stage 3: N5 Hoàn Thành (Minna no Nihongo Bài 13 - 25 & Thể Động Từ Cốt Lõi)
 */
export const STAGE_3_MINNA_13_25 = {
    stage: 3,
    id: 'ja_stage_3',
    title: 'Chặng 3: N5 Hoàn Thành (Minna 13-25 & Thể Động Từ)',
    sub: 'Thể Te, thể Nai, thể Ta, thể thông thường, mệnh đề định ngữ & cho nhận.',
    icon: '🌿',
    color: 'emerald',
    lessons: [
        {
            id: 'ja_s3_l1',
            title: 'Minna 13-14: Mong Muốn & Động Từ Thể Te',
            shortTitle: '〜たい・〜てください',
            desc: 'Bày tỏ mong muốn cá nhân (〜たいです) và biến đổi thể Te: yêu cầu lịch sự (〜てください), hành động đang tiếp diễn (〜ています).',
            icon: '🙏',
            xp: 30,
            items: {
                vocab: [
                    { word: '欲しい', reading: 'ほしい', meaning: 'Muốn có (vật)' },
                    { word: '遊びます', reading: 'あそびます', meaning: 'Đi chơi / Giải trí' },
                    { word: '待ちます', reading: 'まちます', meaning: 'Chờ đợi' },
                    { word: '急ぎます', reading: 'いそぎます', meaning: 'Khẩn trương / Vội vã' },
                    { word: '止めます', reading: 'とめます', meaning: 'Dừng lại / Đỗ xe' },
                    { word: '雨', reading: 'あめ', meaning: 'Cơn mưa' }
                ],
                kanji: [
                    { character: '待', sinoViet: 'ĐÃI', meaning: 'Chờ đợi', onyomi: 'TAI', kunyomi: 'ma-tsu' },
                    { character: '急', sinoViet: 'CẤP', meaning: 'Vội, khẩn cấp', onyomi: 'KYUU', kunyomi: 'iso-gu' },
                    { character: '止', sinoViet: 'CHỈ', meaning: 'Dừng lại', onyomi: 'SHI', kunyomi: 'to-maru, to-meru' },
                    { character: '雨', sinoViet: 'VŨ', meaning: 'Mưa', onyomi: 'U', kunyomi: 'ame' },
                    { character: '車', sinoViet: 'XA', meaning: 'Xe hơi', onyomi: 'SHA', kunyomi: 'kuruma' },
                    { character: '電', sinoViet: 'ĐIỆN', meaning: 'Điện lực', onyomi: 'DEN', kunyomi: '' },
                    { character: '話', sinoViet: 'THOẠI', meaning: 'Nói chuyện', onyomi: 'WA', kunyomi: 'hana-su, hanashi' }
                ],
                grammar: [
                    { id: 'n5_tai_desu', pattern: 'Vます(bỏ ます) + たいです', meaning: 'Muốn làm V', meaningShort: 'Mong muốn' },
                    { id: 'n5_te_kudasai', pattern: 'Vて + ください', meaning: 'Xin vui lòng hãy làm V', meaningShort: 'Yêu cầu lịch sự' },
                    { id: 'n5_te_imasu', pattern: 'Vて + います', meaning: 'Đang làm V', meaningShort: 'Hành động tiếp diễn' }
                ]
            },
            questions: [
                {
                    type: 'choice',
                    prompt: 'Câu "ちょっと待ってください" có nghĩa là gì?',
                    character: 'ちょっと待ってください',
                    reading: 'chotto matte kudasai',
                    audio: 'ちょっとまってください',
                    options: ['Xin vui lòng đợi một chút', 'Xin mời vào', 'Xin cảm ơn rất nhiều', 'Đừng đi mà'],
                    correctIndex: 0,
                    explanation: 'ちょっと (một chút) + 待って (thể Te của 待つ - đợi) + ください (xin vui lòng).'
                },
                {
                    type: 'matching',
                    prompt: 'Nối động từ thể từ điển sang thể Te:',
                    pairs: [
                        { left: '食べる (taberu)', right: '食べて (tabete)' },
                        { left: '行く (iku)', right: '行って (itte)' },
                        { left: '飲む (nomu)', right: '飲んで (nonde)' },
                        { left: 'する (suru)', right: 'して (shite)' }
                    ]
                },
                {
                    type: 'choice',
                    prompt: 'Muốn nói "Tôi muốn uống nước", câu chuẩn là:',
                    character: '水を飲みたいです',
                    reading: 'mizu o nomitai desu',
                    audio: 'みずをのみたいです',
                    options: ['水を飲みたいです', '水を飲みます', '水を飲んでください', '水を飲みました'],
                    correctIndex: 0,
                    explanation: 'Động từ 飲みます bỏ ます thêm たいです = 飲みたいです (Muốn uống).'
                }
            ]
        },
        {
            id: 'ja_s3_l2',
            title: 'Minna 15-16: Xin Phép, Cấm Chỉ & Chuỗi Hành Động',
            shortTitle: '〜てもいい・〜てから',
            desc: 'Mẫu câu xin phép (〜てもいいですか), cấm chỉ (〜てはいけません) và chuỗi hành động theo thứ tự thời gian (V1てから, V2).',
            icon: '⛔',
            xp: 30,
            items: {
                vocab: [
                    { word: '座ります', reading: 'すわります', meaning: 'Ngồi xuống' },
                    { word: '入ります', reading: 'はいります', meaning: 'Bước vào' },
                    { word: '吸います', reading: 'すいます', meaning: 'Hút (thuốc lá)' },
                    { word: '浴びます', reading: 'あびます', meaning: 'Tắm (dưới vòi sen)' },
                    { word: '出します', reading: 'だします', meaning: 'Nộp (bài), gửi (thư), lấy ra' }
                ],
                kanji: [
                    { character: '入', sinoViet: 'NHẬP', meaning: 'Vào, nhập', onyomi: 'NYUU', kunyomi: 'hai-ru, i-reru' },
                    { character: '出', sinoViet: 'XUẤT', meaning: 'Ra, xuất', onyomi: 'SHUTSU', kunyomi: 'de-ru, da-su' },
                    { character: '立', sinoViet: 'LẬP', meaning: 'Đứng lên', onyomi: 'RITSU', kunyomi: 'ta-tsu' },
                    { character: '座', sinoViet: 'TỌA', meaning: 'Ngồi', onyomi: 'ZA', kunyomi: 'suwa-ru' },
                    { character: '読', sinoViet: 'ĐỘC', meaning: 'Đọc sách', onyomi: 'DOKU', kunyomi: 'yo-mu' },
                    { character: '書', sinoViet: 'THƯ', meaning: 'Viết, cuốn sách', onyomi: 'SHO', kunyomi: 'ka-ku' }
                ],
                grammar: [
                    { id: 'n5_te_mo_ii', pattern: 'Vて + もいいですか', meaning: 'Làm V có được không? (Xin phép)', meaningShort: 'Xin phép' },
                    { id: 'n5_te_wa_ikemasen', pattern: 'Vて + はいけません', meaning: 'Không được làm V (Cấm đoán)', meaningShort: 'Cấm chỉ' },
                    { id: 'n5_te_kara', pattern: 'V1て + から, V2', meaning: 'Sau khi làm V1 thì làm V2', meaningShort: 'Thứ tự hành động' }
                ]
            },
            questions: [
                {
                    type: 'choice',
                    prompt: '"ここでタバコを吸ってはいけません" có nghĩa là gì?',
                    character: 'ここでタバコを吸ってはいけません',
                    reading: 'koko de tabako o sutte wa ikemasen',
                    audio: 'ここでたばこをすってはいけません',
                    options: ['Không được hút thuốc ở đây', 'Ở đây có bán thuốc lá', 'Xin vui lòng hút thuốc ở đây', 'Tôi không hút thuốc'],
                    correctIndex: 0,
                    explanation: 'Vて + はいけません biểu thị điều cấm đoán không được làm.'
                },
                {
                    type: 'choice',
                    prompt: 'Cấu trúc "〜てもいいですか" dùng trong trường hợp nào?',
                    character: '写真を撮ってもいいですか',
                    reading: 'shashin o totte mo ii desu ka',
                    audio: 'しゃしんをとってもいいですか',
                    options: ['Xin phép làm gì đó (Tôi chụp ảnh có được không?)', 'Bắt buộc người khác phải làm', 'Khuyên người khác không nên làm', 'Cảm ơn đối phương'],
                    correctIndex: 0,
                    explanation: 'Thể Te + もいいですか dùng để xin phép đối phương một cách lịch sự.'
                },
                {
                    type: 'matching',
                    prompt: 'Nối Kanji hành động đối lập:',
                    pairs: [
                        { left: '入る (はい・る - Vào)', right: '出る (で・る - Ra)' },
                        { left: '立つ (た・つ - Đứng)', right: '座る (すわ・る - Ngồi)' },
                        { left: '読む (よ・む - Đọc)', right: '書く (か・く - Viết)' },
                        { left: '行く (い・く - Đi)', right: '来る (く・る - Đến)' }
                    ]
                }
            ]
        },
        {
            id: 'ja_s3_l3',
            title: 'Minna 17-18: Thể Nai, Bắt Buộc & Thể Khả Năng Cơ Bản',
            shortTitle: '〜ないで・〜なければ・〜こと',
            desc: 'Chia động từ thể Nai, mẫu câu xin đừng (〜ないでください), bắt buộc (〜なければなりません) và khả năng làm gì (〜ことができます).',
            icon: '🗝️',
            xp: 30,
            items: {
                vocab: [
                    { word: '忘れます', reading: 'わすれます', meaning: 'Quên' },
                    { word: 'なくします', reading: 'なくします', meaning: 'Làm mất, đánh rơi' },
                    { word: '心配します', reading: 'しんぱいします', meaning: 'Lo lắng' },
                    { word: '運転', reading: 'うんてん', meaning: 'Lái xe' },
                    { word: '泳ぎます', reading: 'およぎます', meaning: 'Bơi lội' },
                    { word: 'ピアノ', reading: 'ピアノ', meaning: 'Đàn Piano' }
                ],
                kanji: [
                    { character: '聞', sinoViet: 'VĂN', meaning: 'Nghe, hỏi', onyomi: 'BUN, MON', kunyomi: 'ki-ku' },
                    { character: '見', sinoViet: 'KIẾN', meaning: 'Nhìn, xem', onyomi: 'KEN', kunyomi: 'mi-ru' },
                    { character: '言', sinoViet: 'NGÔN', meaning: 'Nói', onyomi: 'GEN, GON', kunyomi: 'i-u, koto' },
                    { character: '語', sinoViet: 'NGỮ', meaning: 'Ngôn ngữ', onyomi: 'GO', kunyomi: 'kata-ru' },
                    { character: '買', sinoViet: 'MÃI', meaning: 'Mua hàng', onyomi: 'BAI', kunyomi: 'ka-u' }
                ],
                grammar: [
                    { id: 'n5_naide_kudasai', pattern: 'Vない + でください', meaning: 'Xin đừng làm V', meaningShort: 'Yêu cầu không làm' },
                    { id: 'n5_nakereba_narimasen', pattern: 'Vなければ + なりません', meaning: 'Phải làm V (Nghĩa vụ)', meaningShort: 'Bắt buộc' },
                    { id: 'n5_koto_ga_dekiru', pattern: 'V(từ điển) + ことができます', meaning: 'Có thể làm V (Khả năng)', meaningShort: 'Có thể làm' }
                ]
            },
            questions: [
                {
                    type: 'choice',
                    prompt: 'Thể ない của động từ "行きます" (ikimasu) là gì?',
                    character: '行かない',
                    reading: 'ikanai',
                    audio: 'いかない',
                    options: ['行かない (ikanai)', '行きない (ikinai)', '行けない (ikenai)', '行かなくて (ikanakute)'],
                    correctIndex: 0,
                    explanation: 'Động từ nhóm 1: đổi âm "i" sang âm "a" rồi thêm ない -> 行く -> 行かない.'
                },
                {
                    type: 'choice',
                    prompt: '"薬を飲まなければなりません" nghĩa là gì?',
                    character: '薬を飲まなければなりません',
                    reading: 'kusuri o nomanakereba narimasen',
                    audio: 'くすりをのまなければなりません',
                    options: ['Tôi phải uống thuốc', 'Tôi không được uống thuốc', 'Tôi muốn uống thuốc', 'Tôi đã uống thuốc rồi'],
                    correctIndex: 0,
                    explanation: '〜なければなりません biểu thị nghĩa vụ "bắt buộc phải làm gì".'
                },
                {
                    type: 'audio_choice',
                    prompt: 'Nghe câu sau và chọn năng khiếu tương ứng:',
                    character: 'ピアノを弾くことができます',
                    reading: 'piano o hiku koto ga dekimasu',
                    audio: 'ぴあのをひくことができます',
                    options: ['Có thể chơi đàn Piano', 'Có thể bơi lội', 'Có thể lái xe', 'Có thể nấu ăn'],
                    correctIndex: 0,
                    explanation: 'ピアノを弾く (chơi đàn piano) + ことができます (có thể làm).'
                }
            ]
        },
        {
            id: 'ja_s3_l4',
            title: 'Minna 19-20: Thể Ta & Thể Thông Thường',
            shortTitle: '〜たことがある・普通形',
            desc: 'Nói về trải nghiệm (〜たことがあります), liệt kê hành động tiêu biểu (〜たり〜たり) và làm chủ thể thông thường (普通形).',
            icon: '💬',
            xp: 30,
            items: {
                vocab: [
                    { word: '登ります', reading: 'のぼります', meaning: 'Leo (núi), trèo' },
                    { word: '泊まります', reading: 'とまります', meaning: 'Trọ lại / Nghỉ tại khách sạn' },
                    { word: '掃除します', reading: 'そうじします', meaning: 'Dọn dẹp, quét dọn' },
                    { word: '洗濯します', reading: 'せんたくします', meaning: 'Giặt giũ quần áo' },
                    { word: 'だめ', reading: 'だめ', meaning: 'Không được / Hỏng' }
                ],
                kanji: [
                    { character: '山', sinoViet: 'SƠN', meaning: 'Núi non', onyomi: 'SAN', kunyomi: 'yama' },
                    { character: '川', sinoViet: 'XUYÊN', meaning: 'Sông ngòi', onyomi: 'SEN', kunyomi: 'kawa' },
                    { character: '海', sinoViet: 'HẢI', meaning: 'Biển cả', onyomi: 'KAI', kunyomi: 'umi' },
                    { character: '天', sinoViet: 'THIÊN', meaning: 'Trời, bầu trời', onyomi: 'TEN', kunyomi: 'ama' },
                    { character: '気', sinoViet: 'KHÍ', meaning: 'Không khí, tinh thần', onyomi: 'KI, KE', kunyomi: '' }
                ],
                grammar: [
                    { id: 'n5_ta_koto_ga_aru', pattern: 'Vた + ことがあります', meaning: 'Đã từng làm V (Trải nghiệm)', meaningShort: 'Đã từng' },
                    { id: 'n5_tari_tari', pattern: 'V1たり, V2たり します', meaning: 'Lúc thì làm V1, lúc thì làm V2', meaningShort: 'Liệt kê hành động' },
                    { id: 'n5_futsuukei', pattern: 'Thể thông thường (普通形)', meaning: 'Nói chuyện suồng sã, thân mật trong giao tiếp', meaningShort: 'Thể thông thường' }
                ]
            },
            questions: [
                {
                    type: 'choice',
                    prompt: '"富士山に登ったことがあります" nghĩa là gì?',
                    character: '富士山に登ったことがあります',
                    reading: 'fujisan ni nobotta koto ga arimasu',
                    audio: 'ふじさんにのぼったことがあります',
                    options: ['Tôi đã từng leo núi Phú Sĩ', 'Tôi đang leo núi Phú Sĩ', 'Tôi muốn leo núi Phú Sĩ', 'Tôi chưa từng leo núi Phú Sĩ'],
                    correctIndex: 0,
                    explanation: 'Vた + ことがあります biểu thị trải nghiệm trong quá khứ: "Đã từng làm gì".'
                },
                {
                    type: 'matching',
                    prompt: 'Nối thể lịch sự (丁寧語) sang thể thông thường (普通形):',
                    pairs: [
                        { left: '行きます (ikimasu)', right: '行く (iku)' },
                        { left: '行きません (ikimasen)', right: '行かない (ikanai)' },
                        { left: '行きました (ikimashita)', right: '行った (itta)' },
                        { left: '行きませんでした', right: '行かなかった' }
                    ]
                },
                {
                    type: 'choice',
                    prompt: 'Khi nói về ngày nghỉ làm những việc tiêu biểu, câu đúng là:',
                    character: '掃除したり、洗濯したりしました',
                    reading: 'souji shitari sentaku shitari shimashita',
                    audio: 'そうじしたりせんたくしたりしました',
                    options: ['掃除したり、洗濯したりしました', '掃除して、洗濯しました', '掃除と洗濯です', '掃除する、洗濯する'],
                    correctIndex: 0,
                    explanation: 'Cấu trúc 〜たり〜たりします dùng để liệt kê một vài hành động tiêu biểu.'
                }
            ]
        },
        {
            id: 'ja_s3_l5',
            title: 'Minna 21-22: Ý Kiến Phỏng Đoán & Mệnh Đề Bổ Nghĩa',
            shortTitle: '〜と思います・Định ngữ',
            desc: 'Bày tỏ quan điểm (〜と思います), trích dẫn lời nói (〜と言いました) và cách dùng cả một câu làm bổ ngữ cho danh từ.',
            icon: '💡',
            xp: 30,
            items: {
                vocab: [
                    { word: '思います', reading: 'おもいます', meaning: 'Nghĩ rằng / Cho rằng' },
                    { word: '言います', reading: 'いいます', meaning: 'Nói rằng' },
                    { word: '勝ちます', reading: 'かちます', meaning: 'Thắng lợi' },
                    { word: '負けます', reading: 'まけます', meaning: 'Thua cuộc' },
                    { word: '約束', reading: 'やくそく', meaning: 'Lời hứa / Cuộc hẹn' },
                    { word: '服', reading: 'ふく', meaning: 'Quần áo' }
                ],
                kanji: [
                    { character: '思', sinoViet: 'TƯ', meaning: 'Suy nghĩ, nhớ', onyomi: 'SHI', kunyomi: 'omo-u' },
                    { character: '会', sinoViet: 'HỘI', meaning: 'Gặp gỡ, cuộc họp', onyomi: 'KAI, E', kunyomi: 'a-u' },
                    { character: '社', sinoViet: 'XÃ', meaning: 'Xã hội, công ty', onyomi: 'SHA', kunyomi: 'yashiro' },
                    { character: '店', sinoViet: 'ĐIẾM', meaning: 'Cửa tiệm, cửa hàng', onyomi: 'TEN', kunyomi: 'mise' },
                    { character: '道', sinoViet: 'ĐẠO', meaning: 'Con đường, đạo lí', onyomi: 'DOU, TOU', kunyomi: 'michi' }
                ],
                grammar: [
                    { id: 'n5_to_omou', pattern: 'Thể thông thường + と 思います', meaning: 'Tôi nghĩ rằng...', meaningShort: 'Ý kiến cá nhân' },
                    { id: 'n5_to_itta', pattern: 'Thể thông thường + と 言いました', meaning: 'Đã nói rằng...', meaningShort: 'Trích dẫn' },
                    { id: 'n5_clause_noun', pattern: '[Mệnh đề thể thông thường] + Danh từ', meaning: 'Danh từ mà...', meaningShort: 'Mệnh đề định ngữ' }
                ]
            },
            questions: [
                {
                    type: 'choice',
                    prompt: '"明日雨が降ると思います" có nghĩa là gì?',
                    character: '明日雨が降ると思います',
                    reading: 'ashita ame ga furu to omoimasu',
                    audio: 'あしたあめがふるとおもいます',
                    options: ['Tôi nghĩ rằng ngày mai trời sẽ mưa', 'Ngày mai chắc chắn trời sẽ nắng', 'Tôi thích trời mưa ngày mai', 'Ngày mai đừng mưa nhé'],
                    correctIndex: 0,
                    explanation: 'Thể thông thường + と思います dùng để nêu ý kiến, phỏng đoán của bản thân.'
                },
                {
                    type: 'choice',
                    prompt: 'Cụm từ "母が作ったケーキ" có nghĩa là gì?',
                    character: '母が作ったケーキ',
                    reading: 'haha ga tsukutta keeki',
                    audio: 'ははがつくったけーき',
                    options: ['Chiếc bánh kem mà mẹ tôi đã làm', 'Mẹ tôi đang làm bánh kem', 'Mẹ tôi thích bánh kem', 'Tôi làm bánh kem tặng mẹ'],
                    correctIndex: 0,
                    explanation: 'Mệnh đề định ngữ: [母が作った] bổ nghĩa cho danh từ [ケーキ] -> Bánh kem mà mẹ đã làm.'
                },
                {
                    type: 'matching',
                    prompt: 'Nối các từ vựng Minna 21-22:',
                    pairs: [
                        { left: '約束 (やくそく)', right: 'Lời hứa / Cuộc hẹn' },
                        { left: '勝つ (かつ)', right: 'Chiến thắng' },
                        { left: '負ける (まける)', right: 'Thua cuộc' },
                        { left: '意見 (いけん)', right: 'Ý kiến' }
                    ]
                }
            ]
        },
        {
            id: 'ja_s3_l6',
            title: 'Minna 23-25: Khi Nào, Cho Nhận & Điều Kiện Giả Định',
            shortTitle: '〜とき・〜てくれる・〜たら',
            desc: 'Mẫu câu thời điểm (〜とき), thể cho nhận hành động (〜てくれます / 〜てあげます) và câu điều kiện giả định (〜たら / 〜ても).',
            icon: '🎁',
            xp: 30,
            items: {
                vocab: [
                    { word: '聞きます', reading: 'ききます', meaning: 'Nghe / Hỏi ai đó' },
                    { word: '渡ります', reading: 'わたります', meaning: 'Băng qua (đường, cầu)' },
                    { word: '曲がります', reading: 'まがります', meaning: 'Rẽ, quẹo (trái, phải)' },
                    { word: 'くれます', reading: 'くれます', meaning: 'Cho, tặng (cho tôi hoặc người thân của tôi)' },
                    { word: '直します', reading: 'なおします', meaning: 'Sửa chữa, đính chính' },
                    { word: '連れて行きます', reading: 'つれていきます', meaning: 'Dẫn đi, đưa đi cùng' }
                ],
                kanji: [
                    { character: '歩', sinoViet: 'BỘ', meaning: 'Đi bộ', onyomi: 'HO, BU', kunyomi: 'aru-ku, ayu-mu' },
                    { character: '走', sinoViet: 'TẨU', meaning: 'Chạy', onyomi: 'SOU', kunyomi: 'hasi-ru' },
                    { character: '売', sinoViet: 'MẠI', meaning: 'Bán hàng', onyomi: 'BAI', kunyomi: 'u-ru' },
                    { character: '物', sinoViet: 'VẬT', meaning: 'Đồ vật, sinh vật', onyomi: 'BUTSU, MOTSU', kunyomi: 'mono' }
                ],
                grammar: [
                    { id: 'n5_toki', pattern: 'V(từ điển) / Vた + とき', meaning: 'Khi... / Lúc...', meaningShort: 'Thời điểm' },
                    { id: 'n5_te_kureru', pattern: 'Người khác が 私に Vて + くれます', meaning: 'Ai đó làm V giúp cho tôi', meaningShort: 'Làm giúp cho tôi' },
                    { id: 'n5_tara', pattern: 'Vたら / Aかったら', meaning: 'Nếu... / Sau khi... thì...', meaningShort: 'Điều kiện giả định' }
                ]
            },
            questions: [
                {
                    type: 'choice',
                    prompt: '"時間がなかったら、テレビを見ません" nghĩa là gì?',
                    character: '時間がなかったら、テレビを見ません',
                    reading: 'jikan ga nakattara terebi o mimasen',
                    audio: 'じかんがなかったらてれびをみません',
                    options: ['Nếu không có thời gian thì tôi sẽ không xem tivi', 'Vì có nhiều thời gian nên tôi xem tivi', 'Mỗi khi rảnh rỗi tôi xem tivi', 'Tôi vừa xem tivi vừa học bài'],
                    correctIndex: 0,
                    explanation: '〜たら biểu thị giả định: "Nếu không có thời gian...".'
                },
                {
                    type: 'choice',
                    prompt: '"友達が自転車を直してくれました" biểu thị điều gì?',
                    character: '友達が自転車を直してくれました',
                    reading: 'tomodachi ga jitensha o naoshite kuremashita',
                    audio: 'ともだちがじてんしゃをなおしてくれました',
                    options: ['Bạn tôi đã sửa xe đạp giúp tôi (với lòng biết ơn)', 'Tôi đã sửa xe đạp cho bạn tôi', 'Bạn tôi nhờ tôi sửa xe đạp', 'Xe đạp của tôi bị hỏng'],
                    correctIndex: 0,
                    explanation: '〜てくれました là ai đó làm điều gì đó tốt đẹp cho bản thân mình.'
                },
                {
                    type: 'matching',
                    prompt: 'Nối các chỉ dẫn phương hướng giao thông N5:',
                    pairs: [
                        { left: '右へ曲がります', right: 'Rẽ về bên phải' },
                        { left: '左へ曲がります', right: 'Rẽ về bên trái' },
                        { left: '道を渡ります', right: 'Băng qua đường' },
                        { left: 'まっすぐ行きます', right: 'Đi thẳng' }
                    ]
                }
            ]
        },
        {
            id: 'ja_s3_l7',
            title: 'Thử Thách Chặng 3: Tốt Nghiệp Toàn Bộ Minna N5 (Bài 13 - 25)',
            shortTitle: 'Vượt ải Chặng 3 👑',
            desc: 'Vượt qua chặng kiểm tra tổng lực N5, làm chủ toàn bộ 25 bài Minna no Nihongo để tự tin chinh phục chứng chỉ JLPT N5!',
            icon: '👑',
            xp: 50,
            isMilestone: true,
            items: {
                vocab: [
                    { word: '準備', reading: 'じゅんび', meaning: 'Chuẩn bị' },
                    { word: '案内', reading: 'あんない', meaning: 'Hướng dẫn / Dẫn đường' },
                    { word: '説明', reading: 'せつめい', meaning: 'Giải thích / Thuyết minh' }
                ],
                kanji: [
                    { character: '国', sinoViet: 'QUỐC', meaning: 'Đất nước', onyomi: 'KOKU', kunyomi: 'kuni' },
                    { character: '外', sinoViet: 'NGOẠI', meaning: 'Bên ngoài', onyomi: 'GAI, GE', kunyomi: 'soto, hoka' },
                    { character: '英', sinoViet: 'ANH', meaning: 'Nước Anh, tài giỏi', onyomi: 'EI', kunyomi: '' },
                    { character: '花', sinoViet: 'HOA', meaning: 'Bông hoa', onyomi: 'KA', kunyomi: 'hana' }
                ],
                grammar: [
                    { id: 'n5_te_mo', pattern: 'Vても / Aくても', meaning: 'Dù có... thì vẫn...', meaningShort: 'Dù cho...' }
                ]
            },
            questions: [
                {
                    type: 'choice',
                    prompt: 'Chọn câu hoàn toàn đúng về mặt ngữ pháp tiếng Nhật:',
                    character: '日本へ行ったら、富士山に登りたいです',
                    reading: 'nihon e ittara fujisan ni noboritai desu',
                    audio: 'にほんへいったらふじさんにのぼりたいです',
                    options: ['日本へ行ったら、富士山に登りたいです (Nếu đến Nhật, tôi muốn leo núi Phú Sĩ)', '日本を行ったら、富士山が登るです', '日本にいくなら、富士山へ登りたいだ', '日本へ行くて、富士山を登るたい'],
                    correctIndex: 0,
                    explanation: '日本へ行ったら (Nếu đến Nhật) + 富士山に登りたいです (muốn leo núi Phú Sĩ).'
                },
                {
                    type: 'matching',
                    prompt: 'Nối các cấu trúc ngữ pháp then chốt N5:',
                    pairs: [
                        { left: '〜てください', right: 'Xin vui lòng hãy làm gì' },
                        { left: '〜てもいいです', right: 'Được phép làm gì' },
                        { left: '〜てはいけません', right: 'Không được phép làm gì' },
                        { left: '〜たことがある', right: 'Đã từng làm gì trong quá khứ' }
                    ]
                },
                {
                    type: 'audio_choice',
                    prompt: 'Nghe phát âm và chọn ý nghĩa chính xác:',
                    character: '雨が降っても、出かけます',
                    reading: 'ame ga futte mo dekakemasu',
                    audio: 'あめがふってもでかけます',
                    options: ['Cho dù trời mưa, tôi vẫn sẽ ra ngoài', 'Vì trời mưa nên tôi không ra ngoài', 'Nếu trời mưa tôi sẽ ở nhà', 'Trời sắp sửa mưa rồi'],
                    correctIndex: 0,
                    explanation: '〜ても biểu thị quan hệ nhượng bộ: "Cho dù... thì vẫn...".'
                }
            ]
        }
    ]
};

