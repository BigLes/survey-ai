import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import readline from 'readline';

const prisma = new PrismaClient();

function parseArgs() {
    const args = {};
    for (let i = 2; i < process.argv.length; i++) {
        const a = process.argv[i];
        if (a.startsWith('--')) {
            const key = a.replace(/^--/, '');
            const val = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : 'true';
            args[key] = val;
        }
    }
    return args;
}

async function ask(question, mask = false) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: mask ? undefined : process.stdout,
    });

    if (!mask) {
        const ans = await new Promise((res) => rl.question(question, res));
        rl.close();
        return ans;
    }

    process.stdout.write(question);
    return await new Promise((resolve) => {
        const stdin = process.stdin;
        stdin.setRawMode?.(true);
        let value = '';
        function onData(ch) {
            const char = String(ch);
            if (char === '\u0004' || char === '\r' || char === '\n') {
                stdin.removeListener('data', onData);
                stdin.setRawMode?.(false);
                process.stdout.write('\n');
                rl.close();
                resolve(value);
            } else if (char === '\u0003') {
                stdin.removeListener('data', onData);
                stdin.setRawMode?.(false);
                rl.close();
                process.exit(1);
            } else if (char === '\u007f') {
                value = value.slice(0, -1);
            } else {
                value += char;
            }
        }
        stdin.on('data', onData);
    });
}

async function main() {
    try {
        const args = parseArgs();
        const email = args.email || process.env.SEED_ADMIN_EMAIL || await ask('Email: ');
        let password = args.password || process.env.SEED_ADMIN_PASSWORD;
        const role = (args.role || process.env.SEED_ADMIN_ROLE || 'ADMIN').toUpperCase();

        if (!password) {
            password = await ask('Пароль (введете, буде приховано): ', true);
        }

        if (!email || !password) {
            console.error('Email і пароль обовʼязкові. Спробуйте з --email --password або SEED_ADMIN_* env.');
            process.exit(2);
        }

        if (!['ADMIN','EDITOR','VIEWER'].includes(role)) {
            console.error('Невірна роль. Допустимі значення: ADMIN, EDITOR, VIEWER');
            process.exit(2);
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const up = await prisma.user.upsert({
            where: { email },
            update: { passwordHash, role },
            create: { email, passwordHash, role, name: null },
        });

        console.log(`Готово — користувач ${up.email} (role=${up.role}) створений/оновлений. id=${up.id}`);
    } catch (err) {
        console.error('Помилка:', err);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
