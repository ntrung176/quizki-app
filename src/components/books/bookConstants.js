export const ENGLISH_SAMPLE_BOOK_GROUPS = [
    {
        id: 'oxford_3000',
        targetLanguage: 'en',
        name: '📘 Oxford 3000 Core Vocabulary',
        subtitle: '3000 từ vựng tiếng Anh giao tiếp thông dụng nhất theo chuẩn Oxford',
        color: '#3B82F6',
        books: [
            {
                id: 'oxford_a1_a2',
                name: 'Oxford A1 - A2 (Sơ cấp & Trung cấp)',
                chapters: [
                    {
                        id: 'oxford_ch1',
                        name: 'Bài 1: Giao tiếp & Cuộc sống hàng ngày',
                        lessons: [
                            {
                                id: 'oxford_l1',
                                name: 'Chủ đề: Hello & Daily Greetings',
                                vocabularies: [
                                    { id: 'en_ox_1', front: 'ability', back: 'khả năng, năng lực', ipa: '/əˈbɪləti/', pos: 'noun', example: 'She has the ability to pass the exam.' },
                                    { id: 'en_ox_2', front: 'abroad', back: 'ở nước ngoài', ipa: '/əˈbrɔːd/', pos: 'adverb', example: 'He is studying abroad in London.' },
                                    { id: 'en_ox_3', front: 'absolute', back: 'tuyệt đối, hoàn toàn', ipa: '/ˈæbsəluːt/', pos: 'adjective', example: 'There is absolute silence in the library.' },
                                    { id: 'en_ox_4', front: 'accept', back: 'chấp nhận, đồng ý', ipa: '/əkˈsept/', pos: 'verb', example: 'They accepted our offer.' },
                                    { id: 'en_ox_5', front: 'achieve', back: 'đạt được, hoàn thành', ipa: '/əˈtʃiːv/', pos: 'verb', example: 'She achieved her goal.' }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        id: 'ielts_master',
        targetLanguage: 'en',
        name: '🎓 IELTS Master Vocabulary (Band 6.5 - 8.0)',
        subtitle: 'Bộ từ vựng ăn điểm cho 4 kỹ năng Listening, Reading, Writing, Speaking',
        color: '#8B5CF6',
        books: [
            {
                id: 'ielts_academic',
                name: 'IELTS Academic & Topic Vocabulary',
                chapters: [
                    {
                        id: 'ielts_ch1',
                        name: 'Topic: Environment & Climate Change',
                        lessons: [
                            {
                                id: 'ielts_l1',
                                name: 'Lesson 1: Biodiversity & Preservation',
                                vocabularies: [
                                    { id: 'en_ie_1', front: 'biodiversity', back: 'đa dạng sinh học', ipa: '/ˌbaɪəʊdaɪˈvɜːsəti/', pos: 'noun', example: 'Rainforests are rich in biodiversity.' },
                                    { id: 'en_ie_2', front: 'catastrophic', back: 'thảm khốc, gây thiệt hại nặng', ipa: '/ˌkætəˈstrɒfɪk/', pos: 'adj', example: 'The flood had catastrophic effects.' },
                                    { id: 'en_ie_3', front: 'sustainable', back: 'bền vững, thân thiện môi trường', ipa: '/səˈsteɪnəbl/', pos: 'adj', example: 'We need sustainable energy sources.' },
                                    { id: 'en_ie_4', front: 'deforestation', back: 'nạn phá rừng', ipa: '/ˌdiːˌfɒrɪˈsteɪʃn/', pos: 'noun', example: 'Deforestation is harming wild habitats.' }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        id: 'toeic_600',
        targetLanguage: 'en',
        name: '💼 TOEIC 600 Essential Words',
        subtitle: '600 từ vựng thiết yếu luyện thi TOEIC & môi trường công sở quốc tế',
        color: '#F59E0B',
        books: [
            {
                id: 'toeic_office',
                name: 'TOEIC Business & Workplace',
                chapters: [
                    {
                        id: 'toeic_ch1',
                        name: 'Contract & Negotiation',
                        lessons: [
                            {
                                id: 'toeic_l1',
                                name: 'Lesson 1: Signing Contracts',
                                vocabularies: [
                                    { id: 'en_to_1', front: 'agreement', back: 'hợp đồng, thỏa thuận', ipa: '/əˈɡriːmənt/', pos: 'noun', example: 'Both parties signed the agreement.' },
                                    { id: 'en_to_2', front: 'obligation', back: 'nghĩa vụ, trách nhiệm', ipa: '/ˌɒblɪˈɡeɪʃn/', pos: 'noun', example: 'You have a legal obligation.' },
                                    { id: 'en_to_3', front: 'negotiate', back: 'đàm phán, thương lượng', ipa: '/nɪˈɡəʊʃieɪt/', pos: 'verb', example: 'We negotiated the contract terms.' }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    }
];

export const getGroupCategory = (group) => {
    const name = (group.name || '').toLowerCase();
    const subtitle = (group.subtitle || '').toLowerCase();
    if (name.includes('mimikara') || name.includes('jlpt') || subtitle.includes('jlpt') || name.includes('tango')) {
        return 'JLPT';
    }
    if (name.includes('daichi') || name.includes('irodori') || name.includes('minna') || name.includes('sách')) {
        return 'TEXTBOOK';
    }
    return 'CUSTOM';
};
