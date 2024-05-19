const express = require('express');
const PBot = require('./index');

const app = express();
const PORT = process.env.PORT || 3000;
const pBot = new PBot('ХахБот', 'ru');

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

app.get('/', (req, res) => {
    res.send("I'm alive");
});

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

process.on('SIGINT', () => {
    console.log('Server stopped');
    process.exit();
});
