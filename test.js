const express = require('express');
const PBot = require('./index');

const app = express();
const port = 3000;

// Создаем экземпляр PBot
const pBot = new PBot('лох', 'ru');

// Инициализируем PBot при запуске сервера
app.listen(port, async () => {
    await pBot.init();
    console.log(`Server is running on http://localhost:${port}`);
});

// Обработчик POST запросов на /ask
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

// Завершаем работу PBot при остановке сервера
process.on('SIGINT', async () => {
    await pBot.destroy();
    console.log('Server stopped');
    process.exit();
});
