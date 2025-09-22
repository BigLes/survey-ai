// prisma/seed.mjs
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// утиліти
const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rnd(0, arr.length - 1)];
const pickMany = (arr, k) => {
    const copy = [...arr];
    const out = [];
    for (let i = 0; i < k && copy.length; i++) {
        const ix = rnd(0, copy.length - 1);
        out.push(copy[ix]);
        copy.splice(ix, 1);
    }
    return out;
};

// банки фраз (UA + трохи EN)
const likes = [
    'Подобається гнучкий графік', 'Люблю працювати з дому', 'Подобається жива комунікація в офісі',
    'Ціную тишу і фокус', 'Подобається швидкий інтернет', 'Комфортно з інструментами Google',
    'Подобається Telegram для комунікації', 'Нравится Slack (звичка з попередньої роботи)',
    'I like to keep things async', 'Enjoy data-driven decisions', 'Люблю чіткі дедлайни без мікроменеджменту'
];

const improvements = [
    'Хотілося б менше мітингів', 'Бракує структурованої документації', 'Потрібен краще налаштований трекер задач',
    'Покращити процес онбордингу', 'Хочеться прозоріші пріоритети', 'Додати навчальні сесії з AI-інструментів',
    'Streamline code review process', 'Більше автономії у прийнятті рішень', 'Краще планування спринтів'
];

const aiUseCases = [
    'Пишу чернетки листів', 'Генерую тест-кейси', 'Роблю резюме зустрічей', 'Питаю довідкову інфу',
    'Drafting blog posts', 'Refactoring snippets', 'Brainstorming ideas', 'Пояснення складних тем простими словами'
];

const hobbies = ['туризм', 'велосипед', 'настільні ігри', 'біг', 'кулінарія', 'фотографія', 'йога', 'плавання', 'авто', 'садівництво'];

const comms = ['Telegram', 'Viber', 'WhatsApp', 'Slack', 'Email'];

const devices = ['Смартфон', 'Ноутбук', 'Планшет', 'Стаціонарний ПК', 'Смарт-годинник'];

const cities = ['Київ', 'Львів', 'Одеса', 'Харків', 'Дніпро', 'Івано-Франківськ', 'Тернопіль', 'Варшава', 'Краків'];

async function main() {
    // 1) Автор
    const owner = await prisma.user.upsert({
        where: { email: 'owner@example.com' },
        update: {},
        create: { email: 'owner@example.com', name: 'Owner' },
    });

    // 2) Нове опитування: Lifestyle & Tech Habits 2025
    const survey = await prisma.survey.create({
        data: {
            title: 'Lifestyle & Tech Habits 2025',
            description: 'Анонімне опитування про повсякденні звички, інструменти та ставлення до AI.',
            ownerId: owner.id,
            status: 'PUBLISHED',
            questions: {
                create: [
                    // 0
                    { text: 'У якому місті ви переважно живете?', type: 'SHORT_TEXT', order: 0 },
                    // 1
                    { text: 'Які пристрої ви використовуєте щодня? (оберіть кілька)', type: 'MULTI_CHOICE', options: { options: devices }, order: 1 },
                    // 2
                    { text: 'Скільки годин екранного часу у вас за день?', type: 'SINGLE_CHOICE', options: { options: ['<2 год', '2–4 год', '4–6 год', '6–8 год', '8+ год'] }, order: 2 },
                    // 3
                    { text: 'Улюблені канали комунікації', type: 'MULTI_CHOICE', options: { options: comms }, order: 3 },
                    // 4
                    { text: 'Як часто ви використовуєте AI-інструменти у щоденній роботі?', type: 'LINEAR_SCALE', options: { min: 1, max: 5, labels: {1:'ніколи',5:'постійно'} }, order: 4 },
                    // 5
                    { text: 'Для чого саме ви використовуєте AI? (вільна відповідь)', type: 'LONG_TEXT', order: 5 },
                    // 6
                    { text: 'Який формат роботи більше підходить?', type: 'SINGLE_CHOICE', options: { options: ['Офіс', 'Віддалено', 'Гібридно'] }, order: 6 },
                    // 7
                    { text: 'Ваші хобі/активності', type: 'SHORT_TEXT', order: 7 },
                    // 8
                    { text: 'Що вам подобається в теперішній організації/команді?', type: 'LONG_TEXT', order: 8 },
                    // 9
                    { text: 'Що варто покращити найближчим часом?', type: 'LONG_TEXT', order: 9 },
                ],
            },
        },
        include: { questions: true },
    });

    // 3) Згенеруємо ~80 відповідей
    const q = survey.questions.sort((a, b) => a.order - b.order);

    const responses = [];
    const N = 80;

    for (let i = 0; i < N; i++) {
        const city = pick(cities);
        const dailyDevices = pickMany(devices, rnd(1, Math.min(3, devices.length)));
        const screen = pick(['<2 год', '2–4 год', '4–6 год', '6–8 год', '8+ год']);
        const comm = pickMany(comms, rnd(1, 3));
        const aiScale = rnd(1, 5);
        const aiFree = pickMany(aiUseCases, rnd(1, 3)).join('; ') + (Math.random() < 0.3 ? '. Also use it for quick summaries.' : '');
        const workMode = pick(['Офіс', 'Віддалено', 'Гібридно']);
        const hobbyText = pickMany(hobbies, rnd(1, 3)).join(', ');
        const likeText = pickMany(likes, rnd(1, 3)).join('. ') + '.';
        const improveText = pickMany(improvements, rnd(1, 2)).join('. ') + '.';

        responses.push({
            surveyId: survey.id,
            answers: {
                create: [
                    // 0 SHORT_TEXT
                    { questionId: q[0].id, valueText: city },
                    // 1 MULTI_CHOICE
                    { questionId: q[1].id, valueJson: { selected: dailyDevices } },
                    // 2 SINGLE_CHOICE
                    { questionId: q[2].id, valueJson: { selected: screen } },
                    // 3 MULTI_CHOICE
                    { questionId: q[3].id, valueJson: { selected: comm } },
                    // 4 LINEAR_SCALE
                    { questionId: q[4].id, valueJson: { scale: aiScale } },
                    // 5 LONG_TEXT
                    { questionId: q[5].id, valueText: aiFree },
                    // 6 SINGLE_CHOICE
                    { questionId: q[6].id, valueJson: { selected: workMode } },
                    // 7 SHORT_TEXT
                    { questionId: q[7].id, valueText: hobbyText },
                    // 8 LONG_TEXT
                    { questionId: q[8].id, valueText: likeText },
                    // 9 LONG_TEXT
                    { questionId: q[9].id, valueText: improveText },
                ],
            },
            meta: { ua: true, seedBatch: 'lifestyle-2025' },
        });
    }

    // батчом створюємо (менші транзакції для стабільності)
    const chunkSize = 20;
    for (let i = 0; i < responses.length; i += chunkSize) {
        const chunk = responses.slice(i, i + chunkSize);
        await prisma.$transaction(
            chunk.map((r) => prisma.response.create({ data: r }))
        );
    }

    console.log('Seed done.');
    console.log('New survey title: Lifestyle & Tech Habits 2025');
    console.log('Survey ID:', survey.id);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
