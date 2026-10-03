import fs from 'fs';
import path from 'path';

// All cheat sheets mapping with their UI chunk, translation chunk, icon, and category
const CHEAT_SHEETS_CONFIG = [
    {
        id: 'keigo',
        title: 'Kính ngữ toàn tập (Keigo)',
        titleJp: '敬語',
        level: 'N4-N2',
        category: 'Giao tiếp & Công sở',
        icon: '👑',
        badge: 'Bắt buộc khi đi làm',
        summary: '3 tầng kính ngữ (Sonkeigo / Kenjougo / Teineigo), 12 động từ biến đổi đặc biệt, 5 mẫu N2 công sở và các lỗi nhầm lẫn tai hại.',
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
        jsFile: 'GivingReceivingSheet-B_pN6Qu9.js',
        viFile: 'sheetGivingReceiving-DaVoxfh9.js'
    },
    {
        id: 'conditionals',
        title: 'Bộ 4 Câu điều kiện (Conditionals)',
        titleJp: '条件表現',
        level: 'N4-N3',
        category: 'Ngữ pháp Cốt lõi',
        icon: '🌿',
        badge: 'To / Ba / Tara / Nara',
        summary: 'Ma trận đối chiếu 4 mẫu câu điều kiện: Điều kiện tự nhiên, giả định phi thực tế, lời khuyên, và thói quen hàng ngày.',
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
        jsFile: 'VerbGroupsSheet-CZT2sdzN.js',
        viFile: 'sheetVerbGroups-alz6bDXm.js'
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
        jsFile: 'AddressSheet-N7q4z7aP.js',
        viFile: 'sheetAddress-2ZDnAejH.js'
    }
];

async function fetchAsset(fileName) {
    const res = await fetch(`https://openjlpt.com/assets/${fileName}`);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${fileName}`);
    return await res.text();
}

// Simple cleaner to parse exported JS variable
function parseJsExport(jsText) {
    // Look for `var n={...}` or `const data={...}` or `JSON.parse('...')`
    const jsonMatch = jsText.match(/JSON\.parse\('([^']+)'\)/);
    if (jsonMatch) {
        try {
            return JSON.parse(jsonMatch[1].replace(/\\'/g, "'").replace(/\\\\/g, "\\"));
        } catch (e) {}
    }

    // Try finding the main object
    const startObj = jsText.indexOf('{');
    const endObj = jsText.lastIndexOf('}');
    if (startObj !== -1 && endObj !== -1 && endObj > startObj) {
        const objStr = jsText.slice(startObj, endObj + 1);
        try {
            return (new Function(`return (${objStr});`))();
        } catch (e) {}
    }
    return null;
}

async function compileAllSheets() {
    console.log('=== COMPILING ALL CHEAT SHEETS ===\n');

    const compiledSheets = [];

    for (const sheet of CHEAT_SHEETS_CONFIG) {
        console.log(`Processing: [${sheet.id}] ${sheet.title}...`);
        try {
            const viContent = await fetchAsset(sheet.viFile);
            const jsContent = await fetchAsset(sheet.jsFile);

            // Parse translation
            const viData = parseJsExport(viContent) || {};
            
            // Extract raw data from JS
            compiledSheets.push({
                ...sheet,
                viData: viData,
                rawJsSnippet: jsContent.slice(0, 5000) // keep reference
            });
            console.log(`-> Success: [${sheet.id}] (${Object.keys(viData).length} translation keys)`);
        } catch (err) {
            console.warn(`-> Error fetching [${sheet.id}]:`, err.message);
            compiledSheets.push({
                ...sheet,
                viData: {}
            });
        }
    }

    const outputPath = path.resolve('public/data/grammar_cheatsheets.json');
    fs.writeFileSync(outputPath, JSON.stringify(compiledSheets, null, 2), 'utf8');
    console.log(`\n-> Successfully saved ${compiledSheets.length} cheat sheets to ${outputPath} (${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB)`);
}

compileAllSheets().catch(console.error);
