const express = require('express');
const readline = require('readline');
const PBot = require('./index');

const app = express();
const PORT = process.env.PORT || 3000;

const MAX_BROWSERS = 20;
const pBots = [];

app.use(express.json());

async function initBots() {
    console.log('Запуск экземпляров p-bot...');
    for (let i = 0; i < MAX_BROWSERS; i++) {
        const bot = new PBot('ХахБот', 'ru');
        await bot.init();
        pBots.push(bot);
        // Очистка текущей строки в консоли
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        const opened = i + 1;
        const left = MAX_BROWSERS - opened;
        process.stdout.write(`Открыто: ${opened} экземпляров. До запуска сервера осталось открыть ${left} экземпляров.`);
    }
    console.log('\nВсе экземпляры p-bot запущены! Запуск сервера...');
}

// Поиск доступного бота
function getAvailableBot() {
    return pBots.find(bot => !bot.isBusy);
}

app.listen(PORT, async () => {
    await initBots();
    console.log(`Server is running on http://localhost:${PORT}`);
});

app.get('/', (req, res) => {
    res.send("I'm alive");
});

app.post('/ask', async (req, res) => {
    const { text } = req.body;
    if (!text) {
        return res.status(400).send('Сообщение пустое. На что отвечать?');
    }
    const bot = getAvailableBot();
    if (!bot) {
        return res.status(503).send('Сервер перегружен. Попробуй позже!');
    }
    bot.isBusy = true;
    try {
        const response = await bot.say(text);
        res.send(response);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Неопознанная ошибка. Пожалуйста, свяжитесь с разработчиком в телеграм https://t.me/characterAl_BOT');
    } finally {
        bot.isBusy = false;
    }
});

process.on('SIGINT', async () => {
    console.log('Остановка сервера...');
    for (const bot of pBots) {
        await bot.destroy();
    }
    console.log('Сервер остановлен.');
    process.exit();
});
