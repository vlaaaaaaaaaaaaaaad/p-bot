const express = require('express');
const PBot = require('./index');

const app = express();
const PORT = process.env.PORT || 3000;

// Создаем экземпляр PBot
const pBot = new PBot('ХахБот', 'ru');

// Инициализация бота
async function initBot() {
    await pBot.init();
    console.log('Bot is initialized');
}

// Запуск сервера
app.listen(PORT, async () => {
    await initBot();
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Корневой маршрут для проверки живучести сервера
app.get('/', (req, res) => {
    res.send("I'm alive");
});

// Маршрут для обработки POST запросов на /ask
app.post('/ask', express.json(), async (req, res) => {
    const { text } = req.body;
    if (!text) {
        return res.status(400).send('Text is required');
    }
    try {
        const response = await pBot.say(text);
        res.send(response);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Обработка сигнала остановки для корректного закрытия бота
process.on('SIGINT', async () => {
    await pBot.destroy();
    console.log('Server stopped');
    process.exit();
});
