const express = require('express');
const PBot = require('./index');

const app = express();
const PORT = process.env.PORT || 3000;

const MAX_BROWSERS = 6; // Определите максимальное количество экземпляров браузера
const pBots = [];

app.use(express.json()); // Глобальный middleware для парсинга JSON

// Инициализация пула экземпляров браузеров
async function initBots() {
    for (let i = 0; i < MAX_BROWSERS; i++) {
        const bot = new PBot('ХахБот', 'ru');
        await bot.init();
        pBots.push(bot);
    }
    console.log('All bots are initialized');
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
        return res.status(503).send('All bots are currently busy. Please try again later.');
    }
    bot.isBusy = true;
    try {
        const response = await bot.say(text);
        res.send(response);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    } finally {
        bot.isBusy = false; // Освобождаем бота после обработки запроса
    }
});

process.on('SIGINT', async () => {
    console.log('Shutting down the server...');
    for (const bot of pBots) {
        await bot.destroy();
    }
    console.log('Server stopped');
    process.exit();
});
