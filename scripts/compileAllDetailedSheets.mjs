import fs from 'fs';
import path from 'path';

// Let's define the comprehensive mapping of all 36 OpenJLPT Cheat Sheets
const ALL_SHEETS = [
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
        jsFile: 'KeigoSheet-B6UJWnHn.js',
        viFile: 'sheetKeigo-C0AbBK7M.js'
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
        jsFile: 'particle-page-data-DuhrfwQ2.js',
        viFile: 'sheetParticle-BZnDYjsf.js'
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
        jsFile: 'GivingReceivingSheet-B_pN6Qu9.js',
        viFile: 'sheetGivingReceiving-DaVoxfh9.js'
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
        jsFile: 'ConditionalSheet-Ecru67i-.js',
        viFile: 'sheetConditional-DKueABLi.js'
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
        jsFile: 'PassiveCausativeSheet-DuP-EBsq.js',
        viFile: 'sheetPassiveCausative-7YdLYNHA.js'
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
        jsFile: 'TransitivitySheet-D0yjIadI.js',
        viFile: 'sheetTransitivity-cGLVsrfy.js'
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
        jsFile: 'VerbGroupsSheet-CZT2sdzN.js',
        viFile: 'sheetVerbGroups-alz6bDXm.js'
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
        jsFile: 'TeFormDeepDive-UD3y_Qar.js',
        viFile: 'sheetTeForm-CM9fhmjm.js'
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
        jsFile: 'InferenceSheet-C9GObM5P.js',
        viFile: 'sheetInference-StEWiJki.js'
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
        jsFile: 'NominalizerSheet-Dx9CvFJa.js',
        viFile: 'sheetNominalizer-CIXzS7iZ.js'
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
        jsFile: 'LimitationSheet-BxODIRaQ.js',
        viFile: 'sheetLimitation-wW36oXJv.js'
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
        jsFile: 'ReasonSheet-DLJDiNZy.js',
        viFile: 'sheetReason-TUvSBRTl.js'
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
        jsFile: 'TimeExpressionsSheet-B3stVnGz.js',
        viFile: 'sheetTimeExpressions-DjazmkPv.js'
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
        jsFile: 'WrittenStyleSheet-HhsLJUIB.js',
        viFile: 'sheetWrittenStyle-C9fUCHKq.js'
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
        jsFile: 'GreetingSheet-Bx4G6EJU.js',
        viFile: 'sheetGreeting-63y3CqpK.js'
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
        jsFile: 'SynonymSheet-BY0KhDaQ.js',
        viFile: 'sheetSynonym-Cm_Ys3W2.js'
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
        jsFile: 'AddressSheet-N7q4z7aP.js',
        viFile: 'sheetAddress-2ZDnAejH.js'
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
        jsFile: 'ComparisonSheet-oVPkPLd-.js',
        viFile: 'sheetComparison-BeTdNTyT.js'
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
        jsFile: 'ConjunctionSheet-DCjpx-5u.js',
        viFile: 'sheetConjunction-CaoqgUoy.js'
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
        jsFile: 'VolitionImperativeSheet-CjuvxG9N.js',
        viFile: 'sheetVolitionImperative-C3p3PvN3.js'
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
        jsFile: 'ChangeSheet-7mcPkx-Y.js',
        viFile: 'sheetChange-Yug0Xul2.js'
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
        jsFile: 'EmphasisSheet-DOHOF_qY.js',
        viFile: 'sheetEmphasis-COH-7OwQ.js'
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
        jsFile: 'AdversativeSheet-ImxRTwMF.js',
        viFile: 'sheetAdversative-euvR3ynP.js'
    },
    {
        id: 'adverb-pairing',
        title: 'Phó từ hô ứng (Adverb Pairing)',
        titleJp: '呼応の副詞',
        level: 'N3-N2',
        category: 'Từ vựng & Ngữ dụng',
        icon: '🎯',
        badge: 'Cặp phó từ + Đuôi câu',
        summary: 'Các cặp bất di bất dịch: まるで 〜 ようだ, 決して 〜 ない, まさか 〜 とは思わなかった, どうしても 〜 できない, もしも 〜 なら.',
        hanko: '副詞',
        jsFile: 'AdverbPairingSheet-D0Qb15oU.js',
        viFile: 'sheetAdverbPairing-D8qb3ulh.js'
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
        jsFile: 'AdvancedConnectionSheet-Dpr2cDQi.js',
        viFile: 'sheetAdvancedConnection-DzWUAZI9.js'
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
        jsFile: 'OnomatopoeiaSheet-Be8-6NaJ.js',
        viFile: 'sheetOnomatopoeia-Bedy6OgT.js'
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
        jsFile: 'SentenceFinalSheet-DYW5DIcd.js',
        viFile: 'sheetSentenceFinal-Cr22ZOrr.js'
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
        jsFile: 'PronunciationSheet-DZLJoea6.js',
        viFile: 'sheetPronunciation-DnrhIDpD.js'
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
        jsFile: 'KatakanaSheet-DobBJgNc.js',
        viFile: 'sheetKatakana-B9aS5-0p.js'
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
        jsFile: 'CounterSheet-HeZZejAP.js',
        viFile: 'sheetCounter-DNcSOdEv.js'
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
        jsFile: 'QuestionWordSheet-WPWGSV8v.js',
        viFile: 'sheetQuestionWord-MR9ZA9Y0.js'
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
        jsFile: 'DemonstrativeSheet-BxpG6NhJ.js',
        viFile: 'sheetDemonstrative-DU-t5k2B.js'
    }
];

