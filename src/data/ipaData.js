// Bảng phiên âm quốc tế IPA (International Phonetic Alphabet - 44 âm tiếng Anh chuẩn Oxford)
// 12 Nguyên âm đơn (Monophthongs) + 8 Nguyên âm đôi (Diphthongs) + 24 Phụ âm (Consonants)

export const IPA_CATEGORIES = [
    { id: 'monophthongs', name: 'Nguyên âm đơn (12 Monophthongs)', shortName: 'Nguyên âm đơn' },
    { id: 'diphthongs', name: 'Nguyên âm đôi (8 Diphthongs)', shortName: 'Nguyên âm đôi' },
    { id: 'voiceless_consonants', name: 'Phụ âm vô thanh (8 Voiceless)', shortName: 'Phụ âm vô thanh' },
    { id: 'voiced_consonants', name: 'Phụ âm hữu thanh (16 Voiced)', shortName: 'Phụ âm hữu thanh' },
];

export const IPA_DICTIONARY = {
    // ==========================================
    // 1. NGUYÊN ÂM ĐƠN (12 MONOPHTHONGS)
    // ==========================================
    'i_long': {
        id: 'i_long',
        char: 'iː',
        name: 'Long i /iː/',
        type: 'Nguyên âm dài',
        category: 'monophthongs',
        keyWord: 'sheep',
        keyWordMeaning: 'Con cừu',
        articulation: 'Môi kéo dẹt như đang cười mỉm, lưỡi nâng cao và đưa về phía trước, kéo dài âm /iː/ vừa phải.',
        minimalPair: { wordA: 'sheep', ipaA: '/ʃiːp/', wordB: 'ship', ipaB: '/ʃɪp/' },
        examples: [
            { word: 'see', ipa: '/siː/', meaning: 'Nhìn thấy' },
            { word: 'meet', ipa: '/miːt/', meaning: 'Gặp gỡ' },
            { word: 'team', ipa: '/tiːm/', meaning: 'Đội nhóm' }
        ]
    },
    'i_short': {
        id: 'i_short',
        char: 'ɪ',
        name: 'Short i /ɪ/',
        type: 'Nguyên âm ngắn',
        category: 'monophthongs',
        keyWord: 'ship',
        keyWordMeaning: 'Tàu thủy',
        articulation: 'Môi hơi mở hé tự nhiên, phát âm âm /i/ rất dứt khoát, ngắn và dứt điểm nhanh (hơi lai âm "ê").',
        minimalPair: { wordA: 'ship', ipaA: '/ʃɪp/', wordB: 'sheep', ipaB: '/ʃiːp/' },
        examples: [
            { word: 'sit', ipa: '/sɪt/', meaning: 'Ngồi' },
            { word: 'hit', ipa: '/hɪt/', meaning: 'Đánh / Trúng' },
            { word: 'fish', ipa: '/fɪʃ/', meaning: 'Con cá' }
        ]
    },
    'u_short': {
        id: 'u_short',
        char: 'ʊ',
        name: 'Short u /ʊ/',
        type: 'Nguyên âm ngắn',
        category: 'monophthongs',
        keyWord: 'good',
        keyWordMeaning: 'Tốt / Giỏi',
        articulation: 'Môi tròn nhẹ, phát âm âm /u/ ngắn và dứt khoát (hơi lai âm "ư/ô" lướt).',
        minimalPair: { wordA: 'pull', ipaA: '/pʊl/', wordB: 'pool', ipaB: '/puːl/' },
        examples: [
            { word: 'book', ipa: '/bʊk/', meaning: 'Quyển sách' },
            { word: 'look', ipa: '/lʊk/', meaning: 'Nhìn xem' },
            { word: 'foot', ipa: '/fʊt/', meaning: 'Bàn chân' }
        ]
    },
    'u_long': {
        id: 'u_long',
        char: 'uː',
        name: 'Long u /uː/',
        type: 'Nguyên âm dài',
        category: 'monophthongs',
        keyWord: 'shoot',
        keyWordMeaning: 'Bắn súng',
        articulation: 'Chu môi tròn hẳn ra phía trước, phát âm âm /u/ tròn vành và ngân dài.',
        minimalPair: { wordA: 'pool', ipaA: '/puːl/', wordB: 'pull', ipaB: '/pʊl/' },
        examples: [
            { word: 'blue', ipa: '/bluː/', meaning: 'Màu xanh dương' },
            { word: 'food', ipa: '/fuːd/', meaning: 'Thức ăn' },
            { word: 'moon', ipa: '/muːn/', meaning: 'Mặt trăng' }
        ]
    },
    'e_short': {
        id: 'e_short',
        char: 'e',
        name: 'Short e /e/',
        type: 'Nguyên âm ngắn',
        category: 'monophthongs',
        keyWord: 'bed',
        keyWordMeaning: 'Chiếc giường',
        articulation: 'Mở miệng vừa phải, đầu lưỡi chạm chân răng dưới, phát âm âm "e" dứt khoát.',
        minimalPair: { wordA: 'bed', ipaA: '/bed/', wordB: 'bad', ipaB: '/bæd/' },
        examples: [
            { word: 'pen', ipa: '/pen/', meaning: 'Cây bút' },
            { word: 'head', ipa: '/hed/', meaning: 'Cái đầu' },
            { word: 'red', ipa: '/red/', meaning: 'Màu đỏ' }
        ]
    },
    'schwa': {
        id: 'schwa',
        char: 'ə',
        name: 'Schwa /ə/',
        type: 'Nguyên âm yếu / ngắn',
        category: 'monophthongs',
        keyWord: 'teacher',
        keyWordMeaning: 'Giáo viên',
        articulation: 'Thả lỏng toàn bộ cơ miệng và lưỡi ở vị trí trung lập, phát âm âm "ơ" thật nhẹ và ngắn.',
        minimalPair: { wordA: 'about', ipaA: '/əˈbaʊt/', wordB: 'above', ipaB: '/əˈbʌv/' },
        examples: [
            { word: 'banana', ipa: '/bəˈnɑːnə/', meaning: 'Quả chuối' },
            { word: 'doctor', ipa: '/ˈdɒktə/', meaning: 'Bác sĩ' },
            { word: 'ago', ipa: '/əˈɡəʊ/', meaning: 'Trước đây' }
        ]
    },
    'er_long': {
        id: 'er_long',
        char: 'ɜː',
        name: 'Long er /ɜː/',
        type: 'Nguyên âm dài',
        category: 'monophthongs',
        keyWord: 'bird',
        keyWordMeaning: 'Con chim',
        articulation: 'Môi mở vừa phải, cong nhẹ lưỡi lên trên, phát âm âm "ơ" ngân sâu từ cổ họng.',
        minimalPair: { wordA: 'bird', ipaA: '/bɜːd/', wordB: 'bed', ipaB: '/bed/' },
        examples: [
            { word: 'girl', ipa: '/ɡɜːl/', meaning: 'Cô gái' },
            { word: 'work', ipa: '/wɜːk/', meaning: 'Làm việc' },
            { word: 'learn', ipa: '/lɜːn/', meaning: 'Học tập' }
        ]
    },
    'or_long': {
        id: 'or_long',
        char: 'ɔː',
        name: 'Long or /ɔː/',
        type: 'Nguyên âm dài',
        category: 'monophthongs',
        keyWord: 'door',
        keyWordMeaning: 'Cánh cửa',
        articulation: 'Tròn môi, lưỡi co về sau cuống họng, phát âm âm "o" sâu và ngân dài.',
        minimalPair: { wordA: 'sport', ipaA: '/spɔːt/', wordB: 'spot', ipaB: '/spɒt/' },
        examples: [
            { word: 'four', ipa: '/fɔː/', meaning: 'Số 4' },
            { word: 'water', ipa: '/ˈwɔːtə/', meaning: 'Nước' },
            { word: 'call', ipa: '/kɔːl/', meaning: 'Gọi điện' }
        ]
    },
    'ae_ash': {
        id: 'ae_ash',
        char: 'æ',
        name: 'Short a /æ/ (A bẹt)',
        type: 'Nguyên âm ngắn mở',
        category: 'monophthongs',
        keyWord: 'cat',
        keyWordMeaning: 'Con mèo',
        articulation: 'Mở rộng khẩu hình cả chiều dọc lẫn chiều ngang, hạ thấp lưỡi, phát âm giữa "a" và "e".',
        minimalPair: { wordA: 'cat', ipaA: '/kæt/', wordB: 'cut', ipaB: '/kʌt/' },
        examples: [
            { word: 'man', ipa: '/mæn/', meaning: 'Người đàn ông' },
            { word: 'apple', ipa: '/ˈæpl/', meaning: 'Quả táo' },
            { word: 'black', ipa: '/blæk/', meaning: 'Màu đen' }
        ]
    },
    'wedge': {
        id: 'wedge',
        char: 'ʌ',
        name: 'Short u /ʌ/ (Á ngắn)',
        type: 'Nguyên âm ngắn',
        category: 'monophthongs',
        keyWord: 'up',
        keyWordMeaning: 'Lên trên',
        articulation: 'Mở miệng vừa phải như đang thư giãn, phát âm âm "á / ớ" ngắn, dứt khoát.',
        minimalPair: { wordA: 'cup', ipaA: '/kʌp/', wordB: 'cap', ipaB: '/kæp/' },
        examples: [
            { word: 'sun', ipa: '/sʌn/', meaning: 'Mặt trời' },
            { word: 'love', ipa: '/lʌv/', meaning: 'Tình yêu' },
            { word: 'bus', ipa: '/bʌs/', meaning: 'Xe buýt' }
        ]
    },
    'a_long': {
        id: 'a_long',
        char: 'ɑː',
        name: 'Long a /ɑː/',
        type: 'Nguyên âm dài mở',
        category: 'monophthongs',
        keyWord: 'far',
        keyWordMeaning: 'Xa xôi',
        articulation: 'Hạ thấp cằm mở rộng miệng tối đa, lưỡi hạ thấp phẳng, phát âm "a" trầm ấm ngân dài.',
        minimalPair: { wordA: 'heart', ipaA: '/hɑːt/', wordB: 'hut', ipaB: '/hʌt/' },
        examples: [
            { word: 'car', ipa: '/kɑː/', meaning: 'Xe hơi' },
            { word: 'star', ipa: '/stɑː/', meaning: 'Ngôi sao' },
            { word: 'father', ipa: '/ˈfɑːðə/', meaning: 'Người cha' }
        ]
    },
    'o_short': {
        id: 'o_short',
        char: 'ɒ',
        name: 'Short o /ɒ/',
        type: 'Nguyên âm ngắn',
        category: 'monophthongs',
        keyWord: 'on',
        keyWordMeaning: 'Ở trên',
        articulation: 'Mở miệng hơi tròn, phát âm âm "o" ngắn gọn và nhanh (chuẩn Anh - Anh).',
        minimalPair: { wordA: 'not', ipaA: '/nɒt/', wordB: 'nut', ipaB: '/nʌt/' },
        examples: [
            { word: 'hot', ipa: '/hɒt/', meaning: 'Nóng bức' },
            { word: 'dog', ipa: '/dɒɡ/', meaning: 'Con chó' },
            { word: 'box', ipa: '/bɒks/', meaning: 'Cái hộp' }
        ]
    },

    // ==========================================
    // 2. NGUYÊN ÂM ĐÔI (8 DIPHTHONGS)
    // ==========================================
    'dip_ei': {
        id: 'dip_ei',
        char: 'eɪ',
        name: 'Diphthong /eɪ/',
        type: 'Nguyên âm đôi',
        category: 'diphthongs',
        keyWord: 'wait',
        keyWordMeaning: 'Chờ đợi',
        articulation: 'Bắt đầu từ âm /e/ mở vừa, sau đó trượt mượt mà về âm /ɪ/ dẹt môi.',
        minimalPair: { wordA: 'pain', ipaA: '/peɪn/', wordB: 'pen', ipaB: '/pen/' },
        examples: [
            { word: 'day', ipa: '/deɪ/', meaning: 'Ngày' },
            { word: 'make', ipa: '/meɪk/', meaning: 'Tạo ra / Làm' },
            { word: 'rain', ipa: '/reɪn/', meaning: 'Cơn mưa' }
        ]
    },
    'dip_ai': {
        id: 'dip_ai',
        char: 'aɪ',
        name: 'Diphthong /aɪ/',
        type: 'Nguyên âm đôi',
        category: 'diphthongs',
        keyWord: 'my',
        keyWordMeaning: 'Của tôi',
        articulation: 'Mở miệng rộng ở âm /a/, sau đó trượt nhanh khép dẹt môi sang âm /ɪ/.',
        minimalPair: { wordA: 'bite', ipaA: '/baɪt/', wordB: 'bat', ipaB: '/bæt/' },
        examples: [
            { word: 'time', ipa: '/taɪm/', meaning: 'Thời gian' },
            { word: 'fly', ipa: '/flaɪ/', meaning: 'Bay' },
            { word: 'like', ipa: '/laɪk/', meaning: 'Thích' }
        ]
    },
    'dip_oi': {
        id: 'dip_oi',
        char: 'ɔɪ',
        name: 'Diphthong /ɔɪ/',
        type: 'Nguyên âm đôi',
        category: 'diphthongs',
        keyWord: 'boy',
        keyWordMeaning: 'Cậu bé',
        articulation: 'Bắt đầu với môi tròn /ɔː/, sau đó trượt mở dẹt môi sang âm /ɪ/.',
        minimalPair: { wordA: 'coin', ipaA: '/kɔɪn/', wordB: 'corn', ipaB: '/kɔːn/' },
        examples: [
            { word: 'voice', ipa: '/vɔɪs/', meaning: 'Giọng nói' },
            { word: 'oil', ipa: '/ɔɪl/', meaning: 'Dầu ăn' },
            { word: 'toy', ipa: '/tɔɪ/', meaning: 'Đồ chơi' }
        ]
    },
    'dip_au': {
        id: 'dip_au',
        char: 'aʊ',
        name: 'Diphthong /aʊ/',
        type: 'Nguyên âm đôi',
        category: 'diphthongs',
        keyWord: 'cow',
        keyWordMeaning: 'Con bò',
        articulation: 'Bắt đầu từ âm /a/ mở rộng miệng, sau đó chu tròn môi dần về âm /ʊ/.',
        minimalPair: { wordA: 'town', ipaA: '/taʊn/', wordB: 'tone', ipaB: '/təʊn/' },
        examples: [
            { word: 'house', ipa: '/haʊs/', meaning: 'Ngôi nhà' },
            { word: 'now', ipa: '/naʊ/', meaning: 'Bây giờ' },
            { word: 'cloud', ipa: '/klaʊd/', meaning: 'Đám mây' }
        ]
    },
    'dip_ou': {
        id: 'dip_ou',
        char: 'əʊ',
        name: 'Diphthong /əʊ/',
        type: 'Nguyên âm đôi',
        category: 'diphthongs',
        keyWord: 'show',
        keyWordMeaning: 'Trình diễn / Chỉ ra',
        articulation: 'Bắt đầu từ âm schwa /ə/ thả lỏng, rồi tròn chu môi về âm /ʊ/.',
        minimalPair: { wordA: 'boat', ipaA: '/bəʊt/', wordB: 'bought', ipaB: '/bɔːt/' },
        examples: [
            { word: 'go', ipa: '/ɡəʊ/', meaning: 'Đi' },
            { word: 'home', ipa: '/həʊm/', meaning: 'Nhà' },
            { word: 'open', ipa: '/ˈəʊpən/', meaning: 'Mở ra' }
        ]
    },
    'dip_ie': {
        id: 'dip_ie',
        char: 'ɪə',
        name: 'Diphthong /ɪə/',
        type: 'Nguyên âm đôi',
        category: 'diphthongs',
        keyWord: 'here',
        keyWordMeaning: 'Ở đây',
        articulation: 'Bắt đầu từ âm /ɪ/ ngắn, sau đó mở nhẹ thả lỏng về âm /ə/.',
        minimalPair: { wordA: 'hear', ipaA: '/hɪə/', wordB: 'hair', ipaB: '/heə/' },
        examples: [
            { word: 'near', ipa: '/nɪə/', meaning: 'Gần' },
            { word: 'beer', ipa: '/bɪə/', meaning: 'Bia' },
            { word: 'clear', ipa: '/klɪə/', meaning: 'Rõ ràng' }
        ]
    },
    'dip_ee': {
        id: 'dip_ee',
        char: 'eə',
        name: 'Diphthong /eə/',
        type: 'Nguyên âm đôi',
        category: 'diphthongs',
        keyWord: 'hair',
        keyWordMeaning: 'Mái tóc',
        articulation: 'Bắt đầu từ âm /e/, sau đó mở miệng thư giãn trượt về âm /ə/.',
        minimalPair: { wordA: 'fair', ipaA: '/feə/', wordB: 'fear', ipaB: '/fɪə/' },
        examples: [
            { word: 'bear', ipa: '/beə/', meaning: 'Con gấu' },
            { word: 'care', ipa: '/keə/', meaning: 'Quan tâm' },
            { word: 'share', ipa: '/ʃeə/', meaning: 'Chia sẻ' }
        ]
    },
    'dip_ue': {
        id: 'dip_ue',
        char: 'ʊə',
        name: 'Diphthong /ʊə/',
        type: 'Nguyên âm đôi',
        category: 'diphthongs',
        keyWord: 'cure',
        keyWordMeaning: 'Chữa trị',
        articulation: 'Bắt đầu từ âm /ʊ/ tròn môi, sau đó thả lỏng mở về âm /ə/.',
        minimalPair: { wordA: 'poor', ipaA: '/pʊə/', wordB: 'pour', ipaB: '/pɔː/' },
        examples: [
            { word: 'tour', ipa: '/tʊə/', meaning: 'Chuyến du lịch' },
            { word: 'pure', ipa: '/pjʊə/', meaning: 'Thuần khiết' },
            { word: 'sure', ipa: '/ʃʊə/', meaning: 'Chắc chắn' }
        ]
    },

    // ==========================================
    // 3. PHỤ ÂM VÔ THANH (8 VOICELESS)
    // ==========================================
    'c_p': {
        id: 'c_p',
        char: 'p',
        name: 'Voiceless /p/',
        type: 'Phụ âm vô thanh',
        category: 'voiceless_consonants',
        keyWord: 'pen',
        keyWordMeaning: 'Cây bút',
        articulation: 'Mím chặt hai môi chặn luồng khí, sau đó bật mạnh luồng hơi ra ngoài (dây thanh quản không rung).',
        minimalPair: { wordA: 'pin', ipaA: '/pɪn/', wordB: 'bin', ipaB: '/bɪn/' },
        examples: [
            { word: 'park', ipa: '/pɑːk/', meaning: 'Công viên' },
            { word: 'apple', ipa: '/ˈæpl/', meaning: 'Quả táo' },
            { word: 'help', ipa: '/help/', meaning: 'Giúp đỡ' }
        ]
    },
    'c_t': {
        id: 'c_t',
        char: 't',
        name: 'Voiceless /t/',
        type: 'Phụ âm vô thanh',
        category: 'voiceless_consonants',
        keyWord: 'tea',
        keyWordMeaning: 'Tách trà',
        articulation: 'Đầu lưỡi chạm vào chân răng hàm trên, bật mạnh luồng khí dứt khoát ra phía trước.',
        minimalPair: { wordA: 'two', ipaA: '/tuː/', wordB: 'do', ipaB: '/duː/' },
        examples: [
            { word: 'time', ipa: '/taɪm/', meaning: 'Thời gian' },
            { word: 'water', ipa: '/ˈwɔːtə/', meaning: 'Nước' },
            { word: 'cat', ipa: '/kæt/', meaning: 'Con mèo' }
        ]
    },
    'c_k': {
        id: 'c_k',
        char: 'k',
        name: 'Voiceless /k/',
        type: 'Phụ âm vô thanh',
        category: 'voiceless_consonants',
        keyWord: 'key',
        keyWordMeaning: 'Chìa khóa',
        articulation: 'Cuống lưỡi nâng chạm vòm họng mềm, bật hơi mạnh từ sâu trong cổ họng.',
        minimalPair: { wordA: 'came', ipaA: '/keɪm/', wordB: 'game', ipaB: '/ɡeɪm/' },
        examples: [
            { word: 'cat', ipa: '/kæt/', meaning: 'Con mèo' },
            { word: 'book', ipa: '/bʊk/', meaning: 'Quyển sách' },
            { word: 'milk', ipa: '/mɪlk/', meaning: 'Sữa' }
        ]
    },
    'c_f': {
        id: 'c_f',
        char: 'f',
        name: 'Voiceless /f/',
        type: 'Phụ âm vô thanh',
        category: 'voiceless_consonants',
        keyWord: 'fish',
        keyWordMeaning: 'Con cá',
        articulation: 'Răng cửa hàm trên chạm nhẹ vào môi dưới, đẩy luồng hơi ma sát ra ngoài.',
        minimalPair: { wordA: 'fan', ipaA: '/fæn/', wordB: 'van', ipaB: '/væn/' },
        examples: [
            { word: 'fire', ipa: '/ˈfaɪə/', meaning: 'Ngọn lửa' },
            { word: 'coffee', ipa: '/ˈkɒfi/', meaning: 'Cà phê' },
            { word: 'leaf', ipa: '/liːf/', meaning: 'Chiếc lá' }
        ]
    },
    'c_th_unvoiced': {
        id: 'c_th_unvoiced',
        char: 'θ',
        name: 'Voiceless TH /θ/',
        type: 'Phụ âm vô thanh',
        category: 'voiceless_consonants',
        keyWord: 'think',
        keyWordMeaning: 'Suy nghĩ',
        articulation: 'Đặt nhẹ đầu lưỡi ở giữa hai hàm răng, thổi luồng hơi nhẹ nhàng luồn qua khe răng.',
        minimalPair: { wordA: 'thank', ipaA: '/θæŋk/', wordB: 'sank', ipaB: '/sæŋk/' },
        examples: [
            { word: 'three', ipa: '/θriː/', meaning: 'Số 3' },
            { word: 'month', ipa: '/mʌnθ/', meaning: 'Tháng' },
            { word: 'bath', ipa: '/bɑːθ/', meaning: 'Bồn tắm' }
        ]
    },
    'c_s': {
        id: 'c_s',
        char: 's',
        name: 'Voiceless /s/',
        type: 'Phụ âm vô thanh',
        category: 'voiceless_consonants',
        keyWord: 'see',
        keyWordMeaning: 'Nhìn thấy',
        articulation: 'Khép hai hàm răng gần sát nhau, thổi luồng hơi xì qua khe giữa đầu lưỡi và vòm răng.',
        minimalPair: { wordA: 'sip', ipaA: '/sɪp/', wordB: 'zip', ipaB: '/zɪp/' },
        examples: [
            { word: 'sun', ipa: '/sʌn/', meaning: 'Mặt trời' },
            { word: 'bus', ipa: '/bʌs/', meaning: 'Xe buýt' },
            { word: 'sister', ipa: '/ˈsɪstə/', meaning: 'Chị/em gái' }
        ]
    },
    'c_sh': {
        id: 'c_sh',
        char: 'ʃ',
        name: 'Voiceless SH /ʃ/',
        type: 'Phụ âm vô thanh',
        category: 'voiceless_consonants',
        keyWord: 'sheep',
        keyWordMeaning: 'Con cừu',
        articulation: 'Tròn và chu môi nhẹ ra trước, kéo đầu lưỡi thụt nhẹ về sau, thổi luồng khí "suỵt" êm.',
        minimalPair: { wordA: 'shoe', ipaA: '/ʃuː/', wordB: 'sue', ipaB: '/suː/' },
        examples: [
            { word: 'shop', ipa: '/ʃɒp/', meaning: 'Cửa hàng' },
            { word: 'fish', ipa: '/fɪʃ/', meaning: 'Con cá' },
            { word: 'ocean', ipa: '/ˈəʊʃn/', meaning: 'Đại dương' }
        ]
    },
    'c_ch': {
        id: 'c_ch',
        char: 'tʃ',
        name: 'Voiceless CH /tʃ/',
        type: 'Phụ âm vô thanh',
        category: 'voiceless_consonants',
        keyWord: 'cheese',
        keyWordMeaning: 'Phô mai',
        articulation: 'Chu môi nhẹ, đặt lưỡi ở vị trí /t/ rồi bật bung luồng hơi lướt sang /ʃ/ dứt khoát.',
        minimalPair: { wordA: 'cheap', ipaA: '/tʃiːp/', wordB: 'jeep', ipaB: '/dʒiːp/' },
        examples: [
            { word: 'chair', ipa: '/tʃeə/', meaning: 'Cái ghế' },
            { word: 'teacher', ipa: '/ˈtiːtʃə/', meaning: 'Giáo viên' },
            { word: 'match', ipa: '/mætʃ/', meaning: 'Trận đấu' }
        ]
    },

    // ==========================================
    // 4. PHỤ ÂM HỮU THANH (16 VOICED)
    // ==========================================
    'c_b': {
        id: 'c_b',
        char: 'b',
        name: 'Voiced /b/',
        type: 'Phụ âm hữu thanh',
        category: 'voiced_consonants',
        keyWord: 'boat',
        keyWordMeaning: 'Con thuyền',
        articulation: 'Mím hai môi rồi bật ra đồng thời làm rung thanh quản phát âm âm /b/.',
        minimalPair: { wordA: 'bin', ipaA: '/bɪn/', wordB: 'pin', ipaB: '/pɪn/' },
        examples: [
            { word: 'book', ipa: '/bʊk/', meaning: 'Sách' },
            { word: 'baby', ipa: '/ˈbeɪbi/', meaning: 'Em bé' },
            { word: 'club', ipa: '/klʌb/', meaning: 'Câu lạc bộ' }
        ]
    },
    'c_d': {
        id: 'c_d',
        char: 'd',
        name: 'Voiced /d/',
        type: 'Phụ âm hữu thanh',
        category: 'voiced_consonants',
        keyWord: 'door',
        keyWordMeaning: 'Cửa ra vào',
        articulation: 'Đầu lưỡi chạm chân răng trên rồi bật xuống làm rung mạnh thanh quản.',
        minimalPair: { wordA: 'down', ipaA: '/daʊn/', wordB: 'town', ipaB: '/taʊn/' },
        examples: [
            { word: 'day', ipa: '/deɪ/', meaning: 'Ngày' },
            { word: 'dog', ipa: '/dɒɡ/', meaning: 'Con chó' },
            { word: 'red', ipa: '/red/', meaning: 'Màu đỏ' }
        ]
    },
    'c_g': {
        id: 'c_g',
        char: 'ɡ',
        name: 'Voiced /ɡ/',
        type: 'Phụ âm hữu thanh',
        category: 'voiced_consonants',
        keyWord: 'girl',
        keyWordMeaning: 'Cô bé',
        articulation: 'Cuống lưỡi nâng chạm vòm họng trên rồi hạ xuống làm rung thanh quản phát âm /g/.',
        minimalPair: { wordA: 'goat', ipaA: '/ɡəʊt/', wordB: 'coat', ipaB: '/kəʊt/' },
        examples: [
            { word: 'good', ipa: '/ɡʊd/', meaning: 'Tốt' },
            { word: 'big', ipa: '/bɪɡ/', meaning: 'To lớn' },
            { word: 'egg', ipa: '/eɡ/', meaning: 'Quả trứng' }
        ]
    },
    'c_v': {
        id: 'c_v',
        char: 'v',
        name: 'Voiced /v/',
        type: 'Phụ âm hữu thanh',
        category: 'voiced_consonants',
        keyWord: 'van',
        keyWordMeaning: 'Xe tải nhỏ',
        articulation: 'Răng cửa trên chạm nhẹ môi dưới, đẩy hơi đồng thời làm rung mạnh thanh quản.',
        minimalPair: { wordA: 'van', ipaA: '/væn/', wordB: 'fan', ipaB: '/fæn/' },
        examples: [
            { word: 'voice', ipa: '/vɔɪs/', meaning: 'Giọng nói' },
            { word: 'seven', ipa: '/ˈsevn/', meaning: 'Số 7' },
            { word: 'live', ipa: '/lɪv/', meaning: 'Sinh sống' }
        ]
    },
    'c_th_voiced': {
        id: 'c_th_voiced',
        char: 'ð',
        name: 'Voiced TH /ð/',
        type: 'Phụ âm hữu thanh',
        category: 'voiced_consonants',
        keyWord: 'this',
        keyWordMeaning: 'Cái này',
        articulation: 'Đầu lưỡi đặt giữa 2 hàm răng, đẩy luồng hơi đồng thời làm rung mạnh thanh quản.',
        minimalPair: { wordA: 'then', ipaA: '/ðen/', wordB: 'den', ipaB: '/den/' },
        examples: [
            { word: 'mother', ipa: '/ˈmʌðə/', meaning: 'Mẹ' },
            { word: 'weather', ipa: '/ˈweðə/', meaning: 'Thời tiết' },
            { word: 'with', ipa: '/wɪð/', meaning: 'Cùng với' }
        ]
    },
    'c_z': {
        id: 'c_z',
        char: 'z',
        name: 'Voiced /z/',
        type: 'Phụ âm hữu thanh',
        category: 'voiced_consonants',
        keyWord: 'zoo',
        keyWordMeaning: 'Sở thú',
        articulation: 'Răng khép gần sát, thổi luồng hơi xì đồng thời làm rung thanh quản (như tiếng ong vo ve).',
        minimalPair: { wordA: 'zoo', ipaA: '/zuː/', wordB: 'sue', ipaB: '/suː/' },
        examples: [
            { word: 'zero', ipa: '/ˈzɪərəʊ/', meaning: 'Số 0' },
            { word: 'music', ipa: '/ˈmjuːzɪk/', meaning: 'Âm nhạc' },
            { word: 'nose', ipa: '/nəʊz/', meaning: 'Cái mũi' }
        ]
    },
    'c_zh': {
        id: 'c_zh',
        char: 'ʒ',
        name: 'Voiced ZH /ʒ/',
        type: 'Phụ âm hữu thanh',
        category: 'voiced_consonants',
        keyWord: 'vision',
        keyWordMeaning: 'Tầm nhìn',
        articulation: 'Khẩu hình như âm /ʃ/ (chu môi) nhưng phát ra âm rung thanh quản mạnh.',
        minimalPair: { wordA: 'measure', ipaA: '/ˈmeʒə/', wordB: 'mesher', ipaB: '/ˈmeʃə/' },
        examples: [
            { word: 'casual', ipa: '/ˈkæʒuəl/', meaning: 'Bình thường' },
            { word: 'pleasure', ipa: '/ˈpleʒə/', meaning: 'Niềm vinh hạnh' },
            { word: 'garage', ipa: '/ˈɡærɑːʒ/', meaning: 'Ga-ra để xe' }
        ]
    },
    'c_j': {
        id: 'c_j',
        char: 'dʒ',
        name: 'Voiced J /dʒ/',
        type: 'Phụ âm hữu thanh',
        category: 'voiced_consonants',
        keyWord: 'jump',
        keyWordMeaning: 'Nhảy lên',
        articulation: 'Khẩu hình như /tʃ/ nhưng bật âm làm rung thanh quản dứt khoát.',
        minimalPair: { wordA: 'joke', ipaA: '/dʒəʊk/', wordB: 'choke', ipaB: '/tʃəʊk/' },
        examples: [
            { word: 'juice', ipa: '/dʒuːs/', meaning: 'Nước ép' },
            { word: 'age', ipa: '/eɪdʒ/', meaning: 'Tuổi tác' },
            { word: 'bridge', ipa: '/brɪdʒ/', meaning: 'Cây cầu' }
        ]
    },
    'c_m': {
        id: 'c_m',
        char: 'm',
        name: 'Nasal /m/',
        type: 'Phụ âm mũi hữu thanh',
        category: 'voiced_consonants',
        keyWord: 'man',
        keyWordMeaning: 'Người đàn ông',
        articulation: 'Mím kín hai môi, đẩy luồng âm thanh rung vang qua khoang mũi.',
        minimalPair: { wordA: 'map', ipaA: '/mæp/', wordB: 'nap', ipaB: '/næp/' },
        examples: [
            { word: 'moon', ipa: '/muːn/', meaning: 'Mặt trăng' },
            { word: 'name', ipa: '/neɪm/', meaning: 'Tên' },
            { word: 'summer', ipa: '/ˈsʌmə/', meaning: 'Mùa hè' }
        ]
    },
    'c_n': {
        id: 'c_n',
        char: 'n',
        name: 'Nasal /n/',
        type: 'Phụ âm mũi hữu thanh',
        category: 'voiced_consonants',
        keyWord: 'now',
        keyWordMeaning: 'Bây giờ',
        articulation: 'Đầu lưỡi chạm nướu răng trên chặn luồng khí, đẩy âm thanh qua khoang mũi.',
        minimalPair: { wordA: 'night', ipaA: '/naɪt/', wordB: 'light', ipaB: '/laɪt/' },
        examples: [
            { word: 'sun', ipa: '/sʌn/', meaning: 'Mặt trời' },
            { word: 'nice', ipa: '/naɪs/', meaning: 'Đẹp / Tốt bụng' },
            { word: 'rain', ipa: '/reɪn/', meaning: 'Mưa' }
        ]
    },
    'c_ng': {
        id: 'c_ng',
        char: 'ŋ',
        name: 'Velar Nasal /ŋ/',
        type: 'Phụ âm mũi hữu thanh',
        category: 'voiced_consonants',
        keyWord: 'sing',
        keyWordMeaning: 'Ca hát',
        articulation: 'Cuống lưỡi chạm vòm họng mềm chặn luồng hơi, đẩy âm thanh rung qua khoang mũi.',
        minimalPair: { wordA: 'sing', ipaA: '/sɪŋ/', wordB: 'sin', ipaB: '/sɪn/' },
        examples: [
            { word: 'ring', ipa: '/rɪŋ/', meaning: 'Chiếc nhẫn' },
            { word: 'long', ipa: '/lɒŋ/', meaning: 'Dài' },
            { word: 'English', ipa: '/ˈɪŋɡlɪʃ/', meaning: 'Tiếng Anh' }
        ]
    },
    'c_h': {
        id: 'c_h',
        char: 'h',
        name: 'Glottal /h/',
        type: 'Phụ âm thanh hầu',
        category: 'voiced_consonants',
        keyWord: 'hat',
        keyWordMeaning: 'Cái mũ',
        articulation: 'Mở miệng tự nhiên, thở nhẹ luồng khí êm từ cuống họng ra ngoài.',
        minimalPair: { wordA: 'heart', ipaA: '/hɑːt/', wordB: 'art', ipaB: '/ɑːt/' },
        examples: [
            { word: 'hot', ipa: '/hɒt/', meaning: 'Nóng' },
            { word: 'house', ipa: '/haʊs/', meaning: 'Nhà' },
            { word: 'happy', ipa: '/ˈhæpi/', meaning: 'Hạnh phúc' }
        ]
    },
    'c_l': {
        id: 'c_l',
        char: 'l',
        name: 'Lateral /l/',
        type: 'Phụ âm bên hữu thanh',
        category: 'voiced_consonants',
        keyWord: 'leg',
        keyWordMeaning: 'Cái chân',
        articulation: 'Đầu lưỡi chạm nướu răng cửa trên, luồng khí thoát ra hai bên mép lưỡi.',
        minimalPair: { wordA: 'light', ipaA: '/laɪt/', wordB: 'right', ipaB: '/raɪt/' },
        examples: [
            { word: 'love', ipa: '/lʌv/', meaning: 'Yêu thương' },
            { word: 'ball', ipa: '/bɔːl/', meaning: 'Quả bóng' },
            { word: 'yellow', ipa: '/ˈjeləʊ/', meaning: 'Màu vàng' }
        ]
    },
    'c_r': {
        id: 'c_r',
        char: 'r',
        name: 'Approximant /r/',
        type: 'Phụ âm tiếp cận hữu thanh',
        category: 'voiced_consonants',
        keyWord: 'red',
        keyWordMeaning: 'Màu đỏ',
        articulation: 'Uốn cong nhẹ đầu lưỡi về phía vòm họng trên (không để chạm vào vòm), môi hơi tròn nhẹ.',
        minimalPair: { wordA: 'red', ipaA: '/red/', wordB: 'led', ipaB: '/led/' },
        examples: [
            { word: 'rain', ipa: '/reɪn/', meaning: 'Mưa' },
            { word: 'room', ipa: '/ruːm/', meaning: 'Căn phòng' },
            { word: 'green', ipa: '/ɡriːn/', meaning: 'Màu xanh lá' }
        ]
    },
    'c_w': {
        id: 'c_w',
        char: 'w',
        name: 'Glide /w/',
        type: 'Bán nguyên âm hữu thanh',
        category: 'voiced_consonants',
        keyWord: 'wet',
        keyWordMeaning: 'Ẩm ướt',
        articulation: 'Chu tròn môi như chuẩn bị phát âm /uː/, sau đó mở rộng nhanh sang nguyên âm kế tiếp.',
        minimalPair: { wordA: 'wet', ipaA: '/wet/', wordB: 'vet', ipaB: '/vet/' },
        examples: [
            { word: 'water', ipa: '/ˈwɔːtə/', meaning: 'Nước' },
            { word: 'win', ipa: '/wɪn/', meaning: 'Chiến thắng' },
            { word: 'sweet', ipa: '/swiːt/', meaning: 'Ngọt ngào' }
        ]
    },
    'c_y': {
        id: 'c_y',
        char: 'j',
        name: 'Palatal /j/',
        type: 'Bán nguyên âm hữu thanh',
        category: 'voiced_consonants',
        keyWord: 'yes',
        keyWordMeaning: 'Vâng / Đồng ý',
        articulation: 'Nâng thân lưỡi sát vòm họng cứng như âm /iː/, rồi lướt nhanh sang nguyên âm sau.',
        minimalPair: { wordA: 'year', ipaA: '/jɪə/', wordB: 'ear', ipaB: '/ɪə/' },
        examples: [
            { word: 'yellow', ipa: '/ˈjeləʊ/', meaning: 'Màu vàng' },
            { word: 'you', ipa: '/juː/', meaning: 'Bạn' },
            { word: 'young', ipa: '/jʌŋ/', meaning: 'Trẻ trung' }
        ]
    }
};

/**
 * Lấy danh sách ký tự IPA theo phân loại
 */
export const getIpaList = (categoryId = 'monophthongs') => {
    return Object.values(IPA_DICTIONARY).filter(item => {
        if (!categoryId || categoryId === 'all') return true;
        return item.category === categoryId;
    });
};
