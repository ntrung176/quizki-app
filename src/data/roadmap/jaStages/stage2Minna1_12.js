/**
 * Stage 2: N5 Sơ Cấp (Minna no Nihongo Bài 1 - 12 & 100 Kanji Cốt Lõi)
 */
export const STAGE_2_MINNA_1_12 = {
    stage: 2,
    id: 'ja_stage_2',
    title: 'Chặng 2: N5 Sơ Cấp (Minna 1-12 & 100 Kanji)',
    sub: 'Đại từ, đồ vật, số đếm, thời gian, di chuyển, tính từ miêu tả & sở thích.',
    icon: '🌱',
    color: 'sky',
    lessons: [
        {
            id: 'ja_s2_l1',
            title: 'Minna 1-2: Bản Thân, Nghề Nghiệp & Đồ Vật',
            shortTitle: '私・本・これ・それ',
            desc: 'Làm quen đại từ nhân xưng, nghề nghiệp và mẫu câu khẳng định / phủ định: 〜は〜です / 〜じゃありません.',
            icon: '🙋',
            xp: 25,
            items: {
                vocab: [
                    { word: '私', reading: 'わたし', meaning: 'Tôi (đại từ nhân xưng ngôi thứ nhất)' },
                    { word: 'あなた', reading: 'あなた', meaning: 'Bạn / Anh / Chị' },
                    { word: '先生', reading: 'せんせい', meaning: 'Thầy cô giáo / Giáo viên' },
                    { word: '学生', reading: 'がくせい', meaning: 'Học sinh / Sinh viên' },
                    { word: '本', reading: 'ほん', meaning: 'Quyển sách' },
                    { word: '辞書', reading: 'じしょ', meaning: 'Cuốn từ điển' },
                    { word: '傘', reading: 'かさ', meaning: 'Cái ô / Cây dù' }
                ],
                kanji: [
                    { character: '私', sinoViet: 'TƯ', meaning: 'Tôi, riêng tư', onyomi: 'SHI', kunyomi: 'watashi' },
                    { character: '人', sinoViet: 'NHÂN', meaning: 'Người', onyomi: 'JIN, NIN', kunyomi: 'hito' },
                    { character: '先', sinoViet: 'TIÊN', meaning: 'Trước, đi trước', onyomi: 'SEN', kunyomi: 'saki' },
                    { character: '生', sinoViet: 'SINH', meaning: 'Sống, sinh sôi', onyomi: 'SEI, SHOU', kunyomi: 'i-kiru, u-mareru' },
                    { character: '本', sinoViet: 'BỔN', meaning: 'Sách, gốc rễ', onyomi: 'HON', kunyomi: 'moto' }
                ],
                grammar: [
                    { id: 'n5_wa_desu', pattern: 'N1 は N2 です', meaning: 'N1 là N2', meaningShort: 'Khẳng định' },
                    { id: 'n5_wa_ja_arimasen', pattern: 'N1 は N2 じゃありません', meaning: 'N1 không phải là N2', meaningShort: 'Phủ định' },
                    { id: 'n5_kore_sore_are', pattern: 'これ / それ / あれ', meaning: 'Cái này / Cái đó / Cái kia', meaningShort: 'Chỉ từ đồ vật' }
                ]
            },
            questions: [
                {
                    type: 'choice',
                    prompt: 'Chữ Hán "私" đọc là gì và có nghĩa là gì?',
                    character: '私',
                    reading: 'watashi',
                    audio: 'わたし',
                    options: ['watashi (Tôi)', 'anata (Bạn)', 'sensei (Thầy giáo)', 'gakusei (Học sinh)'],
                    correctIndex: 0,
                    explanation: '私 (watashi) nghĩa là "Tôi", chữ Hán là TƯ.'
                },
                {
                    type: 'choice',
                    prompt: 'Chọn câu phủ định đúng: "Tôi không phải là học sinh":',
                    character: '私は学生じゃありません',
                    reading: 'watashi wa gakusei ja arimasen',
                    audio: 'わたしはがくせいじゃありません',
                    options: ['私は学生じゃありません', '私は学生です', '私は学生でした', '私は学生ではありませんでした'],
                    correctIndex: 0,
                    explanation: 'Mẫu phủ định hiện tại của です là じゃありません (hoặc ではありません).'
                },
                {
                    type: 'matching',
                    prompt: 'Nối các từ chỉ đồ vật và vai xưng Minna Bài 1-2:',
                    pairs: [
                        { left: '先生 (せんせい)', right: 'Giáo viên' },
                        { left: '本 (ほん)', right: 'Quyển sách' },
                        { left: '辞書 (じしょ)', right: 'Cuốn từ điển' },
                        { left: '学生 (がくせい)', right: 'Học sinh' }
                    ]
                },
                {
                    type: 'audio_choice',
                    prompt: 'Nghe và chọn câu giới thiệu chuẩn bản xứ:',
                    character: 'どうぞよろしく',
                    reading: 'douzo yoroshiku',
                    audio: 'どうぞよろしく',
                    options: ['どうぞよろしく (Rất mong được giúp đỡ)', 'どういたしまして (Không có chi)', 'おねがいします (Xin vui lòng)', 'ごめんなさい (Xin lỗi)'],
                    correctIndex: 0,
                    explanation: 'どうぞよろしく (Douzo yoroshiku) nói ở cuối màn tự giới thiệu.'
                }
            ]
        },
        {
            id: 'ja_s2_l2',
            title: 'Minna 3-4: Nơi Chốn, Số Đếm & Giờ Giấc',
            shortTitle: 'ここ・何時・数字',
            desc: 'Hỏi đáp địa điểm (ここ・そこ・あそこ), số đếm 1-10 và cách nói giờ: 〜時〜分 / 〜から〜まで.',
            icon: '⏰',
            xp: 25,
            items: {
                vocab: [
                    { word: 'ここ', reading: 'ここ', meaning: 'Chỗ này / Ở đây' },
                    { word: 'そこ', reading: 'そこ', meaning: 'Chỗ đó / Ở đó' },
                    { word: '教室', reading: 'きょうしつ', meaning: 'Phòng học / Lớp học' },
                    { word: 'いま', reading: 'いま', meaning: 'Bây giờ' },
                    { word: '何時', reading: 'なんじ', meaning: 'Mấy giờ' },
                    { word: '午前', reading: 'ごぜん', meaning: 'Buổi sáng (AM)' },
                    { word: '午後', reading: 'ごご', meaning: 'Buổi chiều (PM)' }
                ],
                kanji: [
                    { character: '一', sinoViet: 'NHẤT', meaning: 'Số 1', onyomi: 'ICHI', kunyomi: 'hito-tsu' },
                    { character: '二', sinoViet: 'NHỊ', meaning: 'Số 2', onyomi: 'NI', kunyomi: 'futa-tsu' },
                    { character: '三', sinoViet: 'TAM', meaning: 'Số 3', onyomi: 'SAN', kunyomi: 'mit-tsu' },
                    { character: '四', sinoViet: 'TỨ', meaning: 'Số 4', onyomi: 'SHI', kunyomi: 'yon, yot-tsu' },
                    { character: '五', sinoViet: 'NGŨ', meaning: 'Số 5', onyomi: 'GO', kunyomi: 'itsu-tsu' },
                    { character: '時', sinoViet: 'THỜI', meaning: 'Thời gian, giờ', onyomi: 'JI', kunyomi: 'toki' },
                    { character: '分', sinoViet: 'PHÂN', meaning: 'Phút, phân chia', onyomi: 'FUN, BUN', kunyomi: 'wa-karu' }
                ],
                grammar: [
                    { id: 'n5_koko_soko_asoko', pattern: 'ここ / そこ / あそこ は N です', meaning: 'Chỗ này/đó/kia là N', meaningShort: 'Chỉ địa điểm' },
                    { id: 'n5_nanji_desuka', pattern: 'いま 何時ですか', meaning: 'Bây giờ là mấy giờ?', meaningShort: 'Hỏi giờ' },
                    { id: 'n5_kara_made', pattern: 'N1 から N2 まで', meaning: 'Từ N1 đến N2', meaningShort: 'Khoảng thời gian/địa điểm' }
                ]
            },
            questions: [
                {
                    type: 'choice',
                    prompt: 'Chữ Hán "三" đọc là gì và có nghĩa là gì?',
                    character: '三',
                    reading: 'san',
                    audio: 'さん',
                    options: ['san (Số 3)', 'ichi (Số 1)', 'ni (Số 2)', 'yon (Số 4)'],
                    correctIndex: 0,
                    explanation: '三 (san) là số 3 trong chữ Hán.'
                },
                {
                    type: 'matching',
                    prompt: 'Nối Kanji số đếm và giờ giấc với cách đọc:',
                    pairs: [
                        { left: '一 (いち)', right: 'Số 1' },
                        { left: '五 (ご)', right: 'Số 5' },
                        { left: '時 (じ)', right: 'Giờ (thời gian)' },
                        { left: '分 (ふん)', right: 'Phút' }
                    ]
                },
                {
                    type: 'choice',
                    prompt: 'Câu "いま何時ですか" (Ima nanji desu ka) hỏi điều gì?',
                    character: 'いま何時ですか',
                    reading: 'ima nanji desu ka',
                    audio: 'いまなんじですか',
                    options: ['Bây giờ là mấy giờ?', 'Hôm nay là thứ mấy?', 'Cái này bao nhiêu tiền?', 'Bạn đi đâu đấy?'],
                    correctIndex: 0,
                    explanation: 'いま (bây giờ) + 何時 (mấy giờ) + ですか (câu hỏi).'
                },
                {
                    type: 'audio_choice',
                    prompt: 'Nghe phát âm và chọn buổi trong ngày:',
                    character: 'ごぜん',
                    reading: 'gozen',
                    audio: 'ごぜん',
                    options: ['Buổi sáng (AM - 午前)', 'Buổi chiều (PM - 午後)', 'Buổi tối', 'Nửa đêm'],
                    correctIndex: 0,
                    explanation: '午前 (gozen) = Buổi sáng (trước 12h trưa).'
                }
            ]
        },
        {
            id: 'ja_s2_l3',
            title: 'Minna 5-6: Đi Lại & Sinh Hoạt Đời Sống',
            shortTitle: '行きます・食べます',
            desc: 'Động từ di chuyển và ăn uống: 〜へ行きます / 〜をVます / 〜で (phương tiện, công cụ).',
            icon: '🍱',
            xp: 25,
            items: {
                vocab: [
                    { word: '行きます', reading: 'いきます', meaning: 'Đi (di chuyển rời xa vị trí nói)' },
                    { word: '来ます', reading: 'きます', meaning: 'Đến (di chuyển lại gần vị trí nói)' },
                    { word: '帰ります', reading: 'かえります', meaning: 'Về (về nhà / về nước)' },
                    { word: '学校', reading: 'がっこう', meaning: 'Trường học' },
                    { word: '駅', reading: 'えき', meaning: 'Nhà ga tàu điện' },
                    { word: '食べます', reading: 'たべます', meaning: 'Ăn' },
                    { word: '飲みます', reading: 'のみます', meaning: 'Uống' },
                    { word: 'ごはん', reading: 'ごはん', meaning: 'Cơm / Bữa ăn' },
                    { word: '水', reading: 'みず', meaning: 'Nước lọc' }
                ],
                kanji: [
                    { character: '行', sinoViet: 'HÀNH', meaning: 'Đi, thực hành', onyomi: 'KOU, GYOU', kunyomi: 'i-ku' },
                    { character: '来', sinoViet: 'LAI', meaning: 'Đến, tương lai', onyomi: 'RAI', kunyomi: 'ku-ru' },
                    { character: '校', sinoViet: 'HIỆU', meaning: 'Trường học', onyomi: 'KOU', kunyomi: '' },
                    { character: '駅', sinoViet: 'DỊCH', meaning: 'Nhà ga', onyomi: 'EKI', kunyomi: '' },
                    { character: '食', sinoViet: 'THỰC', meaning: 'Ăn, ẩm thực', onyomi: 'SHOKU', kunyomi: 'ta-beru' },
                    { character: '飲', sinoViet: 'ẨM', meaning: 'Uống', onyomi: 'IN', kunyomi: 'no-mu' }
                ],
                grammar: [
                    { id: 'n5_e_ikimasu', pattern: 'Địa điểm + へ 行きます / 来ます / 帰ります', meaning: 'Đi / Đến / Về [địa điểm]', meaningShort: 'Hướng di chuyển' },
                    { id: 'n5_o_v_masu', pattern: 'Tân ngữ + を + Vます', meaning: 'Làm hành động V tác động lên tân ngữ', meaningShort: 'Tác động trực tiếp' },
                    { id: 'n5_de_tool', pattern: 'Phương tiện / Công cụ + で + V', meaning: 'Làm bằng phương tiện / công cụ gì', meaningShort: 'Phương tiện' }
                ]
            },
            questions: [
                {
                    type: 'choice',
                    prompt: '"ごはんを食べます" (Gohan o tabemasu) nghĩa là gì?',
                    character: 'ごはんを食べます',
                    reading: 'gohan o tabemasu',
                    audio: 'ごはんをたべます',
                    options: ['Tôi ăn cơm', 'Tôi uống nước', 'Tôi nấu cơm', 'Tôi mua cơm'],
                    correctIndex: 0,
                    explanation: '食べる (taberu / tabemasu) = Ăn; ごはん = Cơm.'
                },
                {
                    type: 'matching',
                    prompt: 'Ghép động từ thể ます với nghĩa tiếng Việt:',
                    pairs: [
                        { left: '行きます (ikimasu)', right: 'Đi' },
                        { left: '来ます (kimasu)', right: 'Đến' },
                        { left: '飲みます (nomimasu)', right: 'Uống' },
                        { left: '帰ります (kaerimasu)', right: 'Về nhà' }
                    ]
                },
                {
                    type: 'audio_choice',
                    prompt: 'Nghe và chọn địa điểm di chuyển đúng:',
                    character: '学校へ行きます',
                    reading: 'gakkou e ikimasu',
                    audio: 'がっこうへいきます',
                    options: ['Đi đến trường học', 'Đi đến nhà ga', 'Đi đến công ty', 'Đi về nhà'],
                    correctIndex: 0,
                    explanation: '学校 (gakkou) = Trường học; へ 行きます = Đi đến.'
                }
            ]
        },
        {
            id: 'ja_s2_l4',
            title: 'Minna 7-8: Cho Nhận & Tính Từ Miêu Tả',
            shortTitle: 'あげます・大きい・きれい',
            desc: 'Hành động cho/nhận quà (〜にあげます / 〜にもらいます) và tính từ đuôi い / đuôi な.',
            icon: '🎁',
            xp: 25,
            items: {
                vocab: [
                    { word: 'あげます', reading: 'あげます', meaning: 'Cho / Tặng (cho người khác)' },
                    { word: 'もらいます', reading: 'もらいます', meaning: 'Nhận (từ người khác)' },
                    { word: '大きい', reading: 'おおきい', meaning: 'To lớn (Tính từ đuôi い)' },
                    { word: '小さい', reading: 'ちいさい', meaning: 'Nhỏ bé (Tính từ đuôi い)' },
                    { word: '新しい', reading: 'あたらしい', meaning: 'Mới mẻ (Tính từ đuôi い)' },
                    { word: '古い', reading: 'ふるい', meaning: 'Cũ kỹ (Tính từ đuôi い)' },
                    { word: 'きれい', reading: 'きれい', meaning: 'Đẹp, sạch sẽ (Tính từ đuôi な)' },
                    { word: '親切', reading: 'しんせつ', meaning: 'Thân thiện, tốt bụng (Tính từ đuôi な)' }
                ],
                kanji: [
                    { character: '大', sinoViet: 'ĐẠI', meaning: 'To lớn', onyomi: 'DAI, TAI', kunyomi: 'oo-kii' },
                    { character: '小', sinoViet: 'TIỂU', meaning: 'Nhỏ bé', onyomi: 'SHOU', kunyomi: 'chii-sai, ko' },
                    { character: '新', sinoViet: 'TÂN', meaning: 'Mới', onyomi: 'SHIN', kunyomi: 'atara-shii' },
                    { character: '古', sinoViet: 'CỔ', meaning: 'Cũ', onyomi: 'KO', kunyomi: 'furu-i' },
                    { character: '白', sinoViet: 'BẠCH', meaning: 'Màu trắng', onyomi: 'HAKU', kunyomi: 'shiro, shiro-i' },
                    { character: '黒', sinoViet: 'HẮC', meaning: 'Màu đen', onyomi: 'KOKU', kunyomi: 'kuro, kuro-i' }
                ],
                grammar: [
                    { id: 'n5_agemasu_moraimasu', pattern: 'Người nhận に あげます / Người cho に もらいます', meaning: 'Tặng cho ai / Nhận từ ai', meaningShort: 'Cho nhận quà' },
                    { id: 'n5_adj_i_noun', pattern: 'A(い) + Danh từ / A(な) + な + Danh từ', meaning: 'Tính từ bổ nghĩa cho danh từ', meaningShort: 'Định ngữ tính từ' }
                ]
            },
            questions: [
                {
                    type: 'choice',
                    prompt: 'Tính từ "きれい[な]" thuộc loại tính từ nào và có nghĩa là gì?',
                    character: 'きれい',
                    reading: 'kirei',
                    audio: 'きれい',
                    options: ['Tính từ đuôi な (Đẹp / Sạch sẽ)', 'Tính từ đuôi い (Màu vàng)', 'Động từ nhóm 2', 'Phó từ chỉ mức độ'],
                    correctIndex: 0,
                    explanation: 'Đặc biệt: きれい kết thúc bằng âm "i" nhưng là TÍNH TỪ ĐUÔI な (Hán tự: 綺麗).'
                },
                {
                    type: 'matching',
                    prompt: 'Nối các cặp tính từ trái nghĩa N5:',
                    pairs: [
                        { left: '大きい (おおきい - To)', right: '小さい (ちいさい - Nhỏ)' },
                        { left: '新しい (あたらしい - Mới)', right: '古い (ふるい - Cũ)' },
                        { left: '高い (たかい - Đắt/Cao)', right: '安い (やすい - Rẻ)' },
                        { left: '白い (しろい - Trắng)', right: '黒い (くろい - Đen)' }
                    ]
                },
                {
                    type: 'choice',
                    prompt: 'Mẫu câu "友達にプレゼントをあげます" nghĩa là gì?',
                    character: '友達にプレゼントをあげます',
                    reading: 'tomodachi ni purezento o agemasu',
                    audio: 'ともだちにぷれぜんとをあげます',
                    options: ['Tôi tặng quà cho bạn', 'Tôi nhận quà từ bạn', 'Tôi đi mua quà cùng bạn', 'Bạn tặng quà cho tôi'],
                    correctIndex: 0,
                    explanation: 'Người に あげます = Tặng quà cho ai đó.'
                }
            ]
        },
        {
            id: 'ja_s2_l5',
            title: 'Minna 9-10: Sở Thích, Vị Trí & Tồn Tại',
            shortTitle: '好き・あります・います',
            desc: 'Bày tỏ sở thích, năng khiếu (〜が好き・上手) và phân biệt sự tồn tại vật / sinh vật (あります vs います).',
            icon: '🐕',
            xp: 25,
            items: {
                vocab: [
                    { word: '好き', reading: 'すき', meaning: 'Thích (Tính từ đuôi な)' },
                    { word: '上手', reading: 'じょうず', meaning: 'Giỏi, khéo léo (Tính từ đuôi な)' },
                    { word: 'あります', reading: 'あります', meaning: 'Có / Tồn tại (đối với đồ vật, cây cỏ vô tri)' },
                    { word: 'います', reading: 'います', meaning: 'Có / Tồn tại (đối với người, động vật chuyển động)' },
                    { word: '犬', reading: 'いぬ', meaning: 'Con chó' },
                    { word: '猫', reading: 'ねこ', meaning: 'Con mèo' },
                    { word: '机', reading: 'つくえ', meaning: 'Cái bàn học' },
                    { word: '上', reading: 'うえ', meaning: 'Phía trên' },
                    { word: '下', reading: 'した', meaning: 'Phía dưới' },
                    { word: '中', reading: 'なか', meaning: 'Bên trong' }
                ],
                kanji: [
                    { character: '上', sinoViet: 'THƯỢNG', meaning: 'Trên, lên', onyomi: 'JOU', kunyomi: 'ue, a-garu' },
                    { character: '下', sinoViet: 'HẠ', meaning: 'Dưới, xuống', onyomi: 'KA, GE', kunyomi: 'shita, sa-garu' },
                    { character: '中', sinoViet: 'TRUNG', meaning: 'Trong, ở giữa', onyomi: 'CHUU', kunyomi: 'naka' },
                    { character: '前', sinoViet: 'TIỀN', meaning: 'Trước', onyomi: 'ZEN', kunyomi: 'mae' },
                    { character: '後', sinoViet: 'HẬU', meaning: 'Sau', onyomi: 'GO, KOU', kunyomi: 'ushi-ro, ato' },
                    { character: '右', sinoViet: 'HỮU', meaning: 'Bên phải', onyomi: 'UU, YUU', kunyomi: 'migi' },
                    { character: '左', sinoViet: 'TẢ', meaning: 'Bên trái', onyomi: 'SA', kunyomi: 'hidari' }
                ],
                grammar: [
                    { id: 'n5_suki_jouzu', pattern: 'N が 好きです / 上手です', meaning: 'Thích N / Giỏi về N', meaningShort: 'Sở thích & năng khiếu' },
                    { id: 'n5_arimasu_imasu', pattern: 'Địa điểm に N が あります / います', meaning: 'Ở [địa điểm] có [vật / người]', meaningShort: 'Tồn tại' }
                ]
            },
            questions: [
                {
                    type: 'choice',
                    prompt: 'Chọn động từ thích hợp: "机の上に本が (____)"',
                    character: '机の上に本があります',
                    reading: 'tsukue no ue ni hon ga arimasu',
                    audio: 'つくえのうえにほんがあります',
                    options: ['あります (Vì sách là đồ vật)', 'います (Dùng cho người)', '行きます (Đi)', '食べます (Ăn)'],
                    correctIndex: 0,
                    explanation: '本 (quyển sách) là đồ vật vô tri vô giác nên dùng động từ tồn tại あります.'
                },
                {
                    type: 'matching',
                    prompt: 'Nối các từ chỉ vị trí không gian trong tiếng Nhật:',
                    pairs: [
                        { left: '上 (うえ)', right: 'Bên trên' },
                        { left: '下 (した)', right: 'Bên dưới' },
                        { left: '中 (なか)', right: 'Bên trong' },
                        { left: '前 (まえ)', right: 'Phía trước' }
                    ]
                },
                {
                    type: 'audio_choice',
                    prompt: 'Nghe và xác định con vật nuôi trong câu:',
                    character: '庭に犬がいます',
                    reading: 'niwa ni inu ga imasu',
                    audio: 'にわにいぬがいます',
                    options: ['Con chó (犬 - いぬ)', 'Con mèo (猫 - ねこ)', 'Con chim (鳥 - とり)', 'Con cá (魚 - さかな)'],
                    correctIndex: 0,
                    explanation: '犬 (inu) là con chó. Sinh vật sống nên đi với trợ từ が います.'
                }
            ]
        },
        {
            id: 'ja_s2_l6',
            title: 'Minna 11-12: Lượng Từ & So Sánh Hơn Nhất',
            shortTitle: 'ひとつ・より〜のほうが',
            desc: 'Cách đếm đồ vật (ひとつ, ふたつ...), đếm người (ひとり, ふたり) và cấu trúc so sánh hơn/nhất.',
            icon: '🍎',
            xp: 25,
            items: {
                vocab: [
                    { word: 'ひとつ', reading: 'ひとつ', meaning: '1 cái (đếm đồ vật chung)' },
                    { word: 'ふたつ', reading: 'ふたつ', meaning: '2 cái' },
                    { word: '一人', reading: 'ひとり', meaning: '1 người' },
                    { word: '二人', reading: 'ふたり', meaning: '2 người' },
                    { word: 'りんご', reading: 'りんご', meaning: 'Quả táo' },
                    { word: 'どちら', reading: 'どちら', meaning: 'Bên nào / Cái nào trong 2 cái' },
                    { word: '一番', reading: 'いちばん', meaning: 'Nhất / Số một' },
                    { word: '近い', reading: 'ちかい', meaning: 'Gần (về khoảng cách)' },
                    { word: '遠い', reading: 'とおい', meaning: 'Xa (về khoảng cách)' }
                ],
                kanji: [
                    { character: '男', sinoViet: 'NAM', meaning: 'Đàn ông, con trai', onyomi: 'DAN, NAN', kunyomi: 'otoko' },
                    { character: '女', sinoViet: 'NỮ', meaning: 'Phụ nữ, con gái', onyomi: 'JO', kunyomi: 'on\'na' },
                    { character: '子', sinoViet: 'TỬ', meaning: 'Trẻ con, con cái', onyomi: 'SHI, SU', kunyomi: 'ko' },
                    { character: '友', sinoViet: 'HỮU', meaning: 'Bạn bè', onyomi: 'YUU', kunyomi: 'tomo' },
                    { character: '年', sinoViet: 'NIÊN', meaning: 'Năm, tuổi tác', onyomi: 'NEN', kunyomi: 'toshi' },
                    { character: '月', sinoViet: 'NGUYỆT', meaning: 'Mặt trăng, tháng', onyomi: 'GETSU, GATSU', kunyomi: 'tsuki' },
                    { character: '日', sinoViet: 'NHẬT', meaning: 'Mặt trời, ngày', onyomi: 'NICHI, JITSU', kunyomi: 'hi, -ka' }
                ],
                grammar: [
                    { id: 'n5_quantifier', pattern: 'Danh từ + を + [Lượng từ] + Động từ', meaning: 'Làm động từ với số lượng bao nhiêu', meaningShort: 'Lượng từ số lượng' },
                    { id: 'n5_yori_houga', pattern: 'A は B より [Tính từ] です', meaning: 'A thì [Tính từ] hơn B', meaningShort: 'So sánh hơn' },
                    { id: 'n5_dochira_ga', pattern: 'A と B と どちらが [Tính từ] ですか', meaning: 'Giữa A và B thì cái nào [Tính từ] hơn?', meaningShort: 'Hỏi so sánh 2 vật' }
                ]
            },
            questions: [
                {
                    type: 'choice',
                    prompt: '"りんごをふたつ買いました" nghĩa là gì?',
                    character: 'りんごをふたつ買いました',
                    reading: 'ringo o futatsu kaimashita',
                    audio: 'りんごをふたつかいました',
                    options: ['Tôi đã mua 2 quả táo', 'Tôi đã mua 1 quả táo', 'Tôi đã ăn 2 quả táo', 'Tôi đã cho 2 quả táo'],
                    correctIndex: 0,
                    explanation: 'ふたつ = 2 cái/quả; 買いました = Đã mua.'
                },
                {
                    type: 'choice',
                    prompt: 'Câu so sánh "飛行機は新幹線より速いです" khẳng định điều gì?',
                    character: '飛行機は新幹線より速いです',
                    reading: 'hikouki wa shinkansen yori hayai desu',
                    audio: 'ひこうきはしんかんせんよりはやいです',
                    options: ['Máy bay chạy nhanh hơn tàu Shinkansen', 'Tàu Shinkansen chạy nhanh hơn máy bay', 'Máy bay đắt hơn tàu Shinkansen', 'Cả hai đều nhanh như nhau'],
                    correctIndex: 0,
                    explanation: 'A は B より [Tính từ] = A thì [Tính từ] hơn B (Máy bay thì nhanh hơn tàu Shinkansen).'
                },
                {
                    type: 'matching',
                    prompt: 'Nối từ chỉ người và số đếm đặc biệt:',
                    pairs: [
                        { left: '一人 (ひとり)', right: '1 người' },
                        { left: '二人 (ふたり)', right: '2 người' },
                        { left: '三人 (さんにん)', right: '3 người' },
                        { left: '四人 (よにん)', right: '4 người' }
                    ]
                }
            ]
        },
        {
            id: 'ja_s2_l7',
            title: 'Thử Thách Chặng 2: Vượt Ải Minna N5 Sơ Cấp (Bài 1 - 12)',
            shortTitle: 'Vượt ải Chặng 2 👑',
            desc: 'Tổng hợp từ vựng, Kanji nền tảng và các mẫu câu Minna no Nihongo bài 1 đến bài 12!',
            icon: '👑',
            xp: 45,
            isMilestone: true,
            items: {
                vocab: [
                    { word: '勉強', reading: 'べんきょう', meaning: 'Học tập / Nghiên cứu' },
                    { word: '仕事', reading: 'しごと', meaning: 'Công việc' },
                    { word: '休み', reading: 'やすみ', meaning: 'Nghỉ ngơi / Ngày nghỉ' },
                    { word: 'どこ', reading: 'どこ', meaning: 'Ở đâu (từ để hỏi địa điểm)' }
                ],
                kanji: [
                    { character: '学', sinoViet: 'HỌC', meaning: 'Học tập', onyomi: 'GAKU', kunyomi: 'mana-bu' },
                    { character: '休', sinoViet: 'HƯU', meaning: 'Nghỉ ngơi', onyomi: 'KYUU', kunyomi: 'yasu-mu' },
                    { character: '金', sinoViet: 'KIM', meaning: 'Vàng, tiền bạc', onyomi: 'KIN, KON', kunyomi: 'kane' },
                    { character: '木', sinoViet: 'MỘC', meaning: 'Cây cối', onyomi: 'MOKU, BOKU', kunyomi: 'ki' },
                    { character: '土', sinoViet: 'THỔ', meaning: 'Đất cát', onyomi: 'DO, TO', kunyomi: 'tsuchi' }
                ],
                grammar: [
                    { id: 'n5_doko_desuka', pattern: 'N は どこですか', meaning: 'N ở đâu?', meaningShort: 'Hỏi vị trí địa điểm' }
                ]
            },
            questions: [
                {
                    type: 'choice',
                    prompt: 'Chọn trợ từ thích hợp: "毎朝、7時 (____) 起きます"',
                    character: '毎朝、7時に起きます',
                    reading: 'maiasa shichiji ni okimasu',
                    audio: 'まいあさしちじにおきます',
                    options: ['に (Chỉ mốc thời gian cụ thể)', 'で (Chỉ nơi hành động)', 'を (Chỉ đối tượng)', 'へ (Chỉ hướng đi)'],
                    correctIndex: 0,
                    explanation: 'Mốc thời gian xác định có con số cụ thể (7 giờ) luôn đi với trợ từ に.'
                },
                {
                    type: 'matching',
                    prompt: 'Nối Kanji các thứ trong tuần N5:',
                    pairs: [
                        { left: '日曜日 (にちようび)', right: 'Chủ nhật' },
                        { left: '月曜日 (げつようび)', right: 'Thứ hai' },
                        { left: '金曜日 (きんようび)', right: 'Thứ sáu' },
                        { left: '土曜日 (どようび)', right: 'Thứ bảy' }
                    ]
                },
                {
                    type: 'audio_choice',
                    prompt: 'Nghe câu và chọn nghĩa đúng:',
                    character: '日本語の勉強はとても面白いです',
                    reading: 'nihongo no benkyou wa totemo omoshiroi desu',
                    audio: 'にほんごのべんきょうはとてもおもしろいです',
                    options: ['Việc học tiếng Nhật rất thú vị', 'Việc học tiếng Nhật rất khó', 'Tôi không thích học tiếng Nhật', 'Hôm nay tôi được nghỉ học'],
                    correctIndex: 0,
                    explanation: '勉強 (học tập) + とても (rất) + 面白い (thú vị).'
                }
            ]
        }
    ]
};

