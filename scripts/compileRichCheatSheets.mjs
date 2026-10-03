import fs from 'fs';
import path from 'path';

// Let's create an exhaustive and rich compiler for all Cheat Sheets
async function compileRichSheets() {
    console.log('=== STARTING RICH CHEAT SHEETS COMPILER ===');

    const sheets = [
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
            tabs: [
                { id: 'overview', label: 'Tổng quan 3 tầng' },
                { id: 'special_verbs', label: '12 Động từ đặc biệt' },
                { id: 'sonkei', label: 'Tôn kính ngữ (Sonkeigo)' },
                { id: 'kenjou', label: 'Khiêm nhường ngữ (Kenjougo)' },
                { id: 'business', label: '5 Mẫu N2 Công sở' },
                { id: 'mistakes', label: 'Lỗi nhầm lẫn tai hại' }
            ],
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
            comparisons: [
                {
                    pair: 'は vs が',
                    title: 'Trọng tâm thông tin & Chủ đề',
                    waRole: 'は: Nhấn mạnh phần VỊ NGỮ đằng sau (Thông tin mới ở sau は). Nêu chủ đề đã biết.',
                    gaRole: 'が: Nhấn mạnh chính CHỦ NGỮ đứng trước (Thông tin mới/nổi bật ở trước が). Chỉ hiện tượng khách quan.',
                    examples: [
                        { ja: '誰が来ましたか。 — 田中さんが来ました。', vi: 'Ai đã đến vậy? — Anh Tanaka đã đến. (が trả lời cho từ để hỏi 誰)' },
                        { ja: '田中さんは来ましたか。 — はい、田中さんは来ました。', vi: 'Anh Tanaka đã đến chưa? — Vâng, anh Tanaka đã đến rồi. (Chủ đề Tanaka đã biết)' }
                    ]
                },
                {
                    pair: 'に vs で',
                    title: 'Điểm đến / Tồn tại vs Nơi diễn ra hành động',
                    waRole: 'に: Điểm đến của chuyển động (行く), nơi tồn tại tĩnh (ある/いる), thời điểm xác định.',
                    gaRole: 'で: Nơi diễn ra hành động động thái (ăn, học, chơi), phương tiện, nguyên nhân.',
                    examples: [
                        { ja: '図書館に行きます。 / 公園に猫がいます。', vi: 'Đi đến thư viện (đích) / Ở công viên có con mèo (tồn tại).' },
                        { ja: '図書館で勉強します。 / 電車で行きます。', vi: 'Học ở thư viện (nơi hành động) / Đi bằng tàu điện (phương tiện).' }
                    ]
                }
            ],
            particlesList: [
                { particle: 'は (wa)', meaning: 'Chủ đề, đối chiếu, nhấn mạnh phủ định', formula: 'N + は', sample: '私はベトナム人です。 / 肉は食べますが、魚は食べません。' },
                { particle: 'が (ga)', meaning: 'Chủ ngữ nổi bật, hiện tượng khách quan, tân ngữ của tính từ/khả năng', formula: 'N + が', sample: '雨が降っています。 / 私は日本語が分かります。' },
                { particle: 'を (wo/o)', meaning: 'Tân ngữ trực tiếp, nơi chốn chuyển động xuyên qua/rời khỏi', formula: 'N + を + V', sample: 'ご飯を食べます。 / 公園を散歩します。 / 電車を降ります。' },
                { particle: 'に (ni)', meaning: 'Đích đến, thời gian cụ thể, đối tượng tiếp nhận, nơi tồn tại', formula: 'N + に', sample: '7時に起きます。 / 友達に本をあげます。 / 東京に住んでいます。' },
                { particle: 'で (de)', meaning: 'Nơi diễn ra hành động, phương tiện, công cụ, nguyên nhân, phạm vi', formula: 'N + で', sample: '箸で食べます。 / カフェで仕事をします。 / 病気で休みました。' },
                { particle: 'へ (e)', meaning: 'Phương hướng di chuyển (hướng về phía)', formula: 'N + へ + V di chuyển', sample: '日本へ行きます。 / 未来への第一歩。' },
                { particle: 'と (to)', meaning: 'Cùng với (cùng làm), liệt kê toàn bộ (và), trích dẫn', formula: 'N + と + N / [Câu] + と + 言う/思う', sample: '友達と遊びます。 / りんごとみかんを買った。 / 明日雨だと聞いた。' },
                { particle: 'も (mo)', meaning: 'Cũng, đến mức (số từ lớn), hoàn toàn không (khi đi với phủ định)', formula: 'N + も', sample: '私も行きます。 / 100人も来ました。 / 何も知りません。' }
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
            flows: [
                {
                    type: 'あげる (Tặng / Cho)',
                    direction: 'Tôi / Nhóm tôi  ——>  Người khác  (hoặc Người A ——> Người B)',
                    formula: '[Người cho] は [Người nhận] に [Vật] を あげる / さしあげる',
                    sample: '私は妹にプレゼントをあげました。 / 社長にお土産を差し上げました。'
                },
                {
                    type: 'くれる (Cho tôi / Cho người phe tôi)',
                    direction: 'Người khác  ——>  Tôi / Gia đình tôi',
                    formula: '[Người cho] が 私 / [Người phe tôi] に [Vật] を くれる / くださる',
                    sample: '田中さんが私に本をくれました。 / 先生が推薦状を書いてくださいました。'
                },
                {
                    type: 'もらう (Nhận từ ai đó)',
                    direction: 'Tôi / Người nhận  <——  Người cho',
                    formula: '[Người nhận] は [Người cho] に / から [Vật] を もらう / いただく',
                    sample: '私は友達にプレゼントをもらいました。 / 先生に教えていただきました。'
                }
            ],
            teFormCombos: [
                { pattern: '〜てあげる', meaning: 'Làm giúp ai đó một việc (cẩn thận vì có sắc thái ban ơn)' },
                { pattern: '〜てくれる / 〜てくださる', meaning: 'Ai đó làm giúp mình một việc (bày tỏ sự biết ơn sâu sắc)' },
                { pattern: '〜てもらう / 〜ていただく', meaning: 'Được ai đó làm cho việc gì (chủ ngữ là người nhận ơn)' }
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
            subsections: [
                {
                    title: '1. Thể Bị động (受身形 - Ukemi)',
                    meaning: 'Bị / Được tác động bởi ai đó.',
                    conjugation: 'Nhóm 1: âm [u] -> [a] + れる (書く -> 書かれる) | Nhóm 2: bỏ る + られる (食べる -> 食べられる) | Nhóm 3: される / こられる',
                    specialNotes: '★ Bị động gián tiếp / phiền toái (迷惑受身): Diễn tả sự bực bội, chịu tổn thất dù không phải tân ngữ trực tiếp (雨に降られた = Tôi bị dính cơn mưa phiền toái).'
                },
                {
                    title: '2. Thể Sai khiến (使役形 - Shieki)',
                    meaning: 'Bắt / Cho phép ai làm gì.',
                    conjugation: 'Nhóm 1: âm [u] -> [a] + せる (行く -> 行かせる) | Nhóm 2: bỏ る + させる (食べる -> 食べさせる) | Nhóm 3: させる / こさせる',
                    specialNotes: '★ Mẫu xin phép kinh điển: 〜させていただけませんか (Xin phép cho tôi được làm...)'
                },
                {
                    title: '3. Thể Bị động Sai khiến (使役受身形 - Shieki Ukemi)',
                    meaning: 'Bị ép buộc phải làm điều mình không thích.',
                    conjugation: 'Nhóm 1: âm [u] -> [a] + せられる / される (飲まされる, 行かされる) | Nhóm 2: させられる (食べさせられる) | Nhóm 3: させられる / こさせられる',
                    specialNotes: 'Ví dụ: 嫌いな野菜を食べさせられた。(Bị ép ăn món rau ghét).'
                }
            ]
        },
        {
            id: 'transitivity',
            title: 'Tự động từ & Tha động từ (Transitivity Cheat Sheet)',
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
            ],
            stateComparison: [
                { pattern: '〜ている (đi với Tự động từ)', meaning: 'Diễn tả trạng thái kết quả tự nhiên đang diễn ra (ドアが開いている = Cửa đang mở)' },
                { pattern: '〜てある (đi với Tha động từ)', meaning: 'Diễn tả trạng thái có chủ đích của con người đã được chuẩn bị trước (カレンダーに予定が書いてある = Lịch trình đã được ghi sẵn)' }
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
            patterns: [
                { pattern: '〜そうだ (Trực giác / Vẻ như)', basis: 'Nhìn bằng mắt trực tiếp, cảm nhận sắp xảy ra', formula: 'V[stem] / A[bỏ i/na] + そうだ', sample: '今にも雨が降りそうだ。 / 美味しそうなケーキ。' },
                { pattern: '〜そうだ (Nghe nói)', basis: 'Truyền đạt lại tin tức từ nguồn khác', formula: 'Thể thường + そうだ', sample: '明日は雨が降るそうだ。 (Nghe nói ngày mai mưa)' },
                { pattern: '〜ようだ (Hình như / Ước đoán)', basis: 'Căn cứ vào giác quan tổng hợp hoặc so sánh ví von', formula: 'Thể thường + ようだ / N + のようだ', sample: '誰もいないようだ。 / まるで夢のようだ。' },
                { pattern: '〜らしい (Dường như / Chuẩn chất)', basis: 'Nghe từ tin đồn bên ngoài hoặc thể hiện bản chất tiêu biểu', formula: 'N / Thể thường + らしい', sample: '山田さんは結婚したらしい。 / 今日は春らしい天気だ。' },
                { pattern: '〜はずだ (Chắc chắn / Lẽ ra)', basis: 'Có lý do logic, tính toán hiển nhiên', formula: 'Thể thường / N+の + はずだ', sample: '彼は日本に5年住んでいたから、話せるはずだ。' },
                { pattern: '〜に違いない (Chắc chắn không sai được)', basis: 'Phán đoán chủ quan mạnh mẽ tuyệt đối của người nói', formula: 'Thể thường / N / A-na + に違いない', sample: '犯人は彼に違いない。' }
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
            rules: [
                { target: 'Bắt buộc dùng の', when: 'Hành động cảm nhận qua 5 giác quan trực tiếp (nhìn, nghe, đợi) hoặc động từ dừng/ngăn lại', sample: '赤ちゃんが泣いているのを聞いた。 / 彼が走るのを手伝った。' },
                { target: 'Bắt buộc dùng こと', when: 'Các mẫu cố định: ことができる, ことがある, ことにする; Diễn tả lời nói, mệnh lệnh, thông điệp truyền đạt', sample: 'ピアノを弾くことができます。 / 日本へ行ったことがあります。' },
                { target: 'Bản chất của もの', when: 'Chỉ vật thể hữu hình, quy luật tự nhiên đạo lý của con người, hoặc cảm thán hoài niệm', sample: '子どもは遊ぶものだ。(Trẻ con thì tất nhiên phải chơi đùa rồi).' }
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
            items: [
                { pattern: '〜だけ', meaning: 'Chỉ (đơn thuần, trung tính, đi với khẳng định hoặc phủ định)', sample: '100円だけあります。' },
                { pattern: '〜しか〜ない', meaning: 'Chỉ vỏn vẹn (mang cảm xúc tiếc nuối, chê ít, bắt buộc đi với V phủ định)', sample: '100円しかありません。(Chỉ có vỏn vẹn 100 yên thôi)' },
                { pattern: '〜ばかり', meaning: 'Toàn là, chỉ toàn (tần suất lặp lại nhiều gây khó chịu)', sample: 'テレビゲームばかりしている。' },
                { pattern: '〜ほど', meaning: 'Đến mức, càng... càng...', sample: '泣きたいほど痛い。 / 考えれば考えるほど分からない。' },
                { pattern: '〜くらい / ぐらい', meaning: 'Khoảng, cỡ chừng (mức độ nhẹ nhàng)', sample: '簡単な漢字ぐらい読めます。' }
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
            patterns: [
                { pattern: '〜うちに', meaning: 'Trong lúc còn... tranh thủ làm / Trong khi đang... thì biến đổi diễn ra', sample: '温かいうちに召し上がってください。 / 知らないうちに寝てしまった。' },
                { pattern: '〜あいだ / あいだに', meaning: 'Trong suốt khoảng thời gian (あいだ) / Tại một thời điểm trong khoảng (あいだに)', sample: '夏休みの間、ずっと勉強した。 / 留守の間に泥棒が入った。' },
                { pattern: '〜最中に (さいちゅうに)', meaning: 'Đúng vào lúc cao trào đang diễn ra thì có việc bất ngờ xen vào', sample: '食事の最中に電話がかかってきた。' },
                { pattern: '〜たびに', meaning: 'Cứ mỗi lần A là lại B', sample: 'この写真を見るたびに、母を思い出す。' },
                { pattern: '〜ついでに', meaning: 'Nhân tiện làm A thì tiện thể làm luôn B', sample: '買い物のついでに、郵便局へ寄った。' }
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
            comparisons: [
                { spoken: '〜です / 〜だ', written: '〜である', note: 'Văn phong học thuật, báo chí, báo cáo' },
                { spoken: '〜ないで / 〜なくて', written: '〜ずに / 〜ず (V-nai bỏ nai)', note: 'Phủ định văn viết (食べずに = 食べないで)' },
                { spoken: '〜ながら', written: '〜つつ', note: 'Vừa... vừa... (歩きつつ考える)' },
                { spoken: '〜なければならない', written: '〜ねばならない / 〜べきだ', note: 'Nghĩa vụ, điều đương nhiên nên làm' },
                { spoken: '〜ないだろう', written: '〜まい', note: 'Quyết không / Chắc là không (二度と行くまい)' }
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
            situations: [
                { context: 'Chào hỏi đồng nghiệp / Cấp dưới', phrase: 'お疲れ様です (おつかれさまです)', note: 'Dùng hàng ngày khi gặp hoặc kết thúc ngày làm việc.' },
                { context: 'Chào sếp / Khách hàng khi ra về', phrase: 'お先に失礼します (おさきにしつれいします)', note: 'Tôi xin phép về trước ạ. Người ở lại đáp: お疲れ様でした.' },
                { context: 'Nói với đối tác khi gọi điện/gặp mặt', phrase: 'いつもお世話になっております', note: 'Cảm ơn quý công ty luôn giúp đỡ, hợp tác.' },
                { context: 'Khi vào phòng hoặc làm phiền ai đó', phrase: '失礼いたします / 恐れ入ります', note: 'Xin thất lễ / Xin thứ lỗi.' }
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
            titles: [
                { suffix: '〜さん', usage: 'Phổ biến nhất, lịch sự trung tính cho cả nam và nữ.', sample: '田中さん、鈴木さん' },
                { suffix: '〜様 (さま)', usage: 'Trang trọng nhất, dùng cho khách hàng, thư từ công việc, thần thánh.', sample: 'お客様、山田様' },
                { suffix: '〜君 (くん)', usage: 'Dùng cho bạn nam cùng tuổi/nhỏ hơn, hoặc sếp gọi nhân viên trẻ (cả nam lẫn nữ).', sample: '佐藤君' },
                { suffix: '〜ちゃん', usage: 'Thân mật, dễ thương dùng cho trẻ em, thú cưng, bạn gái thân thiết.', sample: '花子ちゃん' },
                { suffix: '〜先輩 (せんぱい)', usage: 'Dành cho tiền bối khóa trên trong trường hoặc công ty.', sample: '先輩' },
                { suffix: '〜氏 (し)', usage: 'Dùng trong văn viết, báo chí khi nhắc đến nhân vật công cộng.', sample: 'A氏' }
            ]
        }
    ];

    const outputPath = path.resolve('public/data/grammar_cheatsheets.json');
    fs.writeFileSync(outputPath, JSON.stringify(sheets, null, 2), 'utf8');
    console.log(`-> Compiled and saved ${sheets.length} rich cheat sheets to ${outputPath} (${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB)`);
}

compileRichSheets().catch(console.error);
