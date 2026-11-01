/**
 * Stage 4: N4 Sơ Trung Cấp (Minna no Nihongo Bài 26 - 38 & Thể Động Từ Biến Hóa)
 */
export const STAGE_4_MINNA_26_38 = {
    stage: 4,
    id: 'ja_stage_4',
    title: 'Chặng 4: N4 Sơ Trung Cấp (Minna 26-38 & Thể Động Từ)',
    sub: 'Thể khả năng, tự/tha động từ, chuẩn bị trước, thể ý chí, bị động & danh từ hóa.',
    icon: '⚡',
    color: 'amber',
    lessons: [
        {
            id: 'ja_s4_l1',
            title: 'Minna 26-27: Giải Thích Lý Do & Thể Khả Năng',
            shortTitle: '〜んです・Thể khả năng',
            desc: 'Nhấn mạnh lý do, thắc mắc (〜んです / 〜んですか) và cách chia Động từ thể Khả năng (可能動詞: 読める, 食べられる).',
            icon: '🔍',
            xp: 35,
            items: {
                vocab: [
                    { word: '間に合います', reading: 'まにあいます', meaning: 'Kịp giờ (xe buýt, cuộc hẹn)' },
                    { word: '探します', reading: 'さがします', meaning: 'Tìm kiếm' },
                    { word: '片づけます', reading: 'かたづけます', meaning: 'Dọn dẹp ngăn nắp' },
                    { word: '見えます', reading: 'みえます', meaning: 'Nhìn thấy (tự nhiên lọt vào mắt)' },
                    { word: '聞こえます', reading: 'きこえます', meaning: 'Nghe thấy (tự nhiên lọt vào tai)' }
                ],
                kanji: [
                    { character: '始', sinoViet: 'THỦY', meaning: 'Bắt đầu', onyomi: 'SHI', kunyomi: 'haji-maru, haji-meru' },
                    { character: '終', sinoViet: 'CHUNG', meaning: 'Kết thúc', onyomi: 'SHUU', kunyomi: 'o-waru, o-eru' },
                    { character: '考', sinoViet: 'KHẢO', meaning: 'Suy xét, suy nghĩ', onyomi: 'KOU', kunyomi: 'kanga-eru' },
                    { character: '開', sinoViet: 'KHAI', meaning: 'Mở cửa', onyomi: 'KAI', kunyomi: 'a-ku, hira-ku' },
                    { character: '閉', sinoViet: 'BẾ', meaning: 'Đóng cửa', onyomi: 'HEI', kunyomi: 'shi-maru, to-jiru' }
                ],
                grammar: [
                    { id: 'n4_ndesu', pattern: 'Thể thông thường + んです / んですか', meaning: 'Nhấn mạnh nguyên nhân, lý do, tìm kiếm giải thích', meaningShort: 'Giải thích lý do' },
                    { id: 'n4_kanoukei', pattern: 'Động từ thể Khả năng (可能形) + ができる', meaning: 'Có thể làm gì', meaningShort: 'Thể khả năng' },
                    { id: 'n4_miemasu_kikoemasu', pattern: 'N が 見えます / 聞こえます', meaning: 'Nhìn thấy / Nghe thấy N', meaningShort: 'Thị giác & thính giác' }
                ]
            },
            questions: [
                {
                    type: 'choice',
                    prompt: 'Thể khả năng của động từ "書きます" (kakimasu) là gì?',
                    character: '書ける',
                    reading: 'kakeru',
                    audio: 'かける',
                    options: ['書ける (kakeru)', '書かれる (kakareru)', '書かせる (kakaseru)', '書きたてる (kakitateru)'],
                    correctIndex: 0,
                    explanation: 'Động từ nhóm 1: đổi âm "i" trước ます thành âm "e" -> 書きます -> 書ける (có thể viết).'
                },
                {
                    type: 'choice',
                    prompt: 'Câu hỏi "どうしたんですか" dùng để làm gì?',
                    character: 'どうしたんですか',
                    reading: 'doushita n desu ka',
                    audio: 'どうしたんですか',
                    options: ['Hỏi thăm quan tâm: Bạn có chuyện gì thế?', 'Hỏi giờ giấc', 'Hỏi đường đi', 'Lời chào tạm biệt'],
                    correctIndex: 0,
                    explanation: 'どうしたんですか = Có chuyện gì xảy ra với bạn thế? (Thể 〜んです nhấn mạnh quan tâm).'
                },
                {
                    type: 'matching',
                    prompt: 'Nối cặp động từ thể từ điển và thể khả năng:',
                    pairs: [
                        { left: '飲む (nomu - Uống)', right: '飲める (nomeru - Có thể uống)' },
                        { left: '話す (hanasu - Nói)', right: '話せる (hanaseru - Có thể nói)' },
                        { left: '食べる (taberu - Ăn)', right: '食べられる (taberareru - Có thể ăn)' },
                        { left: '来る (kuru - Đến)', right: '来られる (korareru - Có thể đến)' }
                    ]
                }
            ]
        },
        {
            id: 'ja_s4_l2',
            title: 'Minna 28-29: Hành Động Song Song & Tự / Tha Động Từ',
            shortTitle: '〜ながら・Tự & Tha động từ',
            desc: 'Làm 2 việc cùng lúc (〜ながら) và phân biệt cặp Tự động từ (ドアが開きます) với Tha động từ (ドアを開けます).',
            icon: '🚪',
            xp: 35,
            items: {
                vocab: [
                    { word: '咲きます', reading: 'さきます', meaning: 'Nở (hoa)' },
                    { word: '開きます', reading: 'あきます', meaning: 'Tự mở (cửa tự mở ra)' },
                    { word: '閉まります', reading: 'しまります', meaning: 'Tự đóng (cửa tự khép lại)' },
                    { word: '壊れます', reading: 'こわれます', meaning: 'Bị hỏng, tự đổ vỡ' },
                    { word: '汚れます', reading: 'よごれます', meaning: 'Bị bẩn, lấm lem' },
                    { word: '落ちます', reading: 'おちます', meaning: 'Rơi xuống' }
                ],
                kanji: [
                    { character: '運', sinoViet: 'VẬN', meaning: 'Vận chuyển, may mắn', onyomi: 'UN', kunyomi: 'hako-bu' },
                    { character: '動', sinoViet: 'ĐỘNG', meaning: 'Chuyển động, hoạt động', onyomi: 'DOU', kunyomi: 'ugo-ku' },
                    { character: '転', sinoViet: 'CHUYỂN', meaning: 'Chuyển dời, ngã', onyomi: 'TEN', kunyomi: 'koro-bu' },
                    { character: '族', sinoViet: 'TỘC', meaning: 'Gia tộc, bộ tộc', onyomi: 'ZOKU', kunyomi: '' },
                    { character: '旅', sinoViet: 'LỮ', meaning: 'Du lịch', onyomi: 'RYO', kunyomi: 'tabi' },
                    { character: '映', sinoViet: 'ÁNH', meaning: 'Phản chiếu', onyomi: 'EI', kunyomi: 'utsu-ru' },
                    { character: '画', sinoViet: 'HỌA', meaning: 'Tranh vẽ, kế hoạch', onyomi: 'GA, KAKU', kunyomi: '' }
                ],
                grammar: [
                    { id: 'n4_nagara', pattern: 'V1ます(bỏ ます) + ながら + V2', meaning: 'Vừa làm V1 vừa làm V2 (hành động 2 là chính)', meaningShort: 'Vừa... vừa...' },
                    { id: 'n4_jidoushi_teiru', pattern: 'Tự động từ + ています', meaning: 'Diễn tả trạng thái kết quả của sự vật đang duy trì', meaningShort: 'Trạng thái tự động từ' }
                ]
            },
            questions: [
                {
                    type: 'choice',
                    prompt: '"音楽を聞きながら、勉強します" nghĩa là gì?',
                    character: '音楽を聞きながら、勉強します',
                    reading: 'ongaku o kikinagara benkyou shimasu',
                    audio: 'おんがくをききながらべんきょうします',
                    options: ['Tôi vừa nghe nhạc vừa học bài', 'Tôi nghe nhạc xong mới học bài', 'Tôi thích vừa ăn vừa nghe nhạc', 'Tôi không thể nghe nhạc khi học'],
                    correctIndex: 0,
                    explanation: 'V1 ます + ながら + V2: Vừa làm hành động 1 vừa làm hành động 2 (học là chính, nghe nhạc là phụ).'
                },
                {
                    type: 'matching',
                    prompt: 'Nối cặp Tự động từ (が) và Tha động từ (を):',
                    pairs: [
                        { left: 'ドアが開く (Cửa tự mở)', right: 'ドアを開ける (Mở cửa ra)' },
                        { left: '電気がつく (Đèn tự sáng)', right: '電気をつける (Bật đèn lên)' },
                        { left: '車が止まる (Xe tự dừng)', right: '車を止める (Dừng xe lại)' },
                        { left: '鍵がかかる (Khóa đang đóng)', right: '鍵をかける (Khóa cửa)' }
                    ]
                },
                {
                    type: 'choice',
                    prompt: 'Câu "窓が閉まっています" miêu tả điều gì?',
                    character: '窓が閉まっています',
                    reading: 'mado ga shimatte imasu',
                    audio: 'まどがしまっています',
                    options: ['Cửa sổ đang ở trạng thái đóng', 'Ai đó đang đóng cửa sổ', 'Cửa sổ bị vỡ', 'Hãy đóng cửa sổ lại'],
                    correctIndex: 0,
                    explanation: 'Tự động từ 閉まる + ています diễn tả trạng thái hiện tại của cửa sổ (đang đóng).'
                }
            ]
        },
        {
            id: 'ja_s4_l3',
            title: 'Minna 30-32: Chuẩn Bị Trước & Thể Ý Chí',
            shortTitle: '〜てある・〜ておく・意向形',
            desc: 'Diễn tả mục đích chuẩn bị sẵn (〜てあります), làm sẵn trước (〜ておきます), Thể Ý Chí (意向形) và lời khuyên (〜ほうがいい).',
            icon: '📝',
            xp: 35,
            items: {
                vocab: [
                    { word: '予定', reading: 'よてい', meaning: 'Dự định / Kế hoạch' },
                    { word: '知らせます', reading: 'しらせます', meaning: 'Thông báo / Cho biết' },
                    { word: '案内します', reading: 'あんないします', meaning: 'Dẫn đường / Hướng dẫn' },
                    { word: '予定表', reading: 'よていひょう', meaning: 'Bảng lịch trình' },
                    { word: '復習', reading: 'ふくしゅう', meaning: 'Ôn tập bài cũ' },
                    { word: '予習', reading: 'よしゅう', meaning: 'Soạn bài trước' }
                ],
                kanji: [
                    { character: '意', sinoViet: 'Ý', meaning: 'Ý chí, ý kiến', onyomi: 'I', kunyomi: '' },
                    { character: '味', sinoViet: 'VỊ', meaning: 'Hương vị', onyomi: 'MI', kunyomi: 'aji' },
                    { character: '注', sinoViet: 'CHÚ', meaning: 'Rót, chú ý', onyomi: 'CHUU', kunyomi: 'soso-gu' },
                    { character: '集', sinoViet: 'TẬP', meaning: 'Thu thập, tập hợp', onyomi: 'SHUU', kunyomi: 'atsu-maru, atsu-meru' },
                    { character: '研', sinoViet: 'NGHIÊN', meaning: 'Mài giũa, nghiên cứu', onyomi: 'KEN', kunyomi: 'to-gu' },
                    { character: '究', sinoViet: 'CỨU', meaning: 'Nghiên cứu đến cùng', onyomi: 'KYUU', kunyomi: 'kiwa-meru' }
                ],
                grammar: [
                    { id: 'n4_te_aru', pattern: 'Tha động từ thể て + あります', meaning: 'Được làm sẵn với mục đích nào đó', meaningShort: 'Làm sẵn có chủ ý' },
                    { id: 'n4_te_oku', pattern: 'Vて + おきます', meaning: 'Làm trước điều gì đó để chuẩn bị', meaningShort: 'Làm trước chuẩn bị' },
                    { id: 'n4_ikoukei', pattern: 'Động từ thể Ý Chí (意向形) + と思っています', meaning: 'Dự định sẽ làm gì', meaningShort: 'Thể ý chí' },
                    { id: 'n4_hou_ga_ii', pattern: 'Vた + ほうがいいです', meaning: 'Nên làm V thì tốt hơn (Lời khuyên)', meaningShort: 'Nên làm gì' }
                ]
            },
            questions: [
                {
                    type: 'choice',
                    prompt: 'Thể ý chí của động từ "行きます" (ikimasu) là gì?',
                    character: '行こう',
                    reading: 'ikou',
                    audio: 'いこう',
                    options: ['行こう (ikou)', '行きたい (ikitai)', '行ける (ikeru)', '行かせ (ikase)'],
                    correctIndex: 0,
                    explanation: 'Động từ nhóm 1: đổi âm "i" thành âm "o" rồi thêm う -> 行く -> 行こう.'
                },
                {
                    type: 'choice',
                    prompt: '"旅行の前に、切符を買っておきます" có nghĩa là gì?',
                    character: '旅行の前に、切符を買っておきます',
                    reading: 'ryokou no mae ni kippu o katte okimasu',
                    audio: 'りょこうのまえにきっぷをかっておきます',
                    options: ['Trước chuyến du lịch, tôi sẽ mua vé sẵn trước', 'Tôi đã mua vé du lịch rồi', 'Sau chuyến du lịch tôi mới mua vé', 'Vé du lịch đắt quá'],
                    correctIndex: 0,
                    explanation: '〜ておきます biểu thị hành động chuẩn bị trước: Mua vé sẵn trước.'
                },
                {
                    type: 'matching',
                    prompt: 'Nối các cấu trúc lời khuyên và dự định:',
                    pairs: [
                        { left: '〜たほうがいい', right: 'Nên làm gì đó (Lời khuyên)' },
                        { left: '〜ないほうがいい', right: 'Không nên làm gì đó' },
                        { left: '〜つもりです', right: 'Có dự định / ý định làm gì' },
                        { left: '〜よていです', right: 'Theo lịch trình đã định' }
                    ]
                }
            ]
        },
        {
            id: 'ja_s4_l4',
            title: 'Minna 33-35: Mệnh Lệnh, Cấm Chỉ & Câu Điều Kiện',
            shortTitle: 'Thể Mệnh lệnh・〜ば',
            desc: 'Thể mệnh lệnh (命令形), thể cấm chỉ (禁止形), làm theo như (〜とおりに) và thể điều kiện (〜ば).',
            icon: '🛑',
            xp: 35,
            items: {
                vocab: [
                    { word: '逃げます', reading: 'にげます', meaning: 'Chạy trốn, đào tẩu' },
                    { word: '諦めます', reading: 'あきらめます', meaning: 'Từ bỏ, buông xuôi' },
                    { word: '守ります', reading: 'まもります', meaning: 'Tuân thủ, bảo vệ' },
                    { word: '規則', reading: 'きそく', meaning: 'Quy tắc, nội quy' },
                    { word: '故障', reading: 'こしょう', meaning: 'Hỏng hóc, sự cố máy móc' }
                ],
                kanji: [
                    { character: '質', sinoViet: 'CHẤT', meaning: 'Chất lượng, bản chất', onyomi: 'SHITSU', kunyomi: '' },
                    { character: '問', sinoViet: 'VẤN', meaning: 'Hỏi han', onyomi: 'MON', kunyomi: 'to-u' },
                    { character: '題', sinoViet: 'ĐỀ', meaning: 'Chủ đề, tiêu đề', onyomi: 'DAI', kunyomi: '' },
                    { character: '答', sinoViet: 'ĐÁP', meaning: 'Trả lời, đáp số', onyomi: 'TOU', kunyomi: 'kota-eru' },
                    { character: '宿', sinoViet: 'TÚC', meaning: 'Quán trọ, nhà ở', onyomi: 'SHUKU', kunyomi: 'yado' }
                ],
                grammar: [
                    { id: 'n4_meireikei', pattern: 'Động từ thể Mệnh Lệnh (命令形) / Cấm Chỉ (禁止形)', meaning: 'Ra lệnh dứt khoát hoặc biển báo cấm', meaningShort: 'Mệnh lệnh & Cấm chỉ' },
                    { id: 'n4_toorini', pattern: 'V1(nguyên mẫu/Vた) + とおりに, V2', meaning: 'Làm theo đúng như V1', meaningShort: 'Theo đúng như...' },
                    { id: 'n4_ba_form', pattern: 'Vば / Aければ', meaning: 'Nếu... thì... (Thể điều kiện)', meaningShort: 'Thể điều kiện' }
                ]
            },
            questions: [
                {
                    type: 'choice',
                    prompt: 'Thể cấm chỉ (禁止形) của động từ "入ります" (hairimasu) là gì?',
                    character: '入るな',
                    reading: 'hairu na',
                    audio: 'はいるな',
                    options: ['入るな (hairu na - Cấm vào)', '入る (hairu)', '入りない (hairinai)', '入らないで (hairanaide)'],
                    correctIndex: 0,
                    explanation: 'Thể cấm chỉ = Động từ thể từ điển + な (Ví dụ: 入るな = Cấm vào!).'
                },
                {
                    type: 'choice',
                    prompt: '"安ければ、買います" có nghĩa là gì?',
                    character: '安ければ、買います',
                    reading: 'yasukereba kaimasu',
                    audio: 'やすければかいます',
                    options: ['Nếu mà rẻ thì tôi sẽ mua', 'Vì đắt quá nên tôi không mua', 'Dù rẻ tôi cũng không mua', 'Giá tiền bao nhiêu vậy?'],
                    correctIndex: 0,
                    explanation: 'Tính từ đuôi い đổi thành ければ = Thể điều kiện: 安ければ = Nếu rẻ.'
                },
                {
                    type: 'matching',
                    prompt: 'Nối cách chia thể điều kiện (〜ば):',
                    pairs: [
                        { left: '行きます (Đi)', right: '行けば (Nếu đi)' },
                        { left: '食べます (Ăn)', right: '食べれば (Nếu ăn)' },
                        { left: '来ます (Đến)', right: '来れば (kureba - Nếu đến)' },
                        { left: 'します (Làm)', right: 'すれば (Nếu làm)' }
                    ]
                }
            ]
        },
        {
            id: 'ja_s4_l5',
            title: 'Minna 36-38: Mục Đích, Bị Động & Danh Từ Hóa',
            shortTitle: '〜ように・Thể Bị động・〜のは',
            desc: 'Cố gắng tạo thói quen (〜ようにします), Động từ Thể Bị Động (受身動詞: 褒められる) và Danh từ hóa câu văn (〜のは〜です).',
            icon: '🛡️',
            xp: 35,
            items: {
                vocab: [
                    { word: '褒めます', reading: 'ほめます', meaning: 'Khen ngợi' },
                    { word: '叱ります', reading: 'しかります', meaning: 'La mắng' },
                    { word: '頼みます', reading: 'たのみます', meaning: 'Nhờ vả, đặt món' },
                    { word: '盗みます', reading: 'ぬすみます', meaning: 'Ăn trộm, đánh cắp' },
                    { word: '踏みます', reading: 'ふみます', meaning: 'Giẫm lên (chân)' }
                ],
                kanji: [
                    { character: '受', sinoViet: 'THỤ', meaning: 'Tiếp nhận, chịu đựng', onyomi: 'JU', kunyomi: 'u-keru' },
                    { character: '付', sinoViet: 'PHÓ', meaning: 'Gắn kèm, dán', onyomi: 'FU', kunyomi: 'tsu-ku, tsu-keru' },
                    { character: '送', sinoViet: 'TỐNG', meaning: 'Gửi hàng, tiễn', onyomi: 'SOU', kunyomi: 'oku-ru' },
                    { character: '届', sinoViet: 'GIỚI', meaning: 'Chuyển đến, đạt tới', onyomi: 'KAI', kunyomi: 'todo-ku, todo-keru' },
                    { character: '貸', sinoViet: 'THẢI', meaning: 'Cho vay, cho mượn', onyomi: 'TAI', kunyomi: 'ka-su' },
                    { character: '借', sinoViet: 'TÁ', meaning: 'Vay mượn', onyomi: 'SHAKU', kunyomi: 'ka-riru' }
                ],
                grammar: [
                    { id: 'n4_youni_suru', pattern: 'V(từ điển) / Vない + ように します', meaning: 'Cố gắng làm / không làm V (tạo lập thói quen)', meaningShort: 'Cố gắng thói quen' },
                    { id: 'n4_ukemikei', pattern: 'Người bị hại は Người tác động に V(bị động) られました', meaning: 'Bị ai đó làm điều gì tác động', meaningShort: 'Thể Bị Động' },
                    { id: 'n4_no_wa_noun', pattern: 'V(thể thông thường) + のは + Tính từ / Danh từ です', meaning: 'Việc làm V thì...', meaningShort: 'Danh từ hóa' }
                ]
            },
            questions: [
                {
                    type: 'choice',
                    prompt: '"先生に褒められました" có nghĩa là gì?',
                    character: '先生に褒められました',
                    reading: 'sensei ni homeraremashita',
                    audio: 'せんせいにほめられました',
                    options: ['Tôi được thầy giáo khen ngợi (Thể bị động)', 'Tôi đã khen ngợi thầy giáo', 'Thầy giáo đã mắng tôi', 'Tôi nhờ thầy giáo giúp đỡ'],
                    correctIndex: 0,
                    explanation: 'Động từ 褒める chia bị động thành 褒められる (được khen). Ở đây mang nghĩa tốt lành.'
                },
                {
                    type: 'choice',
                    prompt: 'Câu "テニスをするのは面白いです" dùng cấu trúc gì?',
                    character: 'テニスをするのは面白いです',
                    reading: 'tenisu o suru no wa omoshiroi desu',
                    audio: 'てにすをするのはおもしろいです',
                    options: ['Danh từ hóa mệnh đề bằng trợ từ の (Việc chơi tennis thì rất thú vị)', 'Thể so sánh nhất', 'Thể cấm chỉ', 'Thể sai khiến'],
                    correctIndex: 0,
                    explanation: 'Động từ thể từ điển + の biến mệnh đề thành một cụm danh từ làm chủ ngữ trong câu.'
                },
                {
                    type: 'matching',
                    prompt: 'Nối động từ thể chủ động sang thể bị động (受身形):',
                    pairs: [
                        { left: '叱る (Mắng)', right: '叱られる (Bị mắng)' },
                        { left: '踏む (Giẫm)', right: '踏まれる (Bị giẫm)' },
                        { left: '盗む (Ăn cắp)', right: '盗まれる (Bị lấy cắp)' },
                        { left: '頼む (Nhờ vả)', right: '頼まれる (Được nhờ)' }
                    ]
                }
            ]
        },
        {
            id: 'ja_s4_l6',
            title: 'Thử Thách Chặng 4: Vượt Ải N4 Sơ Trung Cấp (Bài 26 - 38)',
            shortTitle: 'Vượt ải Chặng 4 👑',
            desc: 'Kiểm tra thành thạo các thể động từ biến hóa N4: Khả năng, Tự/Tha động từ, Thể Ý chí và Bị động!',
            icon: '👑',
            xp: 50,
            isMilestone: true,
            items: {
                vocab: [
                    { word: '参加', reading: 'さんか', meaning: 'Tham gia (sự kiện, cuộc thi)' },
                    { word: '連絡', reading: 'れんらく', meaning: 'Liên lạc / Trao đổi' },
                    { word: '都合', reading: 'つごう', meaning: 'Điều kiện thuận tiện' }
                ],
                kanji: [
                    { character: '練', sinoViet: 'LUYỆN', meaning: 'Rèn luyện', onyomi: 'REN', kunyomi: 'ne-ru' },
                    { character: '習', sinoViet: 'TẬP', meaning: 'Học tập, tập quán', onyomi: 'SHUU', kunyomi: 'nara-u' },
                    { character: '勉', sinoViet: 'MIỄN', meaning: 'Cố gắng', onyomi: 'BEN', kunyomi: 'tsuto-meru' },
                    { character: '強', sinoViet: 'CƯỜNG', meaning: 'Mạnh mẽ', onyomi: 'KYOU, GOU', kunyomi: 'tsuyo-i' },
                    { character: '試', sinoViet: 'THÍ', meaning: 'Thi cử, thử nghiệm', onyomi: 'SHI', kunyomi: 'tame-su' }
                ],
                grammar: [
                    { id: 'n4_youni_naru', pattern: 'V(khả năng) + ように なりました', meaning: 'Đã trở nên có thể làm gì (sự thay đổi năng lực)', meaningShort: 'Trở nên có thể' }
                ]
            },
            questions: [
                {
                    type: 'choice',
                    prompt: '"毎日練習して、日本語が上手に話せるようになりました" nghĩa là gì?',
                    character: '毎日練習して、日本語が上手に話せるようになりました',
                    reading: 'mainichi renshuu shite nihongo ga jouzu ni hanaseru you ni narimashita',
                    audio: 'まいにちれんしゅうしてにほんごがじょうずにはなせるようになりました',
                    options: ['Nhờ luyện tập mỗi ngày, tôi đã trở nên có thể nói giỏi tiếng Nhật', 'Mỗi ngày tôi đều nói tiếng Nhật rất giỏi', 'Tôi muốn luyện tập tiếng Nhật', 'Tôi chưa thể nói được tiếng Nhật'],
                    correctIndex: 0,
                    explanation: 'V(khả năng) + ようになりました biểu thị sự thay đổi năng lực từ chưa thể sang có thể.'
                },
                {
                    type: 'matching',
                    prompt: 'Nối các cấu trúc ngữ pháp N4 then chốt:',
                    pairs: [
                        { left: '〜んです', right: 'Giải thích nguyên nhân, lý do sâu sắc' },
                        { left: '〜ながら', right: 'Vừa làm việc này vừa làm việc kia' },
                        { left: '〜てある', right: 'Được chuẩn bị sẵn có mục đích' },
                        { left: '〜ておく', right: 'Làm trước để chuẩn bị cho tương lai' }
                    ]
                },
                {
                    type: 'audio_choice',
                    prompt: 'Nghe và xác định tình trạng giao tiếp:',
                    character: '電車の時間が都合が悪いです',
                    reading: 'densha no jikan ga tsugou ga warui desu',
                    audio: 'でんしゃのじかんがつごうがわるいです',
                    options: ['Thời gian tàu chạy không thuận tiện cho tôi', 'Tàu chạy rất đúng giờ', 'Tôi đã lỡ chuyến tàu', 'Chuyến tàu này rất vắng'],
                    correctIndex: 0,
                    explanation: '都合が悪い (tsugou ga warui) = Điều kiện không thuận lợi / Bị kẹt lịch.'
                }
            ]
        }
    ]
};

