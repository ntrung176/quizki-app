import fs from 'fs';
import path from 'path';

// Complete, rich datasets for all 32 Cheat Sheets
const FULL_CHEAT_SHEETS = [
    {
        id: 'keigo',
        title: 'Kính ngữ toàn tập (Keigo)',
        titleJp: '敬語',
        level: 'N4-N2',
        category: 'Giao tiếp & Công sở',
        icon: '👑',
        badge: 'Bắt buộc khi đi làm',
        summary: '3 tầng kính ngữ (Sonkeigo / Kenjougo / Teineigo), 12 động từ biến đổi đặc biệt, 5 mẫu N2 công sở và các lỗi nhầm lẫn tai hại.',
        hanko: '敬語',
        specialVerbs: [
            { plain: '行く・来る', sonkei: 'いらっしゃる / おいでになる', kenjou: '参る (まいる) / 伺う (うかがう)', teinei: '行きます・来ます', meaning: 'Đi / Đến' },
            { plain: 'いる', sonkei: 'いらっしゃる / おいでになる', kenjou: 'おる', teinei: 'います', meaning: 'Ở, có (người)' },
            { plain: '言う', sonkei: 'おっしゃる', kenjou: '申す (もうす) / 申し上げる', teinei: '言います', meaning: 'Nói' },
            { plain: 'する', sonkei: 'なさる', kenjou: 'いたす', teinei: 'します', meaning: 'Làm' },
            { plain: '見る', sonkei: 'ご覧になる (ごらんになる)', kenjou: '拝見する (はいけんする)', teinei: '見ます', meaning: 'Xem, nhìn' },
            { plain: '聞く・尋ねる', sonkei: 'お聞きになる', kenjou: '伺う (うかがう) / 拝聴する', teinei: '聞きます', meaning: 'Nghe / Hỏi / Thăm' },
            { plain: '知っている', sonkei: 'ご存じだ (ごぞんじだ)', kenjou: '存じている / 存じ上げている', teinei: '知っています', meaning: 'Biết' },
            { plain: '食べる・飲む', sonkei: '召し上がる (めしあがる)', kenjou: 'いただく', teinei: '食べます・飲みます', meaning: 'Ăn / Uống' },
            { plain: 'もらう', sonkei: '—', kenjou: 'いただく / 頂戴する', teinei: 'もらいます', meaning: 'Nhận' },
            { plain: 'あげる', sonkei: '—', kenjou: '差し上げる (さしあげる)', teinei: 'あげます', meaning: 'Tặng, cho' },
            { plain: 'くれる', sonkei: 'くださる', kenjou: '—', teinei: 'くれます', meaning: 'Cho tôi' },
            { plain: '会う', sonkei: 'お会いになる', kenjou: 'お目にかかる (おめにかかる)', teinei: '会います', meaning: 'Gặp' }
        ],
        sections: [
            {
                title: '1. Tôn kính ngữ (尊敬語 - Sonkeigo) — Nâng đối phương',
                description: 'Dùng khi nói về hành động của cấp trên, khách hàng, người lớn tuổi. TUYỆT ĐỐI KHÔNG dùng cho bản thân.',
                formulas: [
                    { formula: 'お + V[bỏ ます] + になる', note: 'Quy tắc vàng cho động từ thuần Nhật (お帰りになる, お読みになる)' },
                    { formula: 'ご + N[hán tự] + になる / なさる', note: 'Dùng cho danh động từ する (ご出席になる, ご利用なさる)' },
                    { formula: 'V[thể bị động - れる/られる]', note: 'Tôn kính mức độ vừa phải, tự nhiên (社長は来週出張されます)' },
                    { formula: 'お + V[bỏ ます] + ください', note: 'Mời mọc lịch sự (少々お待ちください, こちらにお掛けください)' }
                ],
                examples: [
                    { ja: '社長は８時にお帰りになります。', vi: 'Giám đốc sẽ về lúc 8 giờ.' },
                    { ja: '先生、この本はもうお読みになりましたか。', vi: 'Thầy đã đọc cuốn sách này chưa ạ?' },
                    { ja: 'どうぞ、こちらにお座りください。', vi: 'Xin mời ngồi phía bên này ạ.' }
                ]
            },
            {
                title: '2. Khiêm nhường ngữ (謙譲語 - Kenjougo) — Hạ mình để tôn người khác',
                description: 'Dùng khi nói về hành động của BẢN THÂN hoặc người trong nhóm mình (công ty mình, gia đình mình) hướng tới đối phương.',
                formulas: [
                    { formula: 'お + V[bỏ ます] + する / いたす', note: 'Hành động của mình hướng tới người khác (お届けします, ご案内いたします)' },
                    { formula: 'ご + N[hán tự] + する / 申し上げる', note: 'Dành cho nhóm danh động từ (ご報告いたします, ご連絡申し上げます)' },
                    { formula: 'お / ご + V[bỏ ます] + いただく', note: 'Nhờ vả khiêm nhường (ご確認いただけますでしょうか)' }
                ],
                examples: [
                    { ja: '明日、資料をお届けに伺います。', vi: 'Ngày mai tôi sẽ đến gửi tài liệu ạ.' },
                    { ja: '新商品の詳細をご案内いたします。', vi: 'Tôi xin phép hướng dẫn chi tiết về sản phẩm mới.' },
                    { ja: '弊社の山田からご連絡申し上げます。', vi: 'Anh Yamada bên công ty chúng tôi sẽ liên hệ với quý khách ạ.' }
                ]
            },
            {
                title: '3. 5 Mẫu Kính ngữ N2 phổ biến trong công sở Nhật',
                description: 'Những mẫu câu đắt giá giúp nâng tầm giao tiếp văn phòng và thi JLPT N2/N1.',
                patterns: [
                    { pattern: '〜ていただく / 〜てくださる', note: 'Nhận được hành động từ người trên / Người trên làm cho mình' },
                    { pattern: '〜とお見受けします', note: 'Suy đoán lịch sự thay cho 〜のようだ / 〜に見える' },
                    { pattern: '〜申し上げます', note: 'Bày tỏ lòng thành (お祝い申し上げます, お礼申し上げます)' },
                    { pattern: '〜存じます', note: 'Cách nói trang trọng của 〜と思います / 〜と考えております' },
                    { pattern: '〜恐れ入りますが', note: 'Mở lời khi làm phiền người khác trước khi đưa ra yêu cầu' }
                ],
                examples: [
                    { ja: '恐れ入りますが、お名前をもう一度伺えますでしょうか。', vi: 'Xin thứ lỗi, tôi có thể hỏi lại quý danh một lần nữa được không ạ?' },
                    { ja: 'ご都合がよろしければ、ぜひご参加いただきたく存じます。', vi: 'Nếu tiện, tôi rất mong quý khách có thể tham dự ạ.' }
                ]
            },
            {
                title: '4. Các lỗi Kính ngữ kép & Bẫy nhầm lẫn tai hại (二重敬語)',
                description: 'Người học và kể cả nhân viên mới người Nhật rất hay mắc lỗi này.',
                traps: [
                    { wrong: '❌ ご覧になられる', correct: '✅ ご覧になる', reason: 'ご覧になる đã là tôn kính ngữ rồi, thêm られる là lỗi Kính ngữ kép (二重敬語).' },
                    { wrong: '❌ 伺わせていただきます', correct: '✅ 伺います / お伺いします', reason: 'Lạm dụng させていただく quá mức.' },
                    { wrong: '❌ (Nói với khách) 社長の山田様はいらっしゃいません', correct: '✅ 社長の山田は席を外しております', reason: 'Với khách hàng bên ngoài (そと), người trong công ty mình (うち) kể cả Giám đốc cũng chỉ xưng tên không có 様/さん và dùng khiêm nhường ngữ.' }
                ]
            }
        ],
        drills: [
            {
                question: 'A: 先生、明日の懇親会に（　　）か。',
                options: ['参られます', 'いらっしゃいます', '申されます', '拝見なさいます'],
                answer: 'いらっしゃいます',
                explanation: 'Hành động "đến/tham dự" của Thầy giáo (người trên) cần dùng Tôn kính ngữ (いらっしゃる).'
            },
            {
                question: 'B: 社長からお預かりした書類を（　　）。',
                options: ['ご覧になりました', '拝見いたしました', 'おっしゃいました', '召し上がりました'],
                answer: '拝見いたしました',
                explanation: 'Bản thân mình xem tài liệu của sếp giao -> dùng Khiêm nhường ngữ của 見る là 拝見する / 拝見いたしました.'
            }
        ]
    },
    {
        id: 'particles',
        title: 'Tổng hợp Trợ từ (Particles Cheat Sheet)',
        titleJp: '助詞',
        level: 'N5-N3',
        category: 'Ngữ pháp Cốt lõi',
        icon: '⚡',
        badge: '216 mục đối chiếu',
        summary: 'Bí kíp phân biệt は vs が, に vs で, を, へ, と, から, まで, も, だけ, しか... kèm hình ảnh ẩn dụ và lưu ý thực tế.',
        hanko: '助詞',
        particlesList: [
            { particle: 'は (wa)', meaning: 'Chủ đề câu, đối chiếu tương phản, nhấn mạnh phủ định', formula: 'N + は', sample: '私はベトナム人です。 / 肉は食べますが、魚は食べません。' },
            { particle: 'が (ga)', meaning: 'Chủ ngữ nổi bật, hiện tượng tự nhiên khách quan, đối tượng của tính từ/khả năng', formula: 'N + が', sample: '雨が降っています。 / 私は日本語が分かります。' },
            { particle: 'を (wo/o)', meaning: 'Tân ngữ trực tiếp, nơi chốn chuyển động xuyên qua / rời khỏi', formula: 'N + を + V', sample: 'ご飯を食べます。 / 公園を散歩します。 / 電車を降ります。' },
            { particle: 'に (ni)', meaning: 'Đích đến chuyển động, thời gian xác định, đối tượng tiếp nhận, nơi tồn tại', formula: 'N + に', sample: '7時に起きます。 / 友達に本をあげます。 / 東京に住んでいます。' },
            { particle: 'で (de)', meaning: 'Nơi diễn ra hành động, phương tiện công cụ, nguyên nhân, phạm vi giới hạn', formula: 'N + で', sample: '箸で食べます。 / カフェで仕事をします。 / 病気で休みました。' },
            { particle: 'へ (e)', meaning: 'Phương hướng di chuyển (hướng về phía)', formula: 'N + へ + V di chuyển', sample: '日本へ行きます。 / 未来への第一歩。' },
            { particle: 'と (to)', meaning: 'Cùng với (cùng làm), liệt kê toàn bộ (và), trích dẫn nội dung suy nghĩ/lời nói', formula: 'N + と + N / [Câu] + と + 言う/思う', sample: '友達と遊びます。 / りんごとみかんを買った。 / 明日雨だと聞いた。' },
            { particle: 'も (mo)', meaning: 'Cũng, đến mức (số từ lớn), hoàn toàn không (khi đi với phủ định)', formula: 'N + も', sample: '私も行きます。 / 100人も来ました。 / 何も知りません。' },
            { particle: 'から (kara)', meaning: 'Từ (điểm bắt đầu thời gian/không gian), vì (nguyên nhân)', formula: 'N + から / [Câu] + から', sample: '9時から働きます。 / 暑いから窓を開けて。' },
            { particle: 'まで (made)', meaning: 'Đến (điểm kết thúc thời gian/không gian)', formula: 'N + まで', sample: '5時まで勉強します。 / 駅まで歩きます。' }
        ],
        drills: [
            {
                question: '公園（　　）散歩して、カフェ（　　）コーヒーを飲みました。',
                options: ['を / で', 'に / を', 'で / に', 'へ / を'],
                answer: 'を / で',
                explanation: 'Chuyển động xuyên qua không gian dùng を (公園を散歩する). Nơi diễn ra hành động uống cà phê dùng で (カフェで飲む).'
            }
        ]
    },
    {
        id: 'conditionals',
        title: 'Bộ 4 Câu điều kiện (Conditionals Cheat Sheet)',
        titleJp: '条件表現',
        level: 'N4-N3',
        category: 'Ngữ pháp Cốt lõi',
        icon: '🌿',
        badge: 'To / Ba / Tara / Nara',
        summary: 'Ma trận đối chiếu 4 mẫu câu điều kiện: Điều kiện tự nhiên, giả định phi thực tế, lời khuyên, và thói quen hàng ngày.',
        hanko: '条件',
        matrix: [
            {
                form: '〜と',
                nature: 'Điều kiện tự nhiên / Máy móc / Hệ quả tất yếu',
                rule: 'V[ru] + と. KHÔNG dùng cho mệnh lệnh, ý chí, nhờ vả ở vế sau.',
                sample: '春になると、桜が咲きます。 / このボタンを押すと、ドアが開きます。',
                nuance: 'Cứ hễ A là tất yếu B xảy ra ngay lập tức.'
            },
            {
                form: '〜ば',
                nature: 'Điều kiện giả định logic / Lời khuyên chung',
                rule: 'V[thể ba], A-i -> ければ, A-na/N -> ならば.',
                sample: '安ければ、買います。 / 薬を飲めば、治りますよ。',
                nuance: 'Nếu điều kiện A thỏa mãn thì kết quả B sẽ xảy ra.'
            },
            {
                form: '〜たら',
                nature: 'Điều kiện linh hoạt nhất / Sau khi làm A thì làm B',
                rule: 'V[thể ta] + ら. Dùng được cho Ý CHÍ, MỆNH LỆNH, NHỜ VẢ, RỦ RÊ ở vế sau!',
                sample: '日本に着いたら、電話してください。 / 雨が降ったら、行きません。',
                nuance: 'Thông dụng nhất trong văn nói thường ngày.'
            },
            {
                form: '〜なら',
                nature: 'Tiếp nhận chủ đề từ đối phương / Đưa ra gợi ý, lời khuyên',
                rule: 'N / V[thể thường] + なら. Vế sau là đánh giá, lời khuyên, đề xuất.',
                sample: '日本へ行くなら、京都がおすすめですよ。 / 日本語なら、彼が得意です。',
                nuance: 'Nếu là chuyện đó / Nếu nói về việc đó thì...'
            }
        ],
        drills: [
            {
                question: '日本に着い（　　）、すぐ連絡してくださいね。',
                options: ['たら', 'と', 'ば', 'なら'],
                answer: 'たら',
                explanation: 'Vế sau là câu nhờ vả / mệnh lệnh (連絡してください) và mang nghĩa "sau khi đến" -> chỉ có 〜たら là phù hợp nhất.'
            }
        ]
    },
    {
        id: 'giving-receiving',
        title: 'Cho & Nhận (Giving & Receiving)',
        titleJp: '授受表現',
        level: 'N4-N3',
        category: 'Ngữ pháp Cốt lõi',
        icon: '🎁',
        badge: 'Hay nhầm nhất JLPT',
        summary: 'Phân biệt あげる · くれる · もらう theo hướng chuyển động của hành động và ơn huệ, kết hợp thể 〜て và kính ngữ.',
        hanko: '授受',
        sections: [
            {
                title: '1. Ba hướng chuyển động cốt lõi',
                description: 'Xác định xem người nhận là AI để chọn đúng động từ:',
                formulas: [
                    { formula: 'あげる (さしあげる)', note: 'Tôi / Phe tôi ——> Người khác (hoặc A cho B)' },
                    { formula: 'くれる (くださる)', note: 'Người khác ——> Tôi / Gia đình tôi (cho tôi)' },
                    { formula: 'もらう (いただく)', note: 'Tôi / Người nhận <—— Người cho (nhận từ ai đó)' }
                ],
                examples: [
                    { ja: '私は妹にプレゼントをあげました。', vi: 'Tôi tặng quà cho em gái.' },
                    { ja: '田中さんが私に本をくれました。', vi: 'Anh Tanaka đã tặng sách cho tôi.' },
                    { ja: '私は先生から推薦状をもらいました。', vi: 'Tôi đã nhận thư giới thiệu từ thầy giáo.' }
                ]
            },
            {
                title: '2. Kết hợp với thể 〜て (Làm giúp ai đó việc gì)',
                description: 'Diễn tả hành động mang tính giúp đỡ, biết ơn:',
                formulas: [
                    { formula: '〜てあげる', note: 'Làm giúp ai đó một việc (cẩn thận vì có sắc thái ban ơn, không nói thẳng với cấp trên)' },
                    { formula: '〜てくれる / 〜てくださる', note: 'Ai đó làm giúp mình (bày tỏ lòng cảm kích)' },
                    { formula: '〜てもらう / 〜ていただく', note: 'Nhận được sự giúp đỡ từ ai đó (chủ ngữ là người được giúp)' }
                ],
                examples: [
                    { ja: '友達が引っ越しを手伝ってくれた。', vi: 'Bạn bè đã giúp tôi chuyển nhà.' },
                    { ja: '先生に日本語を教えていただきました。', vi: 'Tôi đã được thầy giáo chỉ dạy tiếng Nhật cho.' }
                ]
            }
        ]
    },
    {
        id: 'passive-causative',
        title: 'Bị động · Sai khiến · Bị động Sai khiến',
        titleJp: '受身・使役・使役受身',
        level: 'N4-N3',
        category: 'Biến chia Thể',
        icon: '🔄',
        badge: 'Bao gồm 迷惑受身',
        summary: 'Sơ đồ minh họa đổi góc nhìn chủ - khách thể, bị động phiền toái (迷惑受身) đặc trưng của tiếng Nhật và thể ép buộc.',
        hanko: '受使',
        sections: [
            {
                title: '1. Thể Bị động (受身形 - Ukemi)',
                description: 'Bị / Được tác động bởi ai đó. Nhóm 1: [u] -> [a] + れる | Nhóm 2: bỏ る + られる | Nhóm 3: される / こられる',
                formulas: [
                    { formula: 'Bị động trực tiếp: [N bị] は [N gây] に V-bị động', note: 'Tôi được/bị ai đó làm gì' },
                    { formula: 'Bị động gián tiếp (迷惑受身): [N] は [N gây] に [Vật] を V-bị động', note: 'Tôi bị phiền toái vì hành động của người khác' }
                ],
                examples: [
                    { ja: '先生に褒められました。', vi: 'Tôi được thầy giáo khen.' },
                    { ja: '雨に降られて、服が濡れてしまった。', vi: 'Bị dính mưa phiền toái, quần áo ướt sũng hết cả.' }
                ]
            },
            {
                title: '2. Thể Sai khiến (使役形 - Shieki)',
                description: 'Bắt / Cho phép ai làm gì. Nhóm 1: [u] -> [a] + せる | Nhóm 2: bỏ る + させる | Nhóm 3: させる / こさせる',
                formulas: [
                    { formula: '[Người ra lệnh] は [Người làm] に / を V-sai khiến', note: 'Bắt ai làm gì hoặc cho phép ai làm gì' },
                    { formula: '〜させていただけませんか', note: 'Mẫu câu xin phép kinh điển: Xin hãy cho phép tôi được làm...' }
                ],
                examples: [
                    { ja: '母は弟に野菜を食べさせた。', vi: 'Mẹ bắt em trai ăn rau.' },
                    { ja: '体調が悪いので、早退させていただけませんか。', vi: 'Vì thấy không khỏe, xin phép cho tôi được về sớm được không ạ?' }
                ]
            },
            {
                title: '3. Thể Bị động Sai khiến (使役受身形 - Shieki Ukemi)',
                description: 'Bị ép buộc phải làm điều mình không thích.',
                formulas: [
                    { formula: '[Người bị ép] は [Người ép] に V-bị động sai khiến', note: 'Nhóm 1 rút gọn: 飲まされる, 行かされる | Nhóm 2: 食べさせられる' }
                ],
                examples: [
                    { ja: '子どもの頃、嫌いな野菜を食べさせられた。', vi: 'Hồi nhỏ tôi toàn bị ép ăn những món rau ghét cay ghét đắng.' }
                ]
            }
        ]
    },
    {
        id: 'transitivity',
        title: 'Tự động từ & Tha động từ (Transitivity)',
        titleJp: '自動詞・他動詞',
        level: 'N5-N3',
        category: 'Động từ',
        icon: '⚖️',
        badge: 'Cặp từ & Trợ từ',
        summary: 'Quy tắc phân biệt tự động từ (が・ている) và tha động từ (を・てある), các đuôi nhận biết -aru/-eru, -su/-ru.',
        hanko: '自他',
        pairs: [
            { jidou: '開く (あく)', tadou: '開ける (あける)', meaning: 'Mở', sampleJ: 'ドアが開く (Cửa mở - tự nhiên)', sampleT: 'ドアを開ける (Mở cửa - có người tác động)' },
            { jidou: '閉まる (しまる)', tadou: '閉める (しめる)', meaning: 'Đóng', sampleJ: '店が閉まっている', sampleT: '窓を閉める' },
            { jidou: '消える (きえる)', tadou: '消す (けす)', meaning: 'Tắt / Xóa', sampleJ: '電気が消えた', sampleT: '電気を消す' },
            { jidou: 'つく', tadou: 'つける', meaning: 'Bật / Dính', sampleJ: '電気がついた', sampleT: 'エアコンをつける' },
            { jidou: '始まる (はじまる)', tadou: '始める (はじめる)', meaning: 'Bắt đầu', sampleJ: '授業が始まる', sampleT: '会議を始める' },
            { jidou: '終わる (おわる)', tadou: '終える (おえる)', meaning: 'Kết thúc', sampleJ: '仕事が終わった', sampleT: '仕事を終える' },
            { jidou: '落ちる (おちる)', tadou: '落とす (おとす)', meaning: 'Rơi / Làm rơi', sampleJ: '財布が落ちた', sampleT: '財布を落とした' },
            { jidou: '壊れる (こわれる)', tadou: '壊す (こわす)', meaning: 'Hỏng / Làm hỏng', sampleJ: '時計が壊れた', sampleT: '時計を壊した' }
        ]
    },
    {
        id: 'verb-groups',
        title: 'Phân nhóm & Biến chia Động từ',
        titleJp: '動詞グループ・活用',
        level: 'N5-N4',
        category: 'Động từ',
        icon: '🧩',
        badge: 'Nền tảng sơ cấp',
        summary: 'Nhóm 1 (五段), Nhóm 2 (一段), Nhóm 3 (不規則) và bảng biến chia tất cả các thể: て, ない, た, 可能, 意向, 命令, 条件, 禁忌.',
        hanko: '活用',
        sections: [
            {
                title: '1. Quy tắc phân nhóm động từ',
                description: 'Phân loại chính xác 3 nhóm động từ tiếng Nhật:',
                formulas: [
                    { formula: 'Nhóm 3 (Bất quy tắc)', note: 'Chỉ có 2 động từ: する (làm) và 来る (くる - đến)' },
                    { formula: 'Nhóm 2 (一段 - Ichidan)', note: 'Đuôi là る VÀ trước る là nguyên âm cột [i] hoặc [e] (食べる, 見る, 起きる, 忘れる)' },
                    { formula: 'Nhóm 1 (五段 - Godan)', note: 'Tất cả các đuôi u, ku, su, tsu, nu, bu, mu, gu, ru (không thuộc nhóm 2). ★ Chú ý ngoại lệ nhóm 1: 帰る (về), 知る (biết), 走る (chạy), 入る (vào), 切る (cắt), 減る (giảm)' }
                ]
            }
        ]
    },
    {
        id: 'te-form',
        title: 'Thể て Chuyên sâu (Te-Form Deep Dive)',
        titleJp: 'て形・応用表現',
        level: 'N5-N3',
        category: 'Biến chia Thể',
        icon: '🪢',
        badge: '6 mẫu て nâng cao',
        summary: 'Bí kíp chia thể て, các trường hợp ngoại lệ (行く → 行って), kết hợp て + いる, ある, おく, しまう, みる, いただく.',
        hanko: 'て形',
        sections: [
            {
                title: '1. Quy tắc chia thể て nhanh chuẩn',
                description: 'Bài ca chia thể て nhóm 1: い・ち・り → って, み・び・に → んで, き → いて, ぎ → いで, し → して. ★ Ngoại lệ: 行く → 行って.',
                formulas: [
                    { formula: '〜ておく', note: 'Làm sẵn trước để chuẩn bị (予約しておく)' },
                    { formula: '〜てしまう', note: 'Lỡ làm mất rồi (tiếc nuối) hoặc Đã hoàn thành xong xuôi' },
                    { formula: '〜てみる', note: 'Làm thử xem sao (食べてみる)' },
                    { formula: '〜ていく / 〜てくる', note: 'Biến đổi rời xa dần / Biến đổi tiến lại gần hiện tại' }
                ]
            }
        ]
    },
    {
        id: 'inference',
        title: 'Suy đoán & Dạng thức (Inference & Modality)',
        titleJp: '推量・様態',
        level: 'N4-N2',
        category: 'Sắc thái & Cảm xúc',
        icon: '🔮',
        badge: '6 sắc thái suy đoán',
        summary: 'So sánh mức độ chắc chắn và căn cứ: そうだ (trực quan/nghe nói), ようだ (ước đoán), らしい (nguồn tin), に違いない, はずだ, わけだ.',
        hanko: '推量',
        sections: [
            {
                title: 'Bảng đối chiếu 6 mẫu suy đoán',
                description: 'Căn cứ đánh giá và mức độ tin cậy của thông tin:',
                formulas: [
                    { formula: '〜そうだ (Trực giác / Vẻ như)', note: 'Nhìn bằng mắt: 美味しそうだ (Trông ngon đấy)' },
                    { formula: '〜そうだ (Nghe nói)', note: 'Truyền đạt tin tức: 明日は雨が降るそうだ (Nghe nói mai mưa)' },
                    { formula: '〜ようだ (Hình như / Ước đoán)', note: 'Căn cứ giác quan tổng hợp / ví von: 誰もいないようだ' },
                    { formula: '〜らしい (Dường như / Chuẩn chất)', note: 'Nghe đồn / Bản chất điển hình: 男らしい (Rất nam tính)' },
                    { formula: '〜はずだ (Chắc chắn / Lẽ ra)', note: 'Có tính toán logic: 彼は知っているはずだ' },
                    { formula: '〜に違いない (Không thể sai được)', note: 'Khẳng định chủ quan đanh thép: 犯人は彼に違いない' }
                ]
            }
        ]
    },
    {
        id: 'nominalizer',
        title: 'Danh từ hóa (Nominalizers)',
        titleJp: '名詞化',
        level: 'N4-N2',
        category: 'Ngữ pháp Cốt lõi',
        icon: '📦',
        badge: 'こと vs もの vs の',
        summary: 'Khi nào dùng の (tri giác trực tiếp), khi nào bắt buộc dùng こと (khái niệm trừu tượng, mẫu cố định), và もの (bản chất/cảm xúc).',
        hanko: '名詞',
        sections: [
            {
                title: 'Quy tắc chọn の hay こと',
                description: 'Phân biệt rạch ròi 2 cách biến động từ thành danh từ:',
                formulas: [
                    { formula: 'Bắt buộc dùng の', note: 'Khi đi với giác quan (nhìn, nghe, cảm nhận) hoặc chờ đợi, dừng lại: 歌っているのを聞く, 待つのを手伝う' },
                    { formula: 'Bắt buộc dùng こと', note: 'Các mẫu cố định: ことができる, ことがある, ことにする, ことになる; Lời nói, mệnh lệnh truyền đạt' },
                    { formula: 'Bản chất của もの', note: 'Vật thể sờ nắm được, chân lý tự nhiên đạo đức con người: 子どもは遊ぶものだ' }
                ]
            }
        ]
    },
    {
        id: 'limitation',
        title: 'Giới hạn & Mức độ (Limitation & Degree)',
        titleJp: '限定・程度',
        level: 'N4-N3',
        category: 'Sắc thái & Cảm xúc',
        icon: '🎯',
        badge: 'Chỉ & Mức độ',
        summary: 'Phân biệt だけ (chỉ - trung tính), しか〜ない (chỉ - tiếc nuối/phủ định), ばかり (toàn là), ほど (đến mức), くらい/ぐらい (khoảng).',
        hanko: '限定',
        sections: [
            {
                title: 'Các sắc thái của chữ "CHỈ"',
                description: 'Chọn đúng từ theo cảm xúc người nói:',
                formulas: [
                    { formula: '〜だけ', note: 'Chỉ (đơn thuần, trung tính, không cảm xúc): 100円だけある' },
                    { formula: '〜しか〜ない', note: 'Chỉ vỏn vẹn (chê ít, tiếc nuối, bắt buộc đi với phủ định): 100円しかない' },
                    { formula: '〜ばかり', note: 'Chỉ toàn là (tần suất lặp lại nhiều gây khó chịu): ゲームばかりしている' },
                    { formula: '〜ほど', note: 'Đến mức: 泣きたいほど痛い' },
                    { formula: '〜くらい / ぐらい', note: 'Cỡ chừng, khoảng: ひらがなぐらい読める' }
                ]
            }
        ]
    },
    {
        id: 'reason',
        title: 'Nguyên nhân & Lý do (Cause & Reason)',
        titleJp: '原因・理由',
        level: 'N3-N2',
        category: 'Ngữ pháp Nâng cao',
        icon: '💡',
        badge: 'Tốt vs Xấu',
        summary: 'So sánh おかげで (nhờ có - kết quả tốt), せいで (tại vì - kết quả xấu), ために (nguyên nhân khách quan), ことから, ばかりに.',
        hanko: '理由',
        sections: [
            {
                title: 'Phân biệt các mẫu chỉ Nguyên nhân',
                description: 'Chọn mẫu câu dựa vào kết quả Tốt hay Xấu:',
                formulas: [
                    { formula: '〜おかげで', note: 'Nhờ có ~ (kết quả tốt đẹp, cảm ơn): 先生のおかげで合格しました' },
                    { formula: '〜せいで', note: 'Tại vì ~ (kết quả xấu, đổ lỗi, bực tức): バスの遅れのせいで遅刻した' },
                    { formula: '〜ために (nguyên nhân)', note: 'Do, vì (nguyên nhân khách quan, thiên tai, tai nạn): 事故のために電車が止まった' },
                    { formula: '〜ばかりに', note: 'Chỉ vì ~ mà chuốc lấy hậu quả tồi tệ không đáng có' }
                ]
            }
        ]
    },
    {
        id: 'time-expressions',
        title: 'Biểu hiện Thời gian (Time Expressions)',
        titleJp: '時間表現',
        level: 'N3-N2',
        category: 'Ngữ pháp Nâng cao',
        icon: '⏳',
        badge: 'Trình tự & Khoảnh khắc',
        summary: 'Quy tắc dùng うちに (trong khi/tranh thủ), あいだ/あいだに, 最中に (đúng lúc cao trào), たびに (mỗi lần), とおりに, ついでに.',
        hanko: '時間',
        sections: [
            {
                title: 'Các mẫu diễn tả trình tự thời gian',
                description: 'Quy tắc sử dụng các mẫu thời gian chuẩn xác:',
                formulas: [
                    { formula: '〜うちに', note: 'Trong lúc còn... tranh thủ làm / Trong khi đang... thì biến đổi bất ngờ diễn ra' },
                    { formula: '〜あいだ (suốt) vs 〜あいだに (khoảnh khắc)', note: '夏休みの間ずっと (suốt kỳ nghỉ) vs 留守の間に (trong lúc vắng nhà)' },
                    { formula: '〜最中に (さいちゅうに)', note: 'Đúng vào lúc cao trào đang diễn ra: 会議の最中に電話が鳴った' },
                    { formula: '〜たびに', note: 'Cứ mỗi lần A là lại B: この写真を見るたびに' },
                    { formula: '〜ついでに', note: 'Nhân tiện làm A thì tiện thể làm luôn B' }
                ]
            }
        ]
    },
    {
        id: 'written-style',
        title: 'Văn viết & Nhật dụng (Written Style)',
        titleJp: '書き言葉',
        level: 'N3-N2',
        category: 'Văn phong',
        icon: '🖋️',
        badge: 'Báo chí & Luận văn',
        summary: 'Đối chiếu である体 với です/ます, các đuôi phủ định cổ ず/ぬ, mẫu べきだ/まい, và liên từ văn viết trang trọng.',
        hanko: '書体',
        sections: [
            {
                title: 'Đối chiếu Văn nói vs Văn viết',
                description: 'Quy tắc chuyển thể khi viết báo cáo, bài luận:',
                formulas: [
                    { formula: '〜です / 〜だ  ——>  〜である', note: 'Văn phong học thuật, báo chí, tài liệu trang trọng' },
                    { formula: '〜ないで / 〜なくて  ——>  〜ずに / 〜ず', note: 'Phủ định văn viết (食べずに = 食べないで)' },
                    { formula: '〜ながら  ——>  〜つつ', note: 'Vừa... vừa... (歩きつつ考える)' },
                    { formula: '〜なければならない  ——>  〜ねばならない / 〜べきだ', note: 'Nghĩa vụ đương nhiên' }
                ]
            }
        ]
    },
    {
        id: 'greetings',
        title: 'Chào hỏi & Câu định sẵn (Greetings & Set Phrases)',
        titleJp: '挨拶・定型表現',
        level: 'N5-N3',
        category: 'Giao tiếp & Công sở',
        icon: '🙇',
        badge: 'Văn hóa ứng xử',
        summary: 'Bộ câu chào hỏi hàng ngày, giao tiếp công sở (お疲れ様, お世話になります, 失礼します) và nghệ thuật đệm lời (あいづち).',
        hanko: '挨拶',
        sections: [
            {
                title: 'Các mẫu câu công sở bất hủ',
                description: 'Ứng xử chuẩn mực tại văn phòng Nhật Bản:',
                formulas: [
                    { formula: 'お疲れ様です (おつかれさまです)', note: 'Chào đồng nghiệp hàng ngày, ghi nhận sự cố gắng của nhau' },
                    { formula: 'お先に失礼します (おさきにしつれいします)', note: 'Tôi xin phép về trước ạ (Khi tan sở trước đồng nghiệp)' },
                    { formula: 'いつもお世話になっております', note: 'Cảm ơn quý công ty luôn giúp đỡ (Bắt đầu email / cuộc gọi)' },
                    { formula: '恐れ入りますが (おそれいりますが)', note: 'Mở lời khi chuẩn bị nhờ vả hoặc làm phiền đối phương' }
                ]
            }
        ]
    },
    {
        id: 'synonyms',
        title: 'Từ đồng nghĩa dễ nhầm (Confusing Synonyms)',
        titleJp: '類義語・使い分け',
        level: 'N4-N3',
        category: 'Từ vựng & Ngữ dụng',
        icon: '🔍',
        badge: 'Tránh lỗi giao tiếp',
        summary: 'Phân biệt 思う vs 考える, 聞く vs 尋ねる, 上がる vs 登る, 見る vs 観る vs 拝見する và bí quyết chọn từ chuẩn người bản xứ.',
        hanko: '類義',
        sections: [
            {
                title: 'Cặp từ đồng nghĩa hay bị dùng sai',
                description: 'Sự khác nhau tinh tế trong góc nhìn:',
                formulas: [
                    { formula: '思う (cảm nghĩ cảm tính) vs 考える (suy nghĩ logic có kế hoạch)', note: '美味しいと思う (nghĩ là ngon) vs 将来のことを考える (tính chuyện tương lai)' },
                    { formula: '聞く (nghe âm thanh/hỏi) vs 尋ねる (tra hỏi/hỏi thăm lịch sự)', note: '聞く còn có nghĩa là nghe; 伺う là khiêm nhường ngữ của cả hai' },
                    { formula: '上がる (lên tự nhiên: giá, nhiệt độ) vs 登る (leo trèo có dùng sức: leo núi)', note: '山に登る (leo núi) vs 物価が上がる (giá cả leo thang)' }
                ]
            }
        ]
    },
    {
        id: 'address',
        title: 'Xưng hô & Kính xưng (Forms of Address)',
        titleJp: '呼称・敬称',
        level: 'N5-N3',
        category: 'Giao tiếp & Công sở',
        icon: '🏷️',
        badge: 'Quy tắc Uchi / Soto',
        summary: 'Phân biệt さん, 様 (さま), 君 (くん), ちゃん, 先輩, 氏 và quy tắc xưng hô Trong nhà (うち) vs Bên ngoài (そと) kinh điển.',
        hanko: '呼称',
        sections: [
            {
                title: 'Hệ thống kính xưng tiếng Nhật',
                description: 'Chọn đúng hậu tố xưng hô theo địa vị và mối quan hệ:',
                formulas: [
                    { formula: '〜さん', note: 'Phổ thông, lịch sự cho cả nam và nữ (田中さん)' },
                    { formula: '〜様 (さま)', note: 'Tôn kính nhất cho khách hàng, thư từ, đối tác (お客様, 山田様)' },
                    { formula: '〜君 (くん)', note: 'Dành cho bạn nam cùng tuổi/nhỏ hơn, hoặc sếp gọi nhân viên trẻ' },
                    { formula: '〜ちゃん', note: 'Thân mật dễ thương cho trẻ em, bạn nữ thân thiết' },
                    { formula: 'Quy tắc Uchi / Soto', note: 'Khi nói với khách hàng bên ngoài (そと), người trong công ty mình (うち) TUYỆT ĐỐI KHÔNG dùng 〜さん / 〜様 kể cả với Giám đốc' }
                ]
            }
        ]
    },
    {
        id: 'comparison',
        title: 'So sánh & Đối chiếu (Comparison)',
        titleJp: '比較・対比',
        level: 'N5-N3',
        category: 'Ngữ pháp Cốt lõi',
        icon: '📊',
        badge: 'A より B のほうが',
        summary: 'Các mẫu so sánh hơn nhất, so sánh ngang bằng (ほど〜ない, と同じくらい), và mẫu so sánh đối chiếu (に比べて, 一方で).',
        hanko: '比較',
        sections: [
            {
                title: 'Cấu trúc so sánh toàn tập',
                description: 'Quy tắc thiết lập câu so sánh:',
                formulas: [
                    { formula: '[A] は [B] より [Tính từ] です', note: 'A thì ... hơn B: 飛行機は新幹線より速い' },
                    { formula: '[A] より [B] のほうが [Tính từ] です', note: 'So với A thì B ... hơn' },
                    { formula: '[A] は [B] ほど [Tính từ phủ định]', note: 'A không ... bằng B: 東京はハノイほど暑くない' },
                    { formula: '[Phạm vi] の中で [A] が一番 [Tính từ]', note: 'Trong số... thì A là nhất: 果物の中でりんごが一番好き' }
                ]
            }
        ]
    },
    {
        id: 'conjunctions',
        title: 'Liên từ nối câu (Conjunctions)',
        titleJp: '接続詞',
        level: 'N5-N2',
        category: 'Văn phong',
        icon: '🔗',
        badge: 'Nối câu mượt mà',
        summary: 'Phân loại liên từ theo nhóm: Kết quả (だから, したがって), Tương phản (しかし, ところが), Bổ sung (それに, しかも), Chuyển ý (ところで).',
        hanko: '接続',
        sections: [
            {
                title: 'Phân loại liên từ theo chức năng',
                description: 'Dùng đúng liên từ giúp văn phong tự nhiên:',
                formulas: [
                    { formula: 'Nguyên nhân - Kết quả: だから / したがって / そのため', note: 'Vì vậy, do đó (したがって dùng trong văn viết trang trọng)' },
                    { formula: 'Tương phản: しかし / だが / ところが / けれども', note: 'Tuy nhiên, nhưng mà (ところが = bất ngờ ngoài dự kiến)' },
                    { formula: 'Bổ sung: それに / しかも / そのうえ', note: 'Hơn nữa, vả lại (thêm thông tin cùng hướng tốt hoặc xấu)' },
                    { formula: 'Chuyển chủ đề: ところで / さて', note: 'Nhân tiện, chuyển sang chuyện khác' }
                ]
            }
        ]
    },
    {
        id: 'volition-imperative',
        title: 'Ý chí & Mệnh lệnh (Volitional · Imperative)',
        titleJp: '意向形・命令形',
        level: 'N4-N2',
        category: 'Biến chia Thể',
        icon: '✊',
        badge: 'Ý chí & Cấm chỉ',
        summary: 'Thể ý chí (〜よう), Lịch sự (〜ましょう), Mệnh lệnh trực tiếp (〜ろ/え), Mệnh lệnh nhẹ (〜なさい), Cấm đoán (〜な / 禁忌).',
        hanko: '意向',
        sections: [
            {
                title: 'Các cấp độ từ Rủ rê đến Mệnh lệnh',
                description: 'Sử dụng đúng thể theo ngữ cảnh:',
                formulas: [
                    { formula: 'Thể Ý chí: V-よう / 〜ましょう', note: 'Nhóm 1: cột [o] + う (行こう) | Nhóm 2: bỏ る + よう (食べよう) | Nhóm 3: しよう, こよう' },
                    { formula: 'Mệnh lệnh nhẹ: V[bỏ ます] + なさい', note: 'Bố mẹ bảo con cái, giáo viên bảo học sinh: 早く寝なさい' },
                    { formula: 'Mệnh lệnh trực tiếp: V-ろ / V-え', note: 'Cổ vũ thể thao, tình huống khẩn cấp, cấp trên quát cấp dưới: 走れ！ 早くしろ！' },
                    { formula: 'Cấm đoán: V[từ điển] + な', note: 'Cấm làm: 触るな！(Cấm sờ vào!)' }
                ]
            }
        ]
    },
    {
        id: 'change',
        title: 'Biểu hiện Biến đổi (Change Expressions)',
        titleJp: '変化表現',
        level: 'N4-N3',
        category: 'Sắc thái & Cảm xúc',
        icon: '📈',
        badge: '〜になる vs 〜にする',
        summary: 'Tự biến đổi tự nhiên (〜になる, 〜てくる) vs Con người chủ động biến đổi (〜にする), Xu hướng đang chuyển biến (〜つつある).',
        hanko: '変化',
        sections: [
            {
                title: 'Các mẫu câu diễn tả sự biến đổi',
                description: 'Quy tắc kết hợp:',
                formulas: [
                    { formula: 'A-i -> く / A-na & N -> に + なる', note: 'Biến đổi tự nhiên khách quan: 暖かくなる, 上手になる' },
                    { formula: 'A-i -> く / A-na & N -> に + する', note: 'Chủ động làm biến đổi / Lựa chọn: 音を小さくする, コーヒーにする' },
                    { formula: 'V[ru] / V[nai] + ようになる', note: 'Thay đổi thói quen/khả năng: 漢字が読めるようになった' },
                    { formula: '〜つつある', note: 'Đang trên đà biến đổi dần dần (văn viết N2): 景気は回復しつつある' }
                ]
            }
        ]
    },
    {
        id: 'emphasis',
        title: 'Nhấn mạnh & Giới hạn (Emphasis)',
        titleJp: '強調・限定',
        level: 'N3-N2',
        category: 'Ngữ pháp Nâng cao',
        icon: '💥',
        badge: 'こそ · さえ · どころか',
        summary: 'Phân biệt こそ (chính là), さえ (đến cả), だけでなく (không chỉ), ばかりか (không chỉ mà còn tệ hơn), どころか (nào đâu chỉ).',
        hanko: '強調',
        sections: [
            {
                title: 'Các cấp độ nhấn mạnh trong tiếng Nhật',
                description: 'Từ nhấn mạnh tích cực đến phủ định cực đoan:',
                formulas: [
                    { formula: '〜こそ', note: 'Chính là ~ (nhấn mạnh khẳng định mạnh mẽ): 今年こそ合格する！' },
                    { formula: '〜さえ', note: 'Đến cả, ngay cả (trường hợp cực đoan, tương đương だって nhưng trang trọng hơn): ひらがなさえ読めない' },
                    { formula: '〜だけでなく / 〜ばかりか', note: 'Không chỉ A mà còn cả B (ばかりか thường mang tính tiêu cực hoặc ngạc nhiên)' },
                    { formula: '〜どころか', note: 'Nào đâu chỉ ~ (thực tế còn tệ hơn hoặc khác xa dự tính): 独身どころか、子どもが3人いる' }
                ]
            }
        ]
    },
    {
        id: 'adversative',
        title: 'Nhượng bộ & Tương phản (Adversative)',
        titleJp: '逆接・譲歩',
        level: 'N3-N2',
        category: 'Ngữ pháp Nâng cao',
        icon: '⚡',
        badge: 'のに · くせに · ものの',
        summary: 'Sắc thái thất vọng tiếc nuối (のに), Trách móc miệt thị (くせに), Bất chấp sự thật (にもかかわらず), Thừa nhận nhượng bộ (ものの).',
        hanko: '逆接',
        sections: [
            {
                title: 'Phân biệt các mẫu nhượng bộ tương phản',
                description: 'Bộc lộ thái độ và cảm xúc người nói:',
                formulas: [
                    { formula: '〜のに', note: 'Thế mà, vậy mà (tiếc nuối, thất vọng, bất ngờ ngoài ý muốn): 約束したのに来なかった' },
                    { formula: '〜くせに', note: 'Mặc dù... mà bày đặt (trách móc, khinh miệt, người nói bực tức): 知っているくせに教えてくれない' },
                    { formula: '〜ものの / 〜とはいうものの', note: 'Dù là... nhưng mà (thừa nhận sự thật vế 1 nhưng vế 2 có hạn chế): 免許を取ったものの、運転していない' },
                    { formula: '〜にもかかわらず', note: 'Bất chấp, mặc dù (văn viết trang trọng): 雨にもかかわらず多くの人が集まった' }
                ]
            }
        ]
    },
    {
        id: 'adverb-pairing',
        title: 'Phó từ hô ứng (Adverb Pairing)',
        titleJp: '呼応の副詞',
        level: 'N3-N2',
        category: 'Từ vựng & Ngữ dụng',
        icon: '🎯',
        badge: 'Cặp phó từ + Đuôi câu',
        summary: 'Các cặp bất di bất dịch: まるで〜よう, 決して〜ない, まさか〜ない, どうしても〜できない, もしも〜なら.',
        hanko: '副詞',
        sections: [
            {
                title: 'Các cặp Phó từ & Đuôi câu bắt buộc',
                description: 'Điểm ngữ pháp cực hay xuất hiện trong bài thi JLPT:',
                formulas: [
                    { formula: 'まるで ＋ 〜ようだ / 〜みたいだ', note: 'Cứ như thể là... (so sánh ví von)' },
                    { formula: '決して ＋ 〜ない / 〜ません', note: 'Tuyệt đối không bao giờ... (quyết tâm sắt đá)' },
                    { formula: 'まさか ＋ 〜とは思わなかった / 〜ないだろう', note: 'Không thể ngờ rằng... / Chẳng lẽ lại...' },
                    { formula: 'どうしても ＋ 〜できない / 〜たい', note: 'Dù thế nào cũng không thể... / Bằng mọi giá muốn...' },
                    { formula: 'めったに ＋ 〜ない', note: 'Hiếm khi, hầu như không bao giờ làm gì' }
                ]
            }
        ]
    },
    {
        id: 'advanced-connection',
        title: 'Liên kết Nâng cao N2-N1 (Advanced Connections)',
        titleJp: '上級接続',
        level: 'N2-N1',
        category: 'Văn phong',
        icon: '🏛️',
        badge: 'Cấu trúc N2/N1',
        summary: 'Các mẫu trang trọng đỉnh cao: 〜を契機に, 〜に際して, 〜をもって, 〜に先立ち, 〜にかかわる, 〜を皮切りに, 〜をおいて.',
        hanko: '上級',
        sections: [
            {
                title: 'Mẫu câu liên kết văn phong trang trọng N2-N1',
                description: 'Thường xuất hiện trong diễn văn, báo chí, văn bản hợp đồng:',
                formulas: [
                    { formula: '〜を契機に (〜をけいきに) / 〜を契機として', note: 'Nhân cơ hội ~, lấy mốc sự kiện ~ làm bước ngoặt lớn' },
                    { formula: '〜に際して (〜にさいして) / 〜に際し', note: 'Khi ~, nhân dịp ~ (trang trọng hơn とき)' },
                    { formula: '〜をもって', note: 'Bằng cách ~, Kể từ mốc thời gian ~ (本日をもって閉店いたします)' },
                    { formula: '〜に先立って (〜にさきだって) / 〜に先立ち', note: 'Trước khi bắt đầu ~ thì chuẩn bị...' },
                    { formula: '〜を皮切りに (〜をかわきりに)', note: 'Bắt đầu với ~, mở màn bằng ~ và lan rộng ra' }
                ]
            }
        ]
    },
    {
        id: 'onomatopoeia',
        title: 'Từ tượng thanh & Tượng hình (Onomatopoeia)',
        titleJp: 'オノマトペ',
        level: 'N4-N2',
        category: 'Từ vựng & Ngữ dụng',
        icon: '🎨',
        badge: 'Âm thanh & Cảm xúc',
        summary: 'Nhóm âm thanh (ドキドキ, ワクワク, ペコペコ), Nhóm trạng thái (ピカピカ, バラバラ, ギリギリ), và cách dùng với と / している.',
        hanko: '擬音',
        sections: [
            {
                title: 'Các nhóm từ tượng thanh - tượng hình phổ biến nhất',
                description: 'Làm câu văn trở nên sống động như người bản xứ:',
                formulas: [
                    { formula: 'ドキドキ (hồi hộp, tim đập thình thịch) / ワクワク (háo hức, phấn khích)', note: 'Miêu tả tâm trạng cảm xúc con người' },
                    { formula: 'ペコペコ (bụng đói cồn cào / cúi đầu khúm núm)', note: 'お腹がペコペコだ' },
                    { formula: 'ピカピカ (sáng bóng loáng) / バラバラ (rải rác, lộn xộn)', note: '靴をピカピカに磨く' },
                    { formula: 'ギリギリ (sát nút, vừa kịp giờ) / イライラ (sốt ruột, bực bội)', note: '電車にギリギリ間に合った' }
                ]
            }
        ]
    },
    {
        id: 'sentence-final',
        title: 'Trợ từ cuối câu (Sentence-Final Particles)',
        titleJp: '終助詞',
        level: 'N5-N3',
        category: 'Sắc thái & Cảm xúc',
        icon: '💬',
        badge: 'Thổi hồn vào câu nói',
        summary: 'Tạo cảm xúc chân thực: ね (đồng tình), よ (cung cấp tin mới), かな (tự hỏi), っけ (hỏi xác nhận quá khứ), ぞ/わ/もん/し.',
        hanko: '終助',
        sections: [
            {
                title: 'Ý nghĩa các trợ từ cuối câu',
                description: 'Thổi hồn và ngữ điệu tự nhiên vào lời nói:',
                formulas: [
                    { formula: '〜ね', note: 'Tìm kiếm sự đồng tình, xác nhận: いい天気ですね (Thời tiết đẹp nhỉ)' },
                    { formula: '〜よ', note: 'Cung cấp thông tin mới cho đối phương: 明日は休みですよ (Mai được nghỉ đấy nhé)' },
                    { formula: '〜かな / 〜かしら', note: 'Tự hỏi bản thân, băn khoăn: 明日雨が降るかな (Liệu mai có mưa không nhỉ)' },
                    { formula: '〜っけ', note: 'Hỏi xác nhận điều mình đã quên trong quá khứ: 彼の名前は何だっけ (Tên anh ta là gì ấy nhỉ)' },
                    { formula: '〜もん / 〜もの', note: 'Biện hộ, làm nũng (thân mật): だって疲れたんだもん' }
                ]
            }
        ]
    },
    {
        id: 'pronunciation',
        title: 'Phát âm dễ nhầm (Pronunciation Traps)',
        titleJp: '発音・アクセント',
        level: 'N5-N4',
        category: 'Từ vựng & Ngữ dụng',
        icon: '🗣️',
        badge: 'Trường âm & Xúc âm',
        summary: 'Phân biệt trường âm (おばさん vs おばあさん), Xúc âm (きて vs きって), Ảo âm (びよういん vs びょういん) tránh gây hiểu lầm xấu hổ.',
        hanko: '発音',
        sections: [
            {
                title: 'Các bẫy phát âm người Việt dễ nhầm nhất',
                description: 'Sự khác biệt chỉ 1 nhịp phách nhưng đổi hoàn toàn nghĩa:',
                formulas: [
                    { formula: 'Trường âm: おばさん (cô/bác) vs おばあさん (bà)', note: 'Kéo dài 2 phách nguyên âm' },
                    { formula: 'Trường âm: おじさん (chú/bác) vs おじいさん (ông)', note: 'Gọi nhầm sẽ rất thất lễ' },
                    { formula: 'Xúc âm (っ): 来て (hãy đến) vs 切って (hãy cắt) vs 切手 (con tem)', note: 'Ngắt 1 nhịp nghỉ ở giữa' },
                    { formula: 'Ảo âm: びよういん (thẩm mỹ viện) vs びょういん (bệnh viện)', note: 'Hắt âm nhanh hay đọc thành 2 âm tiết' }
                ]
            }
        ]
    },
    {
        id: 'katakana',
        title: 'Từ mượn Katakana & Bẫy nghĩa (Katakana Traps)',
        titleJp: 'カタカナ語',
        level: 'N5-N3',
        category: 'Từ vựng & Ngữ dụng',
        icon: '🔤',
        badge: 'Wasei-eigo tiếng Anh kiểu Nhật',
        summary: 'Các từ tiếng Anh chế kiểu Nhật khiến người bản xứ phương Tây cũng ngỡ ngàng: マンション (chung cư cao cấp), カンニング (quay cóp), スキンシップ.',
        hanko: '片仮',
        sections: [
            {
                title: 'Từ mượn Wasei-Eigo có nghĩa khác biệt',
                description: 'Đừng dịch nghĩa theo tiếng Anh chuẩn:',
                formulas: [
                    { formula: 'マンション (mansion)', note: 'Trong tiếng Nhật là Căn hộ chung cư cao cấp, không phải biệt thự siêu to như tiếng Anh' },
                    { formula: 'カンニング (cunning)', note: 'Trong tiếng Nhật nghĩa là Gian lận / Quay cóp thi cử, không phải mưu mẹo khôn ngoan' },
                    { formula: 'スキンシップ (skin-ship)', note: 'Từ ghép tiếng Nhật chỉ sự Tiếp xúc thân mật cơ thể (ôm ấp, nắm tay gắn kết)' },
                    { formula: 'コスパ (cost-performance)', note: 'Hiệu năng trên giá thành (ngon bổ rẻ, hời)' }
                ]
            }
        ]
    },
    {
        id: 'counters',
        title: 'Lượng từ & Số đếm (Counters Cheat Sheet)',
        titleJp: '助数詞',
        level: 'N5-N4',
        category: 'Ngữ pháp Cốt lõi',
        icon: '🔢',
        badge: 'Đếm vạn vật tiếng Nhật',
        summary: 'つ (đồ vật chung), 個 (đồ nhỏ gọn), 本 (vật dài/chai lọ), 枚 (vật mỏng phẳng), 匹 (động vật nhỏ), 頭 (động vật lớn), 冊 (sách), 階 (tầng).',
        hanko: '助数',
        sections: [
            {
                title: 'Bảng quy tắc lượng từ đếm đồ vật',
                description: 'Chọn lượng từ đúng theo hình dáng và kích thước:',
                formulas: [
                    { formula: 'つ (ひとつ, ふたつ, みっつ...): Đồ vật trừu tượng / chung', note: 'Chỉ đếm từ 1 đến 10, từ 11 dùng số đếm thường' },
                    { formula: '個 (こ): Đồ vật nhỏ gọn hình khối', note: 'Trứng, táo, bánh bao, cục tẩy (いっこ, にこ, さんこ...)' },
                    { formula: '本 (ほん / ぽん / ぼん): Vật thon dài', note: 'Bút chì, chai nước, cây cối, con đường, tuyến tàu (一本, 二本, 三本...)' },
                    { formula: '枚 (まい): Vật mỏng, phẳng', note: 'Giấy, áo sơ mi, đĩa CD, vé tàu, pizza (いちまい, にまい...)' },
                    { formula: '匹 (ひき / ぴき / びき): Động vật nhỏ, cá, côn trùng', note: 'Chó, mèo, cá (一匹, 二匹, 三匹...)' },
                    { formula: '頭 (とう): Động vật lớn', note: 'Voi, bò, ngựa, cá voi (一頭, 二頭...)' },
                    { formula: '冊 (さつ): Sách vở, tạp chí', note: '一冊, 二冊, 三冊...' },
                    { formula: '台 (だい): Máy móc, xe cộ', note: 'Ô tô, xe máy, máy tính, tủ lạnh (一台, 二台...)' }
                ]
            }
        ]
    },
    {
        id: 'question-words',
        title: 'Từ để hỏi toàn tập (Question Words)',
        titleJp: '疑問詞',
        level: 'N5-N4',
        category: 'Ngữ pháp Cốt lõi',
        icon: '❓',
        badge: '5W1H tiếng Nhật',
        summary: '何 (なん/なに), どこ, だれ/どなた, いつ, どう/いかが, どのくらい, なぜ/どうして, どちら và quy tắc ghép trợ từ (だれか vs だれも vs だれでも).',
        hanko: '疑問',
        sections: [
            {
                title: 'Các từ để hỏi cốt lõi',
                description: 'Bảng tra từ để hỏi và cách ghép trợ từ:',
                formulas: [
                    { formula: '何 (なに / なん)', note: 'Đọc là なん trước d, t, n hoặc lượng từ (何時, 何曜日); Đọc là なに với を (何を食べますか)' },
                    { formula: 'だれ (thân mật) / どなた (lịch sự)', note: 'Ai (Người nào)' },
                    { formula: 'どこ (nơi chốn) / どちら (hướng nào / cái nào / lịch sự)', note: 'Ở đâu / Phía nào' },
                    { formula: 'いつ (khi nào) / なぜ・どうして (tại sao)', note: 'Thời gian / Lý do' },
                    { formula: 'Từ để hỏi + か (bất định) vs + も (phủ định toàn bộ) vs + でも (bất kỳ ai/cái gì)', note: 'だれか (ai đó) vs だれも〜ない (không ai cả) vs だれでも (bất kỳ ai cũng)' }
                ]
            }
        ]
    },
    {
        id: 'demonstratives',
        title: 'Chỉ từ Ko-So-A-Do (Demonstratives)',
        titleJp: 'こそあど言葉',
        level: 'N5-N4',
        category: 'Ngữ pháp Cốt lõi',
        icon: '👉',
        badge: 'Hệ thống chỉ từ',
        summary: 'Ma trận khoảng cách: これ/それ/あれ/どれ (Đồ vật), この/その/あの/どの (Bổ nghĩa N), ここ/そこ/あそこ/どこ (Vị trí), こちら/そちら/あちら/どちら (Hướng/Lịch sự).',
        hanko: '指代',
        sections: [
            {
                title: 'Hệ thống 4 cột Ko - So - A - Do',
                description: 'Xác định khoảng cách so với người nói và người nghe:',
                formulas: [
                    { formula: 'こ (Gần người nói)', note: 'これ (cái này), この本 (sách này), ここ (ở đây), こちら (phía này)' },
                    { formula: 'そ (Gần người nghe)', note: 'それ (cái đó), その本 (sách đó), そこ (ở đó), そちら (phía đó)' },
                    { formula: 'あ (Xa cả hai người)', note: 'あれ (cái kia), あの本 (sách kia), あそこ (ở đằng kia), あちら (phía kia)' },
                    { formula: 'ど (Nghi vấn từ / Hỏi)', note: 'どれ (cái nào), どの本 (sách nào), どこ (ở đâu), どちら (phía nào)' }
                ]
            }
        ]
    }
];

const outputPath = path.resolve('public/data/grammar_cheatsheets.json');
fs.writeFileSync(outputPath, JSON.stringify(FULL_CHEAT_SHEETS, null, 2), 'utf8');
console.log(`-> Successfully compiled ${FULL_CHEAT_SHEETS.length} comprehensive cheat sheets to ${outputPath} (${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB)`);
