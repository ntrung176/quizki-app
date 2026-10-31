/**
 * Korean Curriculum & Interactive Bite-Sized Lessons for Duolingo Roadmap
 * Covers: Stage 1 (Hangul) -> Stage 2 (TOPIK I Vocab) -> Stage 3 (Grammar & K-Drama) -> Stage 4 (Travel Kaiwa) -> Stage 5 (TOPIK Test)
 */

export const KO_ROADMAP_STAGES = [
    {
        stage: 1,
        id: 'ko_stage_1',
        title: 'Chặng 1: Bảng Chữ Cái Hangul & Phát Âm Chuẩn Seoul',
        sub: '10 nguyên âm cơ bản, 14 phụ âm, ghép vần, quy tắc Batchim và câu chào hỏi.',
        icon: '🇰🇷',
        color: 'rose',
        lessons: [
            {
                id: 'ko_s1_l1',
                title: 'Nguyên Âm Cơ Bản: ㅏ ㅓ ㅗ ㅜ ㅡ ㅣ',
                shortTitle: 'ㅏ ㅓ ㅗ ㅜ ㅡ ㅣ',
                desc: 'Khám phá triết lý Thiên - Địa - Nhân tạo nên các nét nguyên âm trong tiếng Hàn.',
                icon: 'ㅏ',
                xp: 20,
                questions: [
                    {
                        type: 'choice',
                        prompt: 'Nguyên âm "ㅏ" được phát âm là gì?',
                        character: 'ㅏ',
                        reading: 'a',
                        audio: '아',
                        options: ['a', 'eo (ơ/o)', 'o (ô)', 'u'],
                        correctIndex: 0,
                        explanation: 'ㅏ có nét sổ dọc và nét gạch sang phải, đọc là "a".'
                    },
                    {
                        type: 'choice',
                        prompt: 'Ký tự nào sau đây là nguyên âm "i"?',
                        reading: 'i',
                        audio: '이',
                        options: ['ㅣ', 'ㅡ', 'ㅓ', 'ㅜ'],
                        correctIndex: 0,
                        explanation: 'ㅣ là một nét sổ thẳng tượng trưng cho con người đứng, đọc là "i".'
                    },
                    {
                        type: 'audio_choice',
                        prompt: 'Nghe phát âm và chọn nguyên âm đúng:',
                        audio: '오',
                        options: ['ㅗ (o/ô)', 'ㅜ (u)', 'ㅏ (a)', 'ㅓ (eo)'],
                        correctIndex: 0,
                        explanation: 'ㅗ phát âm tròn môi là "ô".'
                    },
                    {
                        type: 'matching',
                        prompt: 'Nối các nguyên âm tiếng Hàn với phát âm tương ứng:',
                        pairs: [
                            { left: 'ㅏ', right: 'a' },
                            { left: 'ㅓ', right: 'eo (ơ/o)' },
                            { left: 'ㅗ', right: 'o (ô)' },
                            { left: 'ㅜ', right: 'u' }
                        ]
                    },
                    {
                        type: 'choice',
                        prompt: 'Từ "아이" (a-i) trong tiếng Hàn có nghĩa là gì?',
                        character: '아이',
                        reading: 'a-i',
                        audio: '아이',
                        options: ['Trẻ em / Đứa bé', 'Quả dưa hấu', 'Cái bàn', 'Mặt trời'],
                        correctIndex: 0,
                        explanation: '아이 (a-i) ghép từ nguyên âm 아 và 이, nghĩa là em bé / trẻ em.'
                    }
                ]
            },
            {
                id: 'ko_s1_l2',
                title: 'Phụ Âm Cơ Bản: ㄱ ㄴ ㄷ ㄹ ㅁ ㅂ ㅅ',
                shortTitle: 'ㄱ ㄴ ㄷ ㄹ ㅁ ㅂ ㅅ',
                desc: 'Làm quen các phụ âm mô phỏng khẩu hình phát âm: Giyeok, Nieun, Digeut, Rieul...',
                icon: 'ㄱ',
                xp: 25,
                questions: [
                    {
                        type: 'choice',
                        prompt: 'Phụ âm "ㄱ" (Giyeok) đọc tương tự âm nào trong tiếng Việt?',
                        character: 'ㄱ',
                        reading: 'g / k',
                        audio: '가',
                        options: ['g / k', 'n', 'm', 's'],
                        correctIndex: 0,
                        explanation: 'ㄱ đầu từ đọc nhẹ như "k", giữa hai nguyên âm đọc như "g".'
                    },
                    {
                        type: 'matching',
                        prompt: 'Nối phụ âm với tên gọi chuẩn Hangul:',
                        pairs: [
                            { left: 'ㄱ', right: 'Giyeok (g/k)' },
                            { left: 'ㄴ', right: 'Nieun (n)' },
                            { left: 'ㅁ', right: 'Mieum (m)' },
                            { left: 'ㅅ', right: 'Siot (s)' }
                        ]
                    },
                    {
                        type: 'audio_choice',
                        prompt: 'Nghe từ vựng sau và chọn nghĩa đúng:',
                        character: '나무',
                        reading: 'namu',
                        audio: '나무',
                        options: ['Cái cây', 'Con bướm', 'Cái cặp', 'Ngôi nhà'],
                        correctIndex: 0,
                        explanation: '나무 (namu) = Cái cây.'
                    }
                ]
            },
            {
                id: 'ko_s1_l3',
                title: 'Chào Hỏi Hàng Ngày & Quy Tắc Ghép Vần',
                shortTitle: '안녕하세요',
                desc: 'Các câu chào hỏi cửa miệng của người Hàn Quốc và cách ghép âm tiết.',
                icon: '👋',
                xp: 25,
                questions: [
                    {
                        type: 'choice',
                        prompt: '"안녕하세요" trong tiếng Hàn dùng để làm gì?',
                        character: '안녕하세요',
                        reading: 'annyeonghaseyo',
                        audio: '안녕하세요',
                        options: ['Xin chào lịch sự', 'Cảm ơn', 'Tạm biệt', 'Xin lỗi'],
                        correctIndex: 0,
                        explanation: '안녕하세요 (annyeonghaseyo) là câu chào kinh điển, phổ biến nhất ở Hàn Quốc.'
                    },
                    {
                        type: 'matching',
                        prompt: 'Nối các câu giao tiếp cơ bản tiếng Hàn:',
                        pairs: [
                            { left: '감사합니다', right: 'Cảm ơn' },
                            { left: '죄송합니다', right: 'Xin lỗi' },
                            { left: '안녕히 가세요', right: 'Tạm biệt (chúc người đi bình an)' },
                            { left: '네', right: 'Vâng / Dạ' }
                        ]
                    },
                    {
                        type: 'choice',
                        prompt: 'Từ "아니요" (aniyo) có nghĩa là gì?',
                        character: '아니요',
                        reading: 'aniyo',
                        audio: '아니요',
                        options: ['Không phải / Không', 'Vâng / Đúng', 'Xin lỗi', 'Cảm ơn'],
                        correctIndex: 0,
                        explanation: '아니요 (aniyo) có nghĩa là "Không", đối lập với 네 (ne - Vâng).'
                    }
                ]
            },
            {
                id: 'ko_s1_l4',
                title: 'Thử Thách Chặng 1: Master Chữ Cái Hangul',
                shortTitle: 'Vượt ải Chặng 1 👑',
                desc: 'Vượt qua bài kiểm tra bảng chữ cái và nhận diện âm tiết Hangul siêu tốc.',
                icon: '👑',
                xp: 40,
                isMilestone: true,
                questions: [
                    {
                        type: 'choice',
                        prompt: 'Từ "한국" (Hanguk) nghĩa là nước nào?',
                        character: '한국',
                        reading: 'hanguk',
                        audio: '한국',
                        options: ['Hàn Quốc', 'Nhật Bản', 'Việt Nam', 'Mỹ'],
                        correctIndex: 0,
                        explanation: '한국 (Hanguk) = Hàn Quốc; 한국어 = Tiếng Hàn.'
                    },
                    {
                        type: 'matching',
                        prompt: 'Nối từ chỉ người và đại từ cơ bản:',
                        pairs: [
                            { left: '저 (jeo)', right: 'Tôi (khiêm tốn)' },
                            { left: '친구 (chingu)', right: 'Bạn bè' },
                            { left: '선생님 (seonsaengnim)', right: 'Thầy / Cô giáo' },
                            { left: '학생 (haksaeng)', right: 'Học sinh' }
                        ]
                    }
                ]
            }
        ]
    },
    {
        stage: 2,
        id: 'ko_stage_2',
        title: 'Chặng 2: 800 Từ Vựng Sơ Cấp TOPIK I',
        sub: 'Số đếm Hán - Thuần Hàn, ẩm thực, gia đình, thời gian và sinh hoạt hàng ngày.',
        icon: '🌱',
        color: 'sky',
        lessons: [
            {
                id: 'ko_s2_l1',
                title: 'Số Đếm Thuần Hàn & Hán Hàn',
                shortTitle: '하나・둘・셋 / 일・이・삼',
                desc: 'Nắm chắc 2 hệ thống số đếm khi đếm đồ vật, tính tiền và xem giờ giấc.',
                icon: '🔢',
                xp: 25,
                questions: [
                    {
                        type: 'choice',
                        prompt: 'Số 1 trong hệ số Thuần Hàn (dùng đếm tuổi, đếm cái) là gì?',
                        character: '하나',
                        reading: 'hana',
                        audio: '하나',
                        options: ['하나 (hana)', '둘 (dul)', '셋 (set)', '일 (il)'],
                        correctIndex: 0,
                        explanation: 'Hệ thuần Hàn: 하나 (1), 둘 (2), 셋 (3), 넷 (4), 다섯 (5).'
                    },
                    {
                        type: 'matching',
                        prompt: 'Nối số đếm Hán Hàn (dùng tính tiền, số điện thoại, ngày tháng):',
                        pairs: [
                            { left: '일 (il)', right: 'Số 1' },
                            { left: '이 (i)', right: 'Số 2' },
                            { left: '삼 (sam)', right: 'Số 3' },
                            { left: '사 (sa)', right: 'Số 4' }
                        ]
                    }
                ]
            },
            {
                id: 'ko_s2_l2',
                title: 'Món Ngon Ẩm Thực & Bữa Ăn Hàn Quốc',
                shortTitle: '김치・밥・고기',
                desc: 'Từ vựng các món ăn quen thuộc: Cơm, canh, kim chi, thịt nướng, nước ngọt.',
                icon: '🍲',
                xp: 25,
                questions: [
                    {
                        type: 'choice',
                        prompt: '"밥을 먹어요" (Babeul meogeoyo) nghĩa là gì?',
                        character: '밥을 먹어요',
                        reading: 'babeul meogeoyo',
                        audio: '밥을 먹어요',
                        options: ['Tôi ăn cơm', 'Tôi uống nước', 'Tôi nấu cơm', 'Tôi mua đồ ăn'],
                        correctIndex: 0,
                        explanation: '밥 (cơm) + 을 (trợ từ tân ngữ) + 먹어요 (ăn).'
                    },
                    {
                        type: 'matching',
                        prompt: 'Nối các món ăn và đồ uống Hàn Quốc:',
                        pairs: [
                            { left: '김치 (kimchi)', right: 'Kim chi' },
                            { left: '물 (mul)', right: 'Nước' },
                            { left: '고기 (gogi)', right: 'Thịt' },
                            { left: '라면 (ramyeon)', right: 'Mì gói / Mì ramen' }
                        ]
                    }
                ]
            },
            {
                id: 'ko_s2_l3',
                title: 'Thử Thách Chặng 2: TOPIK I Khởi Động',
                shortTitle: 'Vượt ải Chặng 2 👑',
                desc: 'Vượt ải kiểm tra từ vựng sơ cấp TOPIK I và câu giao tiếp ngắn.',
                icon: '👑',
                xp: 40,
                isMilestone: true,
                questions: [
                    {
                        type: 'choice',
                        prompt: 'Khi muốn nói "Món này ngon quá!", bạn nói thế nào?',
                        character: '맛있어요',
                        reading: 'masisseoyo',
                        audio: '맛있어요',
                        options: ['맛있어요 (Ngon quá)', '맛없어요 (Dở tệ)', '비싸요 (Đắt quá)', '좋아요 (Tốt/Thích)'],
                        correctIndex: 0,
                        explanation: '맛있다 (ngon) chia dạng thân mật lịch sự là 맛있어요.'
                    },
                    {
                        type: 'matching',
                        prompt: 'Nối các động từ TOPIK I thông dụng:',
                        pairs: [
                            { left: '가다 (gada)', right: 'Đi' },
                            { left: '오다 (oda)', right: 'Đến' },
                            { left: '보다 (boda)', right: 'Xem / Nhìn' },
                            { left: '자다 (jada)', right: 'Ngủ' }
                        ]
                    }
                ]
            }
        ]
    },
    {
        stage: 3,
        id: 'ko_stage_3',
        title: 'Chặng 3: 1,500 Từ Vựng & Ngữ Pháp K-Drama',
        sub: 'Đuôi câu -아요/어요, -고 싶어요, kính ngữ và hội thoại phim truyền hình.',
        icon: '🎬',
        color: 'amber',
        lessons: [
            {
                id: 'ko_s3_l1',
                title: 'Mẫu Câu Muốn & Bày Tỏ Tình Cảm',
                shortTitle: '-고 싶어요 / 사랑해요',
                desc: 'Học cấu trúc mong muốn "-고 싶어요" và các câu cửa miệng trong phim K-drama.',
                icon: '💖',
                xp: 30,
                questions: [
                    {
                        type: 'choice',
                        prompt: 'Cụm từ "보고 싶어요" (Bogo sipeoyo) có ý nghĩa kinh điển gì?',
                        character: '보고 싶어요',
                        reading: 'bogo sipeoyo',
                        audio: '보고 싶어요',
                        options: ['Anh/Em nhớ em/anh (Muốn gặp)', 'Tôi muốn đi xem phim', 'Tôi không thích xem', 'Tôi đang bận'],
                        correctIndex: 0,
                        explanation: '보다 (nhìn/gặp) + 고 싶어요 (muốn) = Muốn gặp / Nhớ ai đó.'
                    },
                    {
                        type: 'matching',
                        prompt: 'Nối các câu nói K-drama quen thuộc:',
                        pairs: [
                            { left: '진짜요? (Jinjja-yo?)', right: 'Thật á?' },
                            { left: '대박! (Daebak!)', right: 'Đỉnh quá! / Tuyệt đỉnh!' },
                            { left: '사랑해요 (Saranghaeyo)', right: 'Tôi yêu bạn' },
                            { left: '괜찮아요 (Gwaenchanh-ayo)', right: 'Không sao đâu' }
                        ]
                    }
                ]
            },
            {
                id: 'ko_s3_l2',
                title: 'Thử Thách Chặng 3: Phản Xạ K-Drama',
                shortTitle: 'Vượt ải Chặng 3 👑',
                desc: 'Hoàn thành bài kiểm tra phản xạ các câu nói phim ảnh và ngữ pháp sơ - trung cấp.',
                icon: '👑',
                xp: 45,
                isMilestone: true,
                questions: [
                    {
                        type: 'choice',
                        prompt: 'Đuôi câu trang trọng trong quân đội hoặc phát thanh "-ㅂ니다/습니다" dùng khi nào?',
                        character: '감사합니다',
                        reading: 'gamsahamnida',
                        audio: '감사합니다',
                        options: ['Trong hoàn cảnh trang trọng, nghiêm túc', 'Nói chuyện với bạn bè thân thiết', 'Nói với em nhỏ', 'Nói một mình'],
                        correctIndex: 0,
                        explanation: '-ㅂ니다/습니다 là đuôi câu kính ngữ trang trọng bậc cao nhất.'
                    },
                    {
                        type: 'matching',
                        prompt: 'Nối các từ vựng cảm xúc:',
                        pairs: [
                            { left: '행복해요', right: 'Hạnh phúc' },
                            { left: '슬퍼요', right: 'Buồn bã' },
                            { left: '재미있어요', right: 'Thú vị / Vui nhộn' },
                            { left: '피곤해요', right: 'Mệt mỏi' }
                        ]
                    }
                ]
            }
        ]
    },
    {
        stage: 4,
        id: 'ko_stage_4',
        title: 'Chặng 4: Đàm Thoại AI Kaiwa 1-1 Tiếng Hàn',
        sub: 'Giao tiếp tình huống thực tế: mua sắm ở Dongdaemun, đi tàu điện ngầm ngắm Seoul.',
        icon: '🗣️',
        color: 'emerald',
        lessons: [
            {
                id: 'ko_s4_l1',
                title: 'Mua Sắm & Mặc Cả Tại Chợ Truyền Thống',
                shortTitle: '얼마예요? / 깎아주세요',
                desc: 'Hỏi giá tiền, thử đồ và xin bớt giá khi mua sắm ở Hàn Quốc.',
                icon: '🛍️',
                xp: 30,
                questions: [
                    {
                        type: 'choice',
                        prompt: 'Câu "이거 얼마예요?" (Igeo eolmayeyo?) nghĩa là gì?',
                        character: '이거 얼마예요?',
                        reading: 'igeo eolmayeyo',
                        audio: '이거 얼마예요',
                        options: ['Cái này bao nhiêu tiền?', 'Cái này là cái gì?', 'Cái này có ngon không?', 'Cái này ở đâu?'],
                        correctIndex: 0,
                        explanation: '이거 (cái này) + 얼마예요 (bao nhiêu tiền).'
                    },
                    {
                        type: 'matching',
                        prompt: 'Nối các mẫu câu giao tiếp đi chợ:',
                        pairs: [
                            { left: '깎아주세요', right: 'Bớt giá cho tôi đi mà' },
                            { left: '이거 주세요', right: 'Cho tôi lấy cái này' },
                            { left: '카드 돼요?', right: 'Có quẹt thẻ được không?' },
                            { left: '영수증 주세요', right: 'Cho tôi xin hóa đơn' }
                        ]
                    }
                ]
            },
            {
                id: 'ko_s4_l2',
                title: 'Thử Thách Chặng 4: Hội Thoại Seoul',
                shortTitle: 'Vượt ải Chặng 4 👑',
                desc: 'Làm chủ các tình huống giao tiếp thực tế như người bản xứ.',
                icon: '👑',
                xp: 45,
                isMilestone: true,
                questions: [
                    {
                        type: 'choice',
                        prompt: 'Muốn hỏi "Nhà ga tàu điện ngầm ở đâu?", bạn hỏi thế nào?',
                        character: '지하철역이 어디예요?',
                        reading: 'jihacheol-yeogi eodiyeyo',
                        audio: '지하철역이 어디예요',
                        options: ['지하철역이 어디예요? (Ga tàu điện ở đâu?)', '화장실이 어디예요? (Nhà vệ sinh ở đâu?)', '호텔이 어디예요? (Khách sạn ở đâu?)', '식당이 어디예요? (Quán ăn ở đâu?)'],
                        correctIndex: 0,
                        explanation: '지하철역 = Ga tàu điện ngầm; 어디예요 = Ở đâu.'
                    }
                ]
            }
        ]
    },
    {
        stage: 5,
        id: 'ko_stage_5',
        title: 'Chặng 5: Luyện Đề TOPIK I & II Toàn Diện',
        sub: 'Ngân hàng câu hỏi TOPIK chính thức, chiến lược làm bài đọc và nghe hiểu.',
        icon: '🏆',
        color: 'purple',
        lessons: [
            {
                id: 'ko_s5_l1',
                title: 'Tổng Kết Lộ Trình: Danh Hiệu TOPIK Master',
                shortTitle: 'Đại Chung Kết 🏆',
                desc: 'Hoàn thành bài thi tổng hợp để trở thành bậc thầy tiếng Hàn QuizKi!',
                icon: '🏆',
                xp: 60,
                isMilestone: true,
                questions: [
                    {
                        type: 'choice',
                        prompt: 'Từ "시험" (siheom) trong tiếng Hàn có nghĩa là gì?',
                        character: '시험',
                        reading: 'siheom',
                        audio: '시험',
                        options: ['Kỳ thi / Bài kiểm tra', 'Trường học', 'Sách giáo khoa', 'Kết quả'],
                        correctIndex: 0,
                        explanation: '시험 (siheom) = Thi cử / Bài kiểm tra (chữ Hán là THÍ NGHIỆM).'
                    },
                    {
                        type: 'matching',
                        prompt: 'Nối các từ vựng học thuật TOPIK:',
                        pairs: [
                            { left: '합격 (hapgyeok)', right: 'Thi đậu / Trúng tuyển' },
                            { left: '성적 (seongjeok)', right: 'Thành tích / Điểm số' },
                            { left: '목표 (mokpyo)', right: 'Mục tiêu' },
                            { left: '노력 (noryeok)', right: 'Nỗ lực' }
                        ]
                    }
                ]
            }
        ]
    }
];

