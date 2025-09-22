import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // автор
    const user = await prisma.user.upsert({
        where: { email: 'owner@example.com' },
        update: {},
        create: { email: 'owner@example.com', name: 'Owner' },
    });

    // опитування
    const survey = await prisma.survey.create({
        data: {
            title: 'Зворотній звʼязок про курс',
            description: 'Анонімно. Декілька питань.',
            ownerId: user.id,
            status: 'PUBLISHED',
            questions: {
                create: [
                    { text: 'Що сподобалось найбільше?', type: 'LONG_TEXT', order: 0 },
                    { text: 'Що покращити?', type: 'LONG_TEXT', order: 1 },
                    { text: 'Оцініть курс (1-5)', type: 'LINEAR_SCALE', options: { min: 1, max: 5 }, order: 2 },
                ],
            },
        },
        include: { questions: true },
    });

    console.log('Seed done. Survey ID:', survey.id);
}

main().finally(() => prisma.$disconnect());