async function fetchAsset(fileName) {
    const res = await fetch(`https://openjlpt.com/assets/${fileName}`);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${fileName}`);
    return await res.text();
}

function parseJsVariables(text) {
    const cleanJs = text.replace(/export\s*\{[^}]*\};?/g, '');
    try {
        const fn = new Function(`${cleanJs}\n return typeof n !== 'undefined' ? n : (typeof data !== 'undefined' ? data : {});`);
        return fn();
    } catch (e) {
        return {};
    }
}

async function compileAllDetailedSheets() {
    console.log(`=== COMPILING ALL ${ALL_SHEETS.length} DETAILED CHEAT SHEETS ===\n`);

    // Load existing compiled data to preserve rich manual enhancements
    let existingData = [];
    try {
        existingData = JSON.parse(fs.readFileSync('public/data/grammar_cheatsheets.json', 'utf8'));
    } catch (e) {}

    const existingMap = new Map();
    existingData.forEach(s => existingMap.set(s.id, s));

    const finalSheets = [];

    for (const sheet of ALL_SHEETS) {
        console.log(`Processing [${sheet.id}] ${sheet.title}...`);
        const existing = existingMap.get(sheet.id) || {};
        
        let viData = {};
        try {
            const viContent = await fetchAsset(sheet.viFile);
            viData = parseJsVariables(viContent);
        } catch (e) {
            // console.warn(`Could not fetch VI translation for ${sheet.id}:`, e.message);
        }

        // Build rich comprehensive object
        const compiled = {
            ...sheet,
            ...existing,
            title: sheet.title,
            titleJp: sheet.titleJp,
            level: sheet.level,
            category: sheet.category,
            icon: sheet.icon,
            badge: sheet.badge,
            summary: sheet.summary,
            hanko: sheet.hanko,
            viData: viData
        };

        // Ensure rich arrays exist
        if (!compiled.sections || compiled.sections.length === 0) {
            compiled.sections = [];
            if (viData && Object.keys(viData).length > 0) {
                // Construct sections from translation keys
                Object.entries(viData).forEach(([key, val]) => {
                    if (val && typeof val === 'object' && val.title) {
                        compiled.sections.push({
                            title: val.title,
                            description: val.desc || val.note || '',
                            examples: val.ex1 ? [{ ja: val.ex1, vi: val.ex1Vi || val.ex1 }] : []
                        });
                    }
                });
            }
        }

        finalSheets.push(compiled);
        console.log(`-> Success: [${sheet.id}] (${compiled.sections?.length || 0} sections, ${compiled.specialVerbs?.length || compiled.pairs?.length || compiled.matrix?.length || compiled.particlesList?.length || 0} table items)`);
    }

    const outPath = path.resolve('public/data/grammar_cheatsheets.json');
    fs.writeFileSync(outPath, JSON.stringify(finalSheets, null, 2), 'utf8');
    console.log(`\n-> Successfully saved all ${finalSheets.length} detailed cheat sheets to ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
}

compileAllDetailedSheets().catch(console.error);
