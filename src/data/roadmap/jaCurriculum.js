/**
 * Japanese Curriculum & Interactive Bite-Sized Lessons for Duolingo Roadmap
 * Covers: Stage 1 (Kana) -> Stage 2 (N5 Vocab) -> Stage 3 (N4 Verb/Grammar) -> Stage 4 (Kaiwa) -> Stage 5 (JLPT Test)
 */

export const JA_ROADMAP_STAGES = [
    {
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
    },
    {
        stage: 2,
        id: 'ja_stage_2',
        title: 'Chặng 2: N5 — 800 Từ Vựng & 100 Kanji Cốt Lõi',
        sub: 'Đại từ nhân xưng, số đếm, ngày tháng, đồ vật đời sống & chữ Hán N5 căn bản.',
        icon: '🌱',
        color: 'sky',
        lessons: [
            {
                id: 'ja_s2_l1',
                title: 'Đại Từ Nhân Xưng & Giới Thiệu Bản Thân',
                shortTitle: '私・あなた・紹介',
                desc: 'Học cách xưng hô và các mẫu câu tự giới thiệu (Jikoshoukai) chuẩn mực.',
                icon: '🙋',
                xp: 25,
                questions: [
                    {
                        type: 'choice',
                        prompt: 'Chữ Hán "私" được đọc là gì và có nghĩa là gì?',
                        character: '私',
                        reading: 'watashi',
                        audio: 'わたし',
                        options: ['watashi (Tôi)', 'anata (Bạn)', 'sensei (Thầy giáo)', 'gakusei (Học sinh)'],
                        correctIndex: 0,
                        explanation: '私 (watashi) nghĩa là "Tôi", chữ Hán là TƯ.'
                    },
                    {
                        type: 'choice',
                        prompt: 'Cụm từ "はじめまして" dùng khi nào?',
                        character: 'はじめまして',
                        reading: 'hajimemashite',
                        audio: 'はじめまして',
                        options: ['Lần đầu gặp mặt', 'Tạm biệt ra về', 'Trước khi ăn cơm', 'Cảm ơn vì đã giúp đỡ'],
                        correctIndex: 0,
                        explanation: 'はじめまして (Hajimemashite) = "Rất hân hạnh được gặp bạn" (chỉ dùng lần đầu gặp).'
                    },
                    {
                        type: 'matching',
                        prompt: 'Nối các vai xưng hô gia đình và trường lớp:',
                        pairs: [
                            { left: '先生 (せんせい)', right: 'Giáo viên' },
                            { left: '学生 (がくせい)', right: 'Học sinh' },
                            { left: '父 (ちち)', right: 'Bố tôi' },
                            { left: '母 (はは)', right: 'Mẹ tôi' }
                        ]
                    },
                    {
                        type: 'audio_choice',
                        prompt: 'Nghe và chọn câu giới thiệu đúng:',
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
                title: 'Số Đếm, Giờ Giấc & Ngày Tháng',
                shortTitle: '数字・時間・日付',
                desc: 'Làm chủ chữ số 1-10 (一 二 三 四 五...), nói giờ và ngày trong tuần.',
                icon: '⏰',
                xp: 25,
                questions: [
                    {
                        type: 'choice',
                        prompt: 'Chữ Hán "三" đọc là gì?',
                        character: '三',
                        reading: 'san',
                        audio: 'さん',
                        options: ['san (Số 3)', 'ichi (Số 1)', 'ni (Số 2)', 'yon (Số 4)'],
                        correctIndex: 0,
                        explanation: '三 (san) là số 3 trong chữ Hán.'
                    },
                    {
                        type: 'matching',
                        prompt: 'Nối số đếm Kanji với phát âm đúng:',
                        pairs: [
                            { left: '一', right: 'ichi (1)' },
                            { left: '五', right: 'go (5)' },
                            { left: '七', right: 'nana / shichi (7)' },
                            { left: '十', right: 'juu (10)' }
                        ]
                    },
                    {
                        type: 'choice',
                        prompt: 'Từ "いま何時ですか" (Ima nanji desu ka) hỏi điều gì?',
                        character: 'いま何時ですか',
                        reading: 'ima nanji desu ka',
                        audio: 'いまなんじですか',
                        options: ['Bây giờ là mấy giờ?', 'Hôm nay là thứ mấy?', 'Cái này bao nhiêu tiền?', 'Bạn đi đâu đấy?'],
                        correctIndex: 0,
                        explanation: 'いま (bây giờ) + 何時 (mấy giờ) + ですか (hỏi).'
                    },
                    {
                        type: 'audio_choice',
                        prompt: 'Nghe phát âm và chọn ngày đúng trong tuần:',
                        character: 'にちようび',
                        reading: 'nichiyoubi',
                        audio: 'にちようび',
                        options: ['Chủ nhật (日曜日)', 'Thứ hai (月曜日)', 'Thứ bảy (土曜日)', 'Thứ sáu (金曜日)'],
                        correctIndex: 0,
                        explanation: 'にちようび (nichiyoubi) là Chủ nhật (Nhật diệu nhật).'
                    }
                ]
            },
            {
                id: 'ja_s2_l3',
                title: 'Động Từ Đời Sống Hàng Ngày',
                shortTitle: '食べる・行く・飲む',
                desc: 'Động từ nhóm 1, 2, 3 thể lịch sự ます: Ăn, uống, đi, đến, đọc, xem.',
                icon: '🍱',
                xp: 25,
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
                            { left: '見ます (mimasu)', right: 'Xem / Nhìn' }
                        ]
                    },
                    {
                        type: 'audio_choice',
                        prompt: 'Nghe và chọn hành động tương ứng:',
                        character: '本を読みます',
                        reading: 'hon o yomimasu',
                        audio: 'ほんをよみます',
                        options: ['Đọc sách', 'Viết thư', 'Mua sách', 'Mượn sách'],
                        correctIndex: 0,
                        explanation: '本 (hon) = Sách; 読みます (yomimasu) = Đọc.'
                    }
                ]
            },
            {
                id: 'ja_s2_l4',
                title: 'Thử Thách Chặng 2: N5 Mini-Checkpoint',
                shortTitle: 'Vượt ải Chặng 2 👑',
                desc: 'Tổng hợp từ vựng, số đếm và mẫu câu N5 thực tế.',
                icon: '👑',
                xp: 40,
                isMilestone: true,
                questions: [
                    {
                        type: 'choice',
                        prompt: 'Chọn trợ từ thích hợp: "学校 (___) 行きます"',
                        character: '学校へ行きます',
                        reading: 'gakkou e ikimasu',
                        audio: 'がっこうへいきます',
                        options: ['へ (hoặc に - chỉ hướng đi)', 'を (chỉ đối tượng)', 'で (chỉ nơi chốn hành động)', 'と (và / cùng với)'],
                        correctIndex: 0,
                        explanation: 'Chỉ hướng di chuyển đến địa điểm dùng trợ từ へ (phát âm là "e") hoặc に.'
                    },
                    {
                        type: 'matching',
                        prompt: 'Nối Kanji N5 với nghĩa tương ứng:',
                        pairs: [
                            { left: '日', right: 'Mặt trời / Ngày' },
                            { left: '月', right: 'Mặt trăng / Tháng' },
                            { left: '木', right: 'Cây cối / Thứ năm' },
                            { left: '水', right: 'Nước / Thứ tư' }
                        ]
                    },
                    {
                        type: 'choice',
                        prompt: 'Từ "どこ" (doko) dùng để hỏi cái gì?',
                        character: 'どこ',
                        reading: 'doko',
                        audio: 'どこ',
                        options: ['Ở đâu (địa điểm)', 'Ai (người nào)', 'Cái gì (đồ vật)', 'Khi nào (thời gian)'],
                        correctIndex: 0,
                        explanation: 'どこ = Ở đâu; だれ = Ai; なに = Cái gì; いつ = Khi nào.'
                    }
                ]
            }
        ]
    },
    {
        stage: 3,
        id: 'ja_stage_3',
        title: 'Chặng 3: N4 — Thể Động Từ & Kanji Minna',
        sub: 'Thể て (Te), thể ない (Nai), thể Khả năng, Bị động & 300 Kanji N4.',
        icon: '🌿',
        color: 'amber',
        lessons: [
            {
                id: 'ja_s3_l1',
                title: 'Thể Te & Mẫu Câu Xin Phép, Yêu Cầu',
                shortTitle: '〜てください',
                desc: 'Học cách biến đổi thể Te (〜て) và các cấu trúc 〜てください (Hãy...), 〜てもいいですか (Được phép... không?).',
                icon: '🙏',
                xp: 30,
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
                        prompt: 'Mẫu câu "〜てもいいですか" biểu thị điều gì?',
                        character: '写真を撮ってもいいですか',
                        reading: 'shashin o totte mo ii desu ka',
                        audio: 'しゃしんをとってもいいですか',
                        options: ['Xin phép làm gì đó (Tôi chụp ảnh có được không?)', 'Bắt buộc phải làm', 'Cấm đoán không được làm', 'Lời khuyên nên làm'],
                        correctIndex: 0,
                        explanation: 'Động từ thể Te + もいいですか dùng để xin phép đối phương một cách lịch sự.'
                    }
                ]
            },
            {
                id: 'ja_s3_l2',
                title: 'Thể Nai & Nghĩa Vụ, Cấm Chỉ',
                shortTitle: '〜なければならない',
                desc: 'Chia động từ sang thể phủ định ない và mẫu câu bắt buộc phải làm.',
                icon: '⛔',
                xp: 30,
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
                        type: 'matching',
                        prompt: 'Nối cặp từ trái nghĩa N4:',
                        pairs: [
                            { left: '大きい (ookii - To)', right: '小さい (chiisai - Nhỏ)' },
                            { left: '新しい (atarashii - Mới)', right: '古い (furui - Cũ)' },
                            { left: '高い (takai - Đắt/Cao)', right: '安い (yasui - Rẻ)' },
                            { left: '近い (chikai - Gần)', right: '遠い (tooi - Xa)' }
                        ]
                    }
                ]
            },
            {
                id: 'ja_s3_l3',
                title: 'Thử Thách Chặng 3: N4 Checkpoint Milestone',
                shortTitle: 'Vượt ải Chặng 3 👑',
                desc: 'Vượt qua bài test thể động từ và Kanji trung cấp N4.',
                icon: '👑',
                xp: 45,
                isMilestone: true,
                questions: [
                    {
                        type: 'choice',
                        prompt: '"日本語を話すことができます" (Nihongo o hanasu koto ga dekimasu) có nghĩa là gì?',
                        character: '日本語を話すことができます',
                        reading: 'nihongo o hanasu koto ga dekimasu',
                        audio: 'にほんごをはなすことができます',
                        options: ['Tôi có thể nói tiếng Nhật', 'Tôi đang học tiếng Nhật', 'Tiếng Nhật rất khó', 'Tôi thích tiếng Nhật'],
                        correctIndex: 0,
                        explanation: 'Động từ nguyên mẫu + ことができます là cấu trúc biểu thị "có khả năng làm gì".'
                    },
                    {
                        type: 'matching',
                        prompt: 'Nối mẫu ngữ pháp với ý nghĩa chính xác:',
                        pairs: [
                            { left: '〜たことがある', right: 'Đã từng làm gì (kinh nghiệm)' },
                            { left: '〜たいです', right: 'Muốn làm gì' },
                            { left: '〜まえに', right: 'Trước khi...' },
                            { left: '〜あとで', right: 'Sau khi...' }
                        ]
                    }
                ]
            }
        ]
    },
    {
        stage: 4,
        id: 'ja_stage_4',
        title: 'Chặng 4: N3 — Giao Tiếp & Phản Xạ Kaiwa Thực Tế',
        sub: 'Tình huống du lịch, mua sắm, nhà hàng, phó từ đắt giá & đàm thoại 1-1 AI.',
        icon: '🗣️',
        color: 'emerald',
        lessons: [
            {
                id: 'ja_s4_l1',
                title: 'Hội Thoại Mua Sắm & Gọi Món Nhà Hàng',
                shortTitle: '買い物 & レストラン',
                desc: 'Các mẫu câu đàm thoại gọi món, thanh toán và hỏi giá tại Nhật Bản.',
                icon: '🍜',
                xp: 30,
                questions: [
                    {
                        type: 'choice',
                        prompt: 'Khi muốn thanh toán hóa đơn ở quán ăn Nhật, bạn nói câu gì?',
                        character: 'お会計をお願いします',
                        reading: 'okaikei o onegaishimasu',
                        audio: 'おかいけいをおねがいします',
                        options: ['お会計をお願いします (Cho tôi tính tiền)', 'メニューをください (Cho tôi xem thực đơn)', 'ごちそうさまでした (Cảm ơn vì bữa ăn)', 'すみません、水 (Cho tôi xin nước)'],
                        correctIndex: 0,
                        explanation: 'お会計 (okaikei) hoặc お勘定 (okanjou) + をお願いします là câu chuẩn để gọi tính tiền.'
                    },
                    {
                        type: 'choice',
                        prompt: 'Câu hỏi "これはいくらですか" nghĩa là gì?',
                        character: 'これはいくらですか',
                        reading: 'kore wa ikura desu ka',
                        audio: 'これはいくらですか',
                        options: ['Cái này bao nhiêu tiền?', 'Cái này là cái gì?', 'Cái này ở đâu?', 'Cái này của ai?'],
                        correctIndex: 0,
                        explanation: 'いくら = Bao nhiêu tiền.'
                    },
                    {
                        type: 'matching',
                        prompt: 'Nối phó từ giao tiếp thực tế cực hay dùng:',
                        pairs: [
                            { left: 'やっぱり (yappari)', right: 'Quả đúng như dự đoán' },
                            { left: 'とりあえず (toriaezu)', right: 'Trước mắt cứ... (gọi trước bia)' },
                            { left: 'たぶん (tabun)', right: 'Có lẽ / Chắc là' },
                            { left: 'ぜひ (zehi)', right: 'Nhất định (mời mọc/mong muốn)' }
                        ]
                    }
                ]
            },
            {
                id: 'ja_s4_l2',
                title: 'Thử Thách Chặng 4: Kaiwa Phản Xạ Đỉnh Cao',
                shortTitle: 'Vượt ải Chặng 4 👑',
                desc: 'Kiểm tra độ phản xạ tự nhiên trong giao tiếp đời sống Nhật Bản.',
                icon: '👑',
                xp: 45,
                isMilestone: true,
                questions: [
                    {
                        type: 'choice',
                        prompt: 'Khi nhận được sự giúp đỡ từ người khác, câu nói lịch sự nhất là:',
                        character: '助かりました、ありがとうございます',
                        reading: 'tasakarimashita arigatou gozaimasu',
                        audio: 'たすかりましたありがとうございます',
                        options: ['助かりました、ありがとうございます (May quá bạn đã cứu nguy cho tôi)', '大丈夫です (Không sao)', '気にしないでください (Đừng bận tâm)', '失礼します (Tôi xin phép thất lễ)'],
                        correctIndex: 0,
                        explanation: '助かりました (tasakarimashita) thể hiện sự cảm kích khi ai đó giúp mình gỡ rối.'
                    },
                    {
                        type: 'matching',
                        prompt: 'Ghép cụm từ văn hóa đàm thoại:',
                        pairs: [
                            { left: 'いってきます', right: 'Con/Tôi đi đây (khi rời nhà)' },
                            { left: 'いってらっしゃい', right: 'Đi cẩn thận nhé (người ở nhà nói)' },
                            { left: 'ただいま', right: 'Tôi đã về rồi đây' },
                            { left: 'おかえりなさい', right: 'Bạn đã về rồi đấy à' }
                        ]
                    }
                ]
            }
        ]
    },
    {
        stage: 5,
        id: 'ja_stage_5',
        title: 'Chặng 5: Đấu Trường & Luyện Đề Thi JLPT',
        sub: 'Đề thi bấm giờ JLPT N5 - N1, bẫy ngữ pháp, Dokkai & Đấu trường Skill Arena.',
        icon: '🏆',
        color: 'purple',
        lessons: [
            {
                id: 'ja_s5_l1',
                title: 'Chiến Thuật Từ Vựng & Chữ Hán Bẫy JLPT',
                shortTitle: 'Bẫy Từ Vựng JLPT',
                desc: 'Luyện các cặp Kanji dễ nhầm nét và từ đồng âm khác nghĩa hay ra trong đề thi.',
                icon: '🎯',
                xp: 35,
                questions: [
                    {
                        type: 'choice',
                        prompt: 'Chữ Hán trong câu "毎朝、新聞を［読みます］" viết là:',
                        character: '読みます',
                        reading: 'yomimasu',
                        audio: 'よみます',
                        options: ['読', '話', '語', '調'],
                        correctIndex: 0,
                        explanation: '読 trong 読む (yomu) nghĩa là Đọc. Phân biệt với 話 (nói), 語 (ngôn ngữ).'
                    },
                    {
                        type: 'matching',
                        prompt: 'Nối các từ vựng hay xuất hiện trong phần Dokkai:',
                        pairs: [
                            { left: '理由 (りゆう)', right: 'Lý do / Nguyên nhân' },
                            { left: '結果 (けっか)', right: 'Kết quả' },
                            { left: '目的 (もくてき)', right: 'Mục đích' },
                            { left: '意見 (いけん)', right: 'Ý kiến / Quan điểm' }
                        ]
                    }
                ]
            },
            {
                id: 'ja_s5_l2',
                title: 'Tổng Kết Lộ Trình: Danh Hiệu QuizKi JLPT Master',
                shortTitle: 'Đại Chung Kết 🏆',
                desc: 'Vượt qua chặng thi cuối cùng để hoàn thành toàn bộ lộ trình tiếng Nhật!',
                icon: '🏆',
                xp: 60,
                isMilestone: true,
                questions: [
                    {
                        type: 'choice',
                        prompt: 'Chọn câu có ngữ pháp hoàn toàn chính xác:',
                        character: '日本へ行ったら、富士山に登りたいです',
                        reading: 'nihon e ittara fujisan ni noboritai desu',
                        audio: 'にほんへいったらふじさんにのぼりたいです',
                        options: ['日本へ行ったら、富士山に登りたいです (Nếu/khi đến Nhật, tôi muốn leo núi Phú Sĩ)', '日本を行ったら、富士山が登るです', '日本にいくなら、富士山へ登りたいだ', '日本へ行くて、富士山を登るたい'],
                        correctIndex: 0,
                        explanation: 'Đi tới đâu dùng へ/に; 〜たら biểu thị giả định/điều kiện; 登る đi với に (leo lên điểm đến); muốn làm dùng 〜たいです.'
                    },
                    {
                        type: 'matching',
                        prompt: 'Nối các cấp độ JLPT tương ứng mục tiêu:',
                        pairs: [
                            { left: 'JLPT N5', right: 'Khởi đầu: Kana & 800 từ căn bản' },
                            { left: 'JLPT N4', right: 'Sơ cấp vững chắc: Động từ Minna' },
                            { left: 'JLPT N3', right: 'Trung cấp: Giao tiếp làm việc tự tin' },
                            { left: 'JLPT N2/N1', right: 'Cao cấp: Đọc báo & Chuyên ngành' }
                        ]
                    }
                ]
            }
        ]
    }
];

