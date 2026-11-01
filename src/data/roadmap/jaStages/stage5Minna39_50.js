/**
 * Stage 5: N4 Nâng Cao, Kính Ngữ & JLPT Master (Minna no Nihongo Bài 39 - 50)
 */
export const STAGE_5_MINNA_39_50 = {
    stage: 5,
    id: 'ja_stage_5',
    title: 'Chặng 5: N4 Nâng Cao, Kính Ngữ & JLPT Master (Minna 39-50)',
    sub: 'Nguyên nhân khách quan, phỏng đoán, sai khiến, kính ngữ giao tiếp & đại chung kết JLPT.',
    icon: '🏆',
    color: 'teal',
    lessons: [
        {
            id: 'ja_s5_l1',
            title: 'Minna 39-41: Nguyên Nhân Khách Quan & Cho Nhận Lịch Sự',
            shortTitle: '〜ので・〜かどうか・Kính ngữ cho nhận',
            desc: 'Chỉ nguyên nhân tự nhiên khách quan (〜ので), câu nghi vấn lồng ghép (〜かどうか) và thể cho nhận lịch sự bậc cao (〜ていただきます / 〜てくださいます).',
            icon: '🙇',
            xp: 40,
            items: {
                vocab: [
                    { word: '事故', reading: 'じこ', meaning: 'Sự cố / Tai nạn giao thông' },
                    { word: '地震', reading: 'じしん', meaning: 'Động đất' },
                    { word: '火事', reading: 'かじ', meaning: 'Hỏa hoạn / Cháy' },
                    { word: '複雑', reading: 'ふくざつ', meaning: 'Phức tạp (Tính từ đuôi な)' },
                    { word: '確かめます', reading: 'たしかめます', meaning: 'Kiểm tra / Xác nhận lại' },
                    { word: '届きます', reading: 'とどきます', meaning: 'Được chuyển đến (hàng hóa, bưu phẩm)' }
                ],
                kanji: [
                    { character: '験', sinoViet: 'NGHIỆM', meaning: 'Thí nghiệm, kiểm nghiệm', onyomi: 'KEN, GEN', kunyomi: '' },
                    { character: '試', sinoViet: 'THÍ', meaning: 'Thử nghiệm, kỳ thi', onyomi: 'SHI', kunyomi: 'tame-su' },
                    { character: '音', sinoViet: 'ÂM', meaning: 'Âm thanh', onyomi: 'ON, IN', kunyomi: 'oto, ne' },
                    { character: '楽', sinoViet: 'LẠC', meaning: 'Vui vẻ, âm nhạc', onyomi: 'GAKU, RAKU', kunyomi: 'tano-shii' },
                    { character: '歌', sinoViet: 'CA', meaning: 'Bài hát, ca hát', onyomi: 'KA', kunyomi: 'uta, uta-u' },
                    { character: '館', sinoViet: 'QUÁN', meaning: 'Tòa nhà, hội quán', onyomi: 'KAN', kunyomi: '' }
                ],
                grammar: [
                    { id: 'n4_node', pattern: 'Thể thông thường + ので', meaning: 'Vì... (Lý do khách quan, lịch sự hơn から)', meaningShort: 'Vì (khách quan)' },
                    { id: 'n4_ka_douka', pattern: 'Thể thông thường + か どうか', meaning: 'Liệu có... hay không (Nghi vấn lồng ghép)', meaningShort: 'Liệu có... hay không' },
                    { id: 'n4_te_itadakimasu', pattern: 'Vて + いただきます / くださいます', meaning: 'Được người có vị thế cao làm giúp / Người trên làm cho mình', meaningShort: 'Cho nhận kính ngữ' }
                ]
            },
            questions: [
                {
                    type: 'choice',
                    prompt: '"事故があったので、電車が遅れました" có nghĩa là gì?',
                    character: '事故があったので、電車が遅れました',
                    reading: 'jiko ga atta node densha ga okoremashita',
                    audio: 'じこがあったのででんしゃがおくれました',
                    options: ['Vì có tai nạn nên tàu điện bị muộn giờ', 'Tàu điện chạy nhanh nên không có tai nạn', 'Vì trời mưa nên tàu điện dừng lại', 'Tàu điện luôn đúng giờ'],
                    correctIndex: 0,
                    explanation: '〜ので biểu thị quan hệ nguyên nhân kết quả tự nhiên mang tính khách quan.'
                },
                {
                    type: 'choice',
                    prompt: 'Mẫu câu "本当かどうか、確かめます" nghĩa là gì?',
                    character: '本当かどうか、確かめます',
                    reading: 'hontou ka douka tashikamemasu',
                    audio: 'ほんとうかどうかたしかめます',
                    options: ['Tôi sẽ kiểm tra xem có đúng là thật hay không', 'Tôi chắc chắn đây là sự thật', 'Tôi không tin đây là sự thật', 'Hãy nói cho tôi biết sự thật'],
                    correctIndex: 0,
                    explanation: '〜かどうか = Liệu có... hay không (xác nhận tính xác thực).'
                },
                {
                    type: 'matching',
                    prompt: 'Nối các từ ngữ chỉ tai nạn và hiện tượng thiên nhiên:',
                    pairs: [
                        { left: '地震 (じしん)', right: 'Động đất' },
                        { left: '火事 (かじ)', right: 'Hỏa hoạn' },
                        { left: '台風 (たいふう)', right: 'Bão lớn' },
                        { left: '事故 (じこ)', right: 'Tai nạn' }
                    ]
                }
            ]
        },
        {
            id: 'ja_s5_l2',
            title: 'Minna 42-44: Mục Đích Vì Ai & Phỏng Đoán Thị Giác',
            shortTitle: '〜ために・〜そうです・〜すぎます',
            desc: 'Thực hiện hành động vì mục tiêu (〜ために), phỏng đoán qua mắt nhìn (〜そうです: Trông có vẻ...) và hành động quá mức (〜すぎます).',
            icon: '🎯',
            xp: 40,
            items: {
                vocab: [
                    { word: '貯金します', reading: 'ちょきんします', meaning: 'Tiết kiệm tiền' },
                    { word: '慣れます', reading: 'なれます', meaning: 'Quen với (công việc, khí hậu)' },
                    { word: '泣きます', reading: 'なきます', meaning: 'Khóc lóc' },
                    { word: '笑います', reading: 'わらいます', meaning: 'Cười tươi' },
                    { word: '倒れます', reading: 'たおれます', meaning: 'Ngã gục / Đổ sụp' }
                ],
                kanji: [
                    { character: '屋', sinoViet: 'ỐC', meaning: 'Căn nhà, cửa tiệm', onyomi: 'OKU', kunyomi: 'ya' },
                    { character: '堂', sinoViet: 'ĐƯỜNG', meaning: 'Đại sảnh, nhà ăn', onyomi: 'DOU', kunyomi: '' },
                    { character: '院', sinoViet: 'VIỆN', meaning: 'Bệnh viện, học viện', onyomi: 'IN', kunyomi: '' },
                    { character: '病', sinoViet: 'BỆNH', meaning: 'Bệnh tật', onyomi: 'BYOU', kunyomi: 'ya-mu' },
                    { character: '薬', sinoViet: 'DƯỢC', meaning: 'Thuốc men', onyomi: 'YAKU', kunyomi: 'kusuri' },
                    { character: '局', sinoViet: 'CỤC', meaning: 'Cục diện, bưu cục', onyomi: 'KYOKU', kunyomi: '' }
                ],
                grammar: [
                    { id: 'n4_tameni', pattern: 'V(từ điển) / Danh từ の + ために', meaning: 'Để / Vì mục đích gì (Có ý chí)', meaningShort: 'Để / Vì mục đích' },
                    { id: 'n4_sou_desu_look', pattern: 'Vます(bỏ ます) / A(い bỏ い) + そうです', meaning: 'Trông có vẻ... (Phỏng đoán qua vẻ bề ngoài)', meaningShort: 'Trông có vẻ' },
                    { id: 'n4_sugiru', pattern: 'Vます(bỏ ます) / A(bỏ い) + すぎます', meaning: 'Làm gì quá mức (Gây hậu quả xấu)', meaningShort: 'Quá mức...' }
                ]
            },
            questions: [
                {
                    type: 'choice',
                    prompt: '"この料理はおいしそうです" diễn tả điều gì?',
                    character: 'この料理はおいしそうです',
                    reading: 'kono ryouri wa oishisou desu',
                    audio: 'このりょうりはおいしそうです',
                    options: ['Món ăn này nhìn trông có vẻ ngon', 'Món ăn này tôi đã nếm thử rồi rất ngon', 'Món ăn này không ngon', 'Tôi nghe nói món này ngon'],
                    correctIndex: 0,
                    explanation: 'Tính từ おいしい bỏ い + そうです = Trông có vẻ ngon (chưa ăn thử, mới chỉ nhìn vẻ bề ngoài).'
                },
                {
                    type: 'choice',
                    prompt: 'Câu "昨日お酒を飲みすぎました" có nghĩa là gì?',
                    character: '昨日お酒を飲みすぎました',
                    reading: 'kinou osake o nomisugimashita',
                    audio: 'きのうおさけをのみすぎました',
                    options: ['Hôm qua tôi đã uống quá nhiều rượu (say xỉn/mệt mỏi)', 'Hôm qua tôi không uống rượu', 'Hôm qua tôi vừa uống rượu vừa ăn thịt', 'Rượu này rất ngon'],
                    correctIndex: 0,
                    explanation: 'Động từ 飲みます bỏ ます + すぎました = Uống quá nhiều (quá giới hạn chịu đựng).'
                },
                {
                    type: 'matching',
                    prompt: 'Nối các cụm từ mục đích và phỏng đoán:',
                    pairs: [
                        { left: '雨が降りそうです', right: 'Trời trông có vẻ sắp mưa' },
                        { left: '車を買うために貯金します', right: 'Tiết kiệm tiền để mua xe hơi' },
                        { left: '食べすぎました', right: 'Đã ăn quá nhiều' },
                        { left: '難しそうです', right: 'Trông có vẻ khó' }
                    ]
                }
            ]
        },
        {
            id: 'ja_s5_l3',
            title: 'Minna 45-47: Tình Huống Giả Định & Tiến Trình',
            shortTitle: '〜場合・〜ところ・〜そうです (nghe nói)',
            desc: 'Xử lý tình huống (〜場合は), thời điểm của hành động (〜ところです: sắp sửa / đang làm / vừa mới xong) và truyền đạt thông tin nghe nói.',
            icon: '📡',
            xp: 40,
            items: {
                vocab: [
                    { word: '失敗します', reading: 'しっぱいします', meaning: 'Thất bại' },
                    { word: '返事', reading: 'へんじ', meaning: 'Hồi đáp / Trả lời' },
                    { word: '向かいます', reading: 'むかいます', meaning: 'Hướng về phía' },
                    { word: '噂', reading: 'うわさ', meaning: 'Tin đồn' },
                    { word: '集まり', reading: 'あつまり', meaning: 'Cuộc tụ họp / Buổi gặp mặt' }
                ],
                kanji: [
                    { character: '特', sinoViet: 'ĐẶC', meaning: 'Đặc biệt', onyomi: 'TOKU', kunyomi: '' },
                    { character: '別', sinoViet: 'BIỆT', meaning: 'Phân biệt, chia tay', onyomi: 'BETSU', kunyomi: 'waka-reru' },
                    { character: '便', sinoViet: 'TIỆN', meaning: 'Thuận tiện, bưu phẩm', onyomi: 'BEN, BIN', kunyomi: 'tayo-ri' },
                    { character: '利', sinoViet: 'LỢI', meaning: 'Lợi ích, thuận lợi', onyomi: 'RI', kunyomi: 'ki-ku' },
                    { character: '不', sinoViet: 'BẤT', meaning: 'Không, bất an', onyomi: 'FU, BU', kunyomi: '' },
                    { character: '急', sinoViet: 'CẤP', meaning: 'Gấp gáp, khẩn cấp', onyomi: 'KYUU', kunyomi: 'iso-gu' }
                ],
                grammar: [
                    { id: 'n4_baai_wa', pattern: 'V / A / N の + 場合は', meaning: 'Trong trường hợp... / Nếu xảy ra tình huống...', meaningShort: 'Trong trường hợp' },
                    { id: 'n4_tokoro_desu', pattern: 'Vる / Vている / Vた + ところです', meaning: 'Sắp sửa / Đang trong lúc / Vừa mới hoàn thành xong', meaningShort: 'Thời điểm hành động' },
                    { id: 'n4_sou_desu_hearsay', pattern: 'Thể thông thường + そうです', meaning: 'Nghe nói rằng... (Truyền đạt lại tin tức)', meaningShort: 'Nghe nói là...' }
                ]
            },
            questions: [
                {
                    type: 'choice',
                    prompt: '"いまからごはんを食べるところです" biểu thị thời điểm nào?',
                    character: 'いまからごはんを食べるところです',
                    reading: 'ima kara gohan o taberu tokoro desu',
                    audio: 'いまからごはんをたべるところです',
                    options: ['Bây giờ tôi chuẩn bị/sắp sửa ăn cơm', 'Tôi đang ăn cơm dở', 'Tôi vừa mới ăn cơm xong', 'Tôi đã không ăn cơm'],
                    correctIndex: 0,
                    explanation: 'V thể từ điển + ところです = Chuẩn bị, sắp sửa bắt đầu làm hành động ngay bây giờ.'
                },
                {
                    type: 'choice',
                    prompt: 'Phân biệt "雨が降りそうです" và "雨が降るそうです":',
                    character: '雨が降るそうです',
                    reading: 'ame ga furu sou desu',
                    audio: 'あめがふるそうです',
                    options: ['降るそうです là "Nghe nói trời sẽ mưa" (thể thông thường + そうです truyền đạt tin)', '降るそうです là "Trời trông có vẻ mưa"', 'Cả hai câu giống hệt nhau', 'Không có câu nào đúng'],
                    correctIndex: 0,
                    explanation: 'Thể từ điển + そうです là NGHE NÓI (truyền đạt thông tin từ dự báo thời tiết).'
                },
                {
                    type: 'matching',
                    prompt: 'Nối 3 trạng thái của cấu trúc 〜ところです:',
                    pairs: [
                        { left: '食べるところ (V nguyên mẫu)', right: 'Chuẩn bị / Sắp sửa ăn' },
                        { left: '食べているところ (Vている)', right: 'Đang ăn giữa chừng' },
                        { left: '食べたところ (Vた)', right: 'Vừa mới ăn xong tức thì' },
                        { left: '食べたばかり (Vたばかり)', right: 'Vừa mới ăn cách đây không lâu' }
                    ]
                }
            ]
        },
        {
            id: 'ja_s5_l4',
            title: 'Minna 48-50: Thể Sai Khiến & Tuyệt Kỹ Kính Ngữ',
            shortTitle: 'Thể Sai khiến・Tôn kính・Khiêm nhường',
            desc: 'Cho phép/bắt buộc ai làm gì (使役動詞: 行かせる), Tôn Kính Ngữ (尊敬語 nâng đối phương) và Khiêm Nhường Ngữ (謙譲語 hạ mình).',
            icon: '👑',
            xp: 45,
            items: {
                vocab: [
                    { word: '伺います', reading: 'うかがいます', meaning: 'Đến thăm / Hỏi thăm (Khiêm nhường ngữ của 行く, 来る, 聞く)' },
                    { word: '参ります', reading: 'まいります', meaning: 'Đi / Đến (Khiêm nhường ngữ của 行く, 来る)' },
                    { word: '申します', reading: 'もうします', meaning: 'Tên là / Nói là (Khiêm nhường ngữ của 言う)' },
                    { word: 'いらっしゃいます', reading: 'いらっしゃいます', meaning: 'Ở / Đi / Đến (Tôn kính ngữ của いる, 行く, 来る)' },
                    { word: 'ご覧になります', reading: 'ごらんになります', meaning: 'Xem / Nhìn (Tôn kính ngữ của 見る)' }
                ],
                kanji: [
                    { character: '敬', sinoViet: 'KÍNH', meaning: 'Kính trọng', onyomi: 'KEI', kunyomi: 'uyama-u' },
                    { character: '謙', sinoViet: 'KHIÊM', meaning: 'Khiêm tốn', onyomi: 'KEN', kunyomi: 'heri-kudaru' },
                    { character: '礼', sinoViet: 'LỄ', meaning: 'Lễ phép, cảm ơn', onyomi: 'REI, RAI', kunyomi: '' },
                    { character: '拝', sinoViet: 'BÁI', meaning: 'Cúi đầu lạy, bái kiến', onyomi: 'HAI', kunyomi: 'oga-mu' },
                    { character: '謝', sinoViet: 'TẠ', meaning: 'Cảm tạ, tạ lỗi', onyomi: 'SHA', kunyomi: 'ayama-ru' },
                    { character: '祝', sinoViet: 'CHÚC', meaning: 'Chúc mừng', onyomi: 'SHUKU', kunyomi: 'iwa-u' }
                ],
                grammar: [
                    { id: 'n4_shiekikei', pattern: 'Động từ thể Sai Khiến (使役形: 食べさせる / 行かせる)', meaning: 'Bắt ai đó làm / Cho phép ai đó làm', meaningShort: 'Thể Sai Khiến' },
                    { id: 'n4_sonkeigo', pattern: 'Tôn Kính Ngữ: お/ご + Vます(bỏ ます) + になります', meaning: 'Kính trọng người đối diện / khách hàng / cấp trên', meaningShort: 'Tôn Kính Ngữ' },
                    { id: 'n4_kenjougo', pattern: 'Khiêm Nhường Ngữ: お/ご + Vます(bỏ ます) + します / いたす', meaning: 'Hạ mình khi nói về hành động của bản thân với người trên', meaningShort: 'Khiêm Nhường Ngữ' }
                ]
            },
            questions: [
                {
                    type: 'choice',
                    prompt: 'Khi giới thiệu tên mình trang trọng với đối tác Nhật Bản, bạn nói:',
                    character: '田中と申します',
                    reading: 'tanaka to moushimasu',
                    audio: 'たなかともうします',
                    options: ['田中と申します (Tôi tên là Tanaka - Khiêm nhường ngữ)', '田中とおっしゃいます', '田中です', '田中様です'],
                    correctIndex: 0,
                    explanation: '申します (moushimasu) là khiêm nhường ngữ của 言います, dùng khi giới thiệu bản thân.'
                },
                {
                    type: 'choice',
                    prompt: '"社長はもうお帰りになりました" thể hiện điều gì?',
                    character: '社長はもうお帰りになりました',
                    reading: 'shachou wa mou okaeri ni narimashita',
                    audio: 'しゃちょうはもうおかえりになりました',
                    options: ['Giám đốc đã về nhà rồi (Dùng Tôn Kính Ngữ kính trọng giám đốc)', 'Tôi đã về nhà của giám đốc', 'Giám đốc bảo tôi về nhà', 'Giám đốc chưa về'],
                    correctIndex: 0,
                    explanation: 'お帰りになりました (お + Vます + になります) là thể tôn kính trang trọng.'
                },
                {
                    type: 'matching',
                    prompt: 'Nối các cặp động từ Tôn Kính Ngữ (尊敬語) đặc biệt:',
                    pairs: [
                        { left: '食べる / 飲む', right: '召し上がります (meshia-garimasu)' },
                        { left: '言う (Nói)', right: 'おっしゃいます' },
                        { left: '見る (Xem)', right: 'ご覧になります (goran ni narimasu)' },
                        { left: '知っている (Biết)', right: 'ご存じです (gozonji desu)' }
                    ]
                }
            ]
        },
        {
            id: 'ja_s5_l5',
            title: 'Đại Chung Kết: QuizKi JLPT N5-N4 Master 🏆',
            shortTitle: 'Đại Chung Kết 🏆',
            desc: 'Vượt qua bài test tổng hợp đỉnh cao, kích hoạt trọn bộ kỹ năng từ vựng, Kanji và ngữ pháp Minna no Nihongo để chính thức làm chủ tiếng Nhật sơ trung cấp!',
            icon: '🏆',
            xp: 60,
            isMilestone: true,
            items: {
                vocab: [
                    { word: '合格', reading: 'ごうかく', meaning: 'Thi đỗ / Trúng tuyển' },
                    { word: '成功', reading: 'せいこう', meaning: 'Thành công' },
                    { word: '将来', reading: 'しょうらい', meaning: 'Tương lai' },
                    { word: '夢', reading: 'ゆめ', meaning: 'Ước mơ' }
                ],
                kanji: [
                    { character: '合', sinoViet: 'HỢP', meaning: 'Phù hợp, hợp nhất', onyomi: 'GOU, GA', kunyomi: 'a-u' },
                    { character: '格', sinoViet: 'CÁCH', meaning: 'Quy cách, tư cách', onyomi: 'KAKU', kunyomi: '' },
                    { character: '成', sinoViet: 'THÀNH', meaning: 'Thành công, trở thành', onyomi: 'SEI, JOU', kunyomi: 'na-ru' },
                    { character: '功', sinoViet: 'CÔNG', meaning: 'Công lao, kỳ tích', onyomi: 'KOU', kunyomi: '' },
                    { character: '夢', sinoViet: 'MỘNG', meaning: 'Giấc mơ, chiêm bao', onyomi: 'MU', kunyomi: 'yume' }
                ],
                grammar: [
                    { id: 'n4_master_cert', pattern: 'QuizKi JLPT Master', meaning: 'Hoàn thành toàn diện lộ trình N5 & N4', meaningShort: 'JLPT Master' }
                ]
            },
            questions: [
                {
                    type: 'choice',
                    prompt: 'Chọn câu có ngữ pháp và sắc thái lịch sự hoàn hảo nhất:',
                    character: '先生、この本を読ませていただけませんか',
                    reading: 'sensei kono hon o yomasete itadakemasen ka',
                    audio: 'せんせいこのほんをよませていただけませんか',
                    options: ['先生、この本を読ませていただけませんか (Thưa thầy, thầy có thể cho phép em đọc cuốn sách này được không ạ?)', '先生、この本を読め', '先生、この本を読むたい', '先生、この本を読んでほしいだ'],
                    correctIndex: 0,
                    explanation: 'Thể sai khiến + ていただけませんか là lời xin phép lịch sự và chuẩn mực nhất với người trên: "Có thể cho phép em làm việc này được không ạ?".'
                },
                {
                    type: 'matching',
                    prompt: 'Nối các cột mốc danh giá trên hành trình tiếng Nhật:',
                    pairs: [
                        { left: 'Chặng 1 (Kana)', right: '46 âm Hiragana, Katakana & Phát âm chuẩn' },
                        { left: 'Chặng 2-3 (N5)', right: 'Minna 1-25: 800 từ & Các thể Te, Nai, Ta căn bản' },
                        { left: 'Chặng 4 (N4 Sơ cấp)', right: 'Minna 26-38: Thể Khả năng, Tự/Tha động từ & Bị động' },
                        { left: 'Chặng 5 (N4 Kính ngữ)', right: 'Minna 39-50: Kính ngữ, Khiêm nhường ngữ & JLPT Master' }
                    ]
                },
                {
                    type: 'audio_choice',
                    prompt: 'Nghe lời chúc mừng tốt nghiệp lộ trình:',
                    character: 'おめでとうございます！合格です！',
                    reading: 'omedetou gozaimasu goukaku desu',
                    audio: 'おめでとうございますごうかくです',
                    options: ['Chúc mừng bạn! Bạn đã thi đỗ xuất sắc!', 'Chúc bạn may mắn lần sau', 'Cảm ơn vì đã giúp đỡ', 'Hẹn gặp lại bạn vào ngày mai'],
                    correctIndex: 0,
                    explanation: 'おめでとうございます (Chúc mừng) + 合格です (Đã đỗ rồi!).'
                }
            ]
        }
    ]
};

