/**
 * English Curriculum & Interactive Bite-Sized Lessons for Duolingo Roadmap
 * Covers: Stage 1 (IPA) -> Stage 2 (Oxford 1,000) -> Stage 3 (B1/B2 Collocations) -> Stage 4 (Natural Fluency) -> Stage 5 (TOEIC/IELTS Test)
 */

export const EN_ROADMAP_STAGES = [
    {
        stage: 1,
        id: 'en_stage_1',
        title: 'Chặng 1: Bảng Ký Hiệu Ngữ Âm Quốc Tế IPA',
        sub: 'Luyện 44 âm chuẩn Anh - Mỹ, nguyên âm đơn, đôi và phụ âm bật hơi.',
        icon: '🔤',
        color: 'rose',
        lessons: [
            {
                id: 'en_s1_l1',
                title: 'Nguyên Âm Đơn: /iː/ vs /ɪ/ & /uː/ vs /ʊ/',
                shortTitle: '/iː/ & /ɪ/',
                desc: 'Phân biệt âm dài và âm ngắn qua cặp từ kinh điển: sheep vs ship, pool vs pull.',
                icon: '👄',
                xp: 20,
                questions: [
                    {
                        type: 'choice',
                        prompt: 'Từ "sheep" (con cừu) chứa nguyên âm nào?',
                        character: 'sheep /ʃiːp/',
                        reading: '/iː/',
                        audio: 'sheep',
                        options: ['/iː/ (âm i dài, cười mở rộng môi)', '/ɪ/ (âm i ngắn, thả lỏng)', '/e/ (âm e)', '/æ/ (âm a bẹt)'],
                        correctIndex: 0,
                        explanation: 'sheep có 2 chữ "ee" phát âm là /iː/ dài: /ʃiːp/. Phân biệt với ship /ʃɪp/ (tàu thủy).'
                    },
                    {
                        type: 'audio_choice',
                        prompt: 'Nghe từ sau và chọn từ phát âm đúng:',
                        character: 'ship',
                        reading: '/ʃɪp/',
                        audio: 'ship',
                        options: ['ship (con tàu - âm /ɪ/ ngắn)', 'sheep (con cừu - âm /iː/ dài)', 'shape (hình dạng)', 'shop (cửa hàng)'],
                        correctIndex: 0,
                        explanation: 'Âm /ɪ/ ngắn bật dứt khoát: ship /ʃɪp/.'
                    },
                    {
                        type: 'matching',
                        prompt: 'Nối các từ vựng với ký hiệu nguyên âm tương ứng:',
                        pairs: [
                            { left: 'tea /tiː/', right: 'Âm /iː/ dài' },
                            { left: 'sit /sɪt/', right: 'Âm /ɪ/ ngắn' },
                            { left: 'moon /muːn/', right: 'Âm /uː/ dài' },
                            { left: 'book /bʊk/', right: 'Âm /ʊ/ ngắn' }
                        ]
                    },
                    {
                        type: 'choice',
                        prompt: 'Từ "apple" (quả táo) có nguyên âm đầu là gì?',
                        character: 'apple /ˈæp.əl/',
                        reading: '/æ/',
                        audio: 'apple',
                        options: ['/æ/ (a bẹt, mở rộng hàm)', '/ʌ/ (á ngắn)', '/ɑː/ (a dài)', '/ə/ (ơ nhẹ)'],
                        correctIndex: 0,
                        explanation: 'apple /ˈæp.əl/ phát âm bằng nguyên âm a bẹt /æ/.'
                    }
                ]
            },
            {
                id: 'en_s1_l2',
                title: 'Phụ Âm Dễ Nhầm: /θ/, /ð/ & /ʃ/, /tʃ/',
                shortTitle: 'Th & Sh / Ch Sounds',
                desc: 'Đặt lưỡi giữa hai hàm răng phát âm think vs that, và phân biệt ship vs chip.',
                icon: '👅',
                xp: 25,
                questions: [
                    {
                        type: 'choice',
                        prompt: 'Âm đầu trong từ "think" /θɪŋk/ là âm gì?',
                        character: 'think /θɪŋk/',
                        reading: '/θ/',
                        audio: 'think',
                        options: ['/θ/ (âm vô thanh, kẹp lưỡi thổi hơi)', '/ð/ (âm hữu thanh, rung cổ họng)', '/s/ (âm s xì hơi)', '/t/ (âm t bật)'],
                        correctIndex: 0,
                        explanation: 'think có âm "th" vô thanh /θ/: kẹp nhẹ đầu lưỡi và thổi luồng hơi ra mà không rung dây thanh quản.'
                    },
                    {
                        type: 'matching',
                        prompt: 'Nối từ tiếng Anh với âm tương ứng:',
                        pairs: [
                            { left: 'this /ðɪs/', right: 'Âm /ð/ (rung cổ họng)' },
                            { left: 'thank /θæŋk/', right: 'Âm /θ/ (không rung)' },
                            { left: 'shoes /ʃuːz/', right: 'Âm /ʃ/ (chu môi xì hơi)' },
                            { left: 'chair /tʃeər/', right: 'Âm /tʃ/ (bật mạnh)' }
                        ]
                    }
                ]
            },
            {
                id: 'en_s1_l3',
                title: 'Thử Thách Chặng 1: Chuẩn Hóa Phát Âm IPA',
                shortTitle: 'Vượt ải Chặng 1 👑',
                desc: 'Vượt qua bài test nhận diện âm thanh IPA quốc tế.',
                icon: '👑',
                xp: 40,
                isMilestone: true,
                questions: [
                    {
                        type: 'choice',
                        prompt: 'Trọng âm của từ "banana" rơi vào âm tiết thứ mấy?',
                        character: 'banana /bəˈnæn.ə/',
                        reading: 'âm tiết 2',
                        audio: 'banana',
                        options: ['Âm tiết thứ 2 (bə-NAN-ə)', 'Âm tiết thứ 1 (BAN-an-a)', 'Âm tiết thứ 3 (ban-an-A)', 'Đều như nhau'],
                        correctIndex: 0,
                        explanation: 'banana /bəˈnæn.ə/ nhấn trọng âm chính vào âm tiết số 2.'
                    },
                    {
                        type: 'matching',
                        prompt: 'Nối các từ đồng âm khác nghĩa (Homophones):',
                        pairs: [
                            { left: 'see /siː/ (nhìn)', right: 'sea /siː/ (biển cả)' },
                            { left: 'hear /hɪər/ (nghe)', right: 'here /hɪər/ (ở đây)' },
                            { left: 'right /raɪt/ (đúng)', right: 'write /raɪt/ (viết)' },
                            { left: 'sun /sʌn/ (mặt trời)', right: 'son /sʌn/ (con trai)' }
                        ]
                    }
                ]
            }
        ]
    },
    {
        stage: 2,
        id: 'en_stage_2',
        title: 'Chặng 2: 1,000 Từ Vựng Cốt Lõi Oxford A1 - A2',
        sub: 'Từ vựng giao tiếp gia đình, thói quen sinh hoạt, trường lớp và ẩm thực.',
        icon: '🌱',
        color: 'sky',
        lessons: [
            {
                id: 'en_s2_l1',
                title: 'Giới Thiệu Bản Thân & Gia Đình',
                shortTitle: 'Introductions & Family',
                desc: 'Hỏi tên, quê quán, nghề nghiệp và giới thiệu người thân trong gia đình.',
                icon: '👋',
                xp: 25,
                questions: [
                    {
                        type: 'choice',
                        prompt: 'Khi ai đó nói "Nice to meet you!", câu đáp lại lịch sự là gì?',
                        character: 'Nice to meet you too!',
                        reading: 'Nice to meet you too',
                        audio: 'Nice to meet you too',
                        options: ['Nice to meet you too! (Rất vui được gặp bạn)', 'You are welcome! (Không có chi)', 'Goodbye! (Tạm biệt)', 'I am fine (Tôi khỏe)'],
                        correctIndex: 0,
                        explanation: 'Nice to meet you too! là câu đáp lại chuẩn mực khi làm quen.'
                    },
                    {
                        type: 'matching',
                        prompt: 'Nối các thành viên trong gia đình:',
                        pairs: [
                            { left: 'Parents', right: 'Bố mẹ / Phụ huynh' },
                            { left: 'Siblings', right: 'Anh chị em ruột' },
                            { left: 'Grandfather', right: 'Ông' },
                            { left: 'Cousin', right: 'Anh/chị/em họ' }
                        ]
                    }
                ]
            },
            {
                id: 'en_s2_l2',
                title: 'Thói Quen Thường Ngày (Daily Routine)',
                shortTitle: 'Daily Habits',
                desc: 'Các hành động thức dậy, ăn sáng, đi làm, tập thể dục và đi ngủ.',
                icon: '☀️',
                xp: 25,
                questions: [
                    {
                        type: 'choice',
                        prompt: 'Cụm từ "wake up" khác "get up" ở điểm nào?',
                        character: 'wake up vs get up',
                        reading: 'wake up',
                        audio: 'wake up',
                        options: ['wake up là mở mắt tỉnh giấc, get up là ngồi dậy bước ra khỏi giường', 'Hai từ hoàn toàn giống hệt nhau', 'wake up là đi ngủ, get up là thức dậy', 'get up chỉ dùng cho trẻ em'],
                        correctIndex: 0,
                        explanation: 'Wake up = Tỉnh giấc / Mở mắt; Get up = Rời khỏi giường để bắt đầu ngày mới.'
                    },
                    {
                        type: 'matching',
                        prompt: 'Nối các thói quen hàng ngày:',
                        pairs: [
                            { left: 'Brush teeth', right: 'Đánh răng' },
                            { left: 'Have breakfast', right: 'Ăn bữa sáng' },
                            { left: 'Take a shower', right: 'Tắm vòi sen' },
                            { left: 'Go to bed', right: 'Đi ngủ' }
                        ]
                    }
                ]
            },
            {
                id: 'en_s2_l3',
                title: 'Thử Thách Chặng 2: Oxford A2 Milestone',
                shortTitle: 'Vượt ải Chặng 2 👑',
                desc: 'Vượt qua bài test vốn từ vựng đời sống và phản xạ câu hỏi Wh-questions.',
                icon: '👑',
                xp: 40,
                isMilestone: true,
                questions: [
                    {
                        type: 'choice',
                        prompt: '"How often do you exercise?" hỏi về điều gì?',
                        character: 'How often do you exercise?',
                        reading: 'frequency',
                        audio: 'How often do you exercise',
                        options: ['Bạn tập thể dục thường xuyên như thế nào (tần suất)?', 'Bạn tập thể dục ở đâu?', 'Bạn tập thể dục với ai?', 'Bạn tập thể dục lúc mấy giờ?'],
                        correctIndex: 0,
                        explanation: 'How often dùng để hỏi về tần suất (ví dụ: Every day, Twice a week...).'
                    },
                    {
                        type: 'matching',
                        prompt: 'Nối trạng từ chỉ tần suất theo thứ tự giảm dần:',
                        pairs: [
                            { left: 'Always (100%)', right: 'Luôn luôn' },
                            { left: 'Usually (80%)', right: 'Thường xuyên' },
                            { left: 'Sometimes (50%)', right: 'Thỉnh thoảng' },
                            { left: 'Never (0%)', right: 'Không bao giờ' }
                        ]
                    }
                ]
            }
        ]
    },
    {
        stage: 3,
        id: 'en_stage_3',
        title: 'Chặng 3: 2,000 Từ Vựng B1 - B2 & Cụm Collocations',
        sub: 'Từ vựng công sở, thuyết trình, thành ngữ tự nhiên và các cụm từ kết hợp chuẩn.',
        icon: '💼',
        color: 'amber',
        lessons: [
            {
                id: 'en_s3_l1',
                title: 'Cụm Collocations Thông Dụng Nhất',
                shortTitle: 'Do vs Make & Take',
                desc: 'Phân biệt "make a decision" vs "do homework", "take notes" vs "have fun".',
                icon: '🧩',
                xp: 30,
                questions: [
                    {
                        type: 'choice',
                        prompt: 'Điền từ đúng: "I need to (___) a mistake into a lesson."',
                        character: 'make a mistake',
                        reading: 'make',
                        audio: 'make a mistake',
                        options: ['make', 'do', 'take', 'have'],
                        correctIndex: 0,
                        explanation: 'Đi với mistake ta luôn dùng động từ "make": make a mistake (phạm sai lầm).'
                    },
                    {
                        type: 'matching',
                        prompt: 'Nối các cụm Collocation tự nhiên:',
                        pairs: [
                            { left: 'Make a decision', right: 'Đưa ra quyết định' },
                            { left: 'Do research', right: 'Tiến hành nghiên cứu' },
                            { left: 'Take a break', right: 'Nghỉ giải lao một chút' },
                            { left: 'Catch someone\'s eye', right: 'Thu hút ánh nhìn của ai đó' }
                        ]
                    }
                ]
            },
            {
                id: 'en_s3_l2',
                title: 'Thử Thách Chặng 3: B1 - B2 Milestone',
                shortTitle: 'Vượt ải Chặng 3 👑',
                desc: 'Khẳng định năng lực từ vựng trung cấp phục vụ công việc và học thuật.',
                icon: '👑',
                xp: 45,
                isMilestone: true,
                questions: [
                    {
                        type: 'choice',
                        prompt: 'Thành ngữ "piece of cake" có ý nghĩa là gì?',
                        character: 'It is a piece of cake!',
                        reading: 'very easy',
                        audio: 'It is a piece of cake',
                        options: ['Dễ như ăn cháo / Rất dễ dàng', 'Một miếng bánh ngọt ngon', 'Rất khó khăn', 'Đắt tiền'],
                        correctIndex: 0,
                        explanation: '"A piece of cake" là thành ngữ chỉ một việc gì đó cực kỳ dễ dàng.'
                    }
                ]
            }
        ]
    },
    {
        stage: 4,
        id: 'en_stage_4',
        title: 'Chặng 4: Hội Thoại Phản Xạ AI & Video Shadowing',
        sub: 'Luyện nói phản xạ tức thì, Small Talk với người bản xứ và phỏng vấn việc làm.',
        icon: '🗣️',
        color: 'emerald',
        lessons: [
            {
                id: 'en_s4_l1',
                title: 'Nghệ Thuật Small Talk & Kết Nối Tự Nhiên',
                shortTitle: 'Small Talk Mastery',
                desc: 'Phá băng mọi cuộc trò chuyện với chủ đề thời tiết, cuối tuần và sở thích.',
                icon: '☕',
                xp: 30,
                questions: [
                    {
                        type: 'choice',
                        prompt: 'Khi muốn mở đầu cuộc trò chuyện thân mật ở thang máy, bạn nói:',
                        character: 'Lovely weather today, isn\'t it?',
                        reading: 'small talk',
                        audio: 'Lovely weather today, isn\'t it',
                        options: ['Lovely weather today, isn\'t it? (Hôm nay trời đẹp thật nhỉ?)', 'How much do you earn? (Bạn kiếm bao nhiêu tiền?)', 'Who are you? (Bạn là ai?)', 'Why are you here? (Sao bạn ở đây?)'],
                        correctIndex: 0,
                        explanation: 'Bình luận về thời tiết là cách mở đầu câu chuyện (Ice breaker) kinh điển trong văn hóa phương Tây.'
                    },
                    {
                        type: 'matching',
                        prompt: 'Nối các câu hỏi mở trong hội thoại:',
                        pairs: [
                            { left: 'How was your weekend?', right: 'Cuối tuần của bạn thế nào?' },
                            { left: 'What do you like to do for fun?', right: 'Bạn thường làm gì khi rảnh rỗi?' },
                            { left: 'Have you been here before?', right: 'Bạn đã từng đến đây bao giờ chưa?' },
                            { left: 'What do you think of this?', right: 'Bạn nghĩ thế nào về điều này?' }
                        ]
                    }
                ]
            },
            {
                id: 'en_s4_l2',
                title: 'Thử Thách Chặng 4: Tự Tin Phản Xạ Không Vấp',
                shortTitle: 'Vượt ải Chặng 4 👑',
                desc: 'Hoàn thành bài kiểm tra phản xạ đàm thoại trôi chảy cùng AI.',
                icon: '👑',
                xp: 45,
                isMilestone: true,
                questions: [
                    {
                        type: 'choice',
                        prompt: 'Từ nối nào dùng để chuyển ý lịch sự khi không đồng tình: "I see your point, (___) I have a different perspective."',
                        character: 'I see your point, but / however...',
                        reading: 'however',
                        audio: 'however',
                        options: ['however (tuy nhiên)', 'because (bởi vì)', 'so (vì vậy)', 'and (và)'],
                        correctIndex: 0,
                        explanation: '"However" hoặc "but" biểu thị sự tương phản, giúp tranh luận mềm mỏng và lịch sự.'
                    }
                ]
            }
        ]
    },
    {
        stage: 5,
        id: 'en_stage_5',
        title: 'Chặng 5: Luyện Đề TOEIC / IELTS Chuẩn Quốc Tế',
        sub: 'Bấm giờ thi thử Listening Part 1-4, Reading, mẹo tránh bẫy từ và bứt phá điểm số.',
        icon: '🏆',
        color: 'purple',
        lessons: [
            {
                id: 'en_s5_l1',
                title: 'Tổng Kết Lộ Trình: Danh Hiệu QuizKi English Master',
                shortTitle: 'Đại Chung Kết 🏆',
                desc: 'Về đích lộ trình tiếng Anh toàn diện với chứng nhận tinh hoa!',
                icon: '🏆',
                xp: 60,
                isMilestone: true,
                questions: [
                    {
                        type: 'choice',
                        prompt: 'Chọn câu viết đúng ngữ pháp nâng cao:',
                        character: 'Not only did she finish early, but she also scored top marks.',
                        reading: 'Inversion',
                        audio: 'Not only did she finish early, but she also scored top marks',
                        options: [
                            'Not only did she finish early, but she also scored top marks. (Cấu trúc đảo ngữ)',
                            'Not only she finished early, but she scored top marks too.',
                            'She not only did finish early, also scored top marks.',
                            'Only not did she finish early, but scored top marks.'
                        ],
                        correctIndex: 0,
                        explanation: 'Cấu trúc đảo ngữ với "Not only + trợ động từ + S + V, but S + also + V".'
                    },
                    {
                        type: 'matching',
                        prompt: 'Nối các mốc mục tiêu tiếng Anh quốc tế:',
                        pairs: [
                            { left: 'TOEIC 550+', right: 'Tốt nghiệp Đại học & Giao tiếp cơ bản' },
                            { left: 'TOEIC 850+', right: 'Làm việc chuyên nghiệp tại công ty Đa quốc gia' },
                            { left: 'IELTS 6.5', right: 'Đủ điều kiện du học các nước nói tiếng Anh' },
                            { left: 'IELTS 8.0+', right: 'Thành thạo gần như người bản xứ' }
                        ]
                    }
                ]
            }
        ]
    }
];

