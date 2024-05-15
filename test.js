const express = require('express');
const PBot = require('./index');

const app = express();
const PORT = process.env.PORT || 3000;

const MAX_BROWSERS = 50;
const pBots = [];

app.use(express.json());
async function initBots() {
    for (let i = 0; i < MAX_BROWSERS; i++) {
        const bot = new PBot('ХахБот', 'ru');
        await bot.init();
        pBots.push(bot);
    }
    console.log('Все экземпляры p-bot запущены! Запуск сервера...');
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
        return res.status(400).send('Text is required');
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
