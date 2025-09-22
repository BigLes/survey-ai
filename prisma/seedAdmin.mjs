import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = process.env.SEED_ADMIN_EMAIL || 'owner@example.com';
    const password = process.env.SEED_ADMIN_PASSWORD || 'root123';
    const role = process.env.SEED_ADMIN_ROLE || 'ADMIN';

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
        where: { email },
        update: { passwordHash, role },
        create: { email, passwordHash, role, name: 'Owner' },
    });

    console.log('Admin ready:', { email: user.email, role: user.role });
}

main().catch(console.error).finally(()=>prisma.$disconnect());
