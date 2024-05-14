const puppeteer = require('puppeteer');
import fetch from 'node-fetch';

class PBot {
    constructor(botName = 'ХахБот', lang = 'ru') {
        this.botName = botName;
        this.lang = lang;
        this.browser = null;
        this.page = null;
        this.queue = [];
    }

    async _sayToBot(text) {
        try {
            let result = await this.page.evaluate((text) => {
                return new Promise((resolve, reject) => {
                    $('.last_answer').text('NOTEXT');
                    $('.main_input').val(text);
                    $('#btnSay').click();
                    let lastAnswer = '';
                    let timer = setInterval(() => {
                        if ($('.last_answer').text() && $('.last_answer').text() !== 'NOTEXT' && $('.last_answer').text() !== 'ρBot: думаю...' && $('.last_answer').text() !== 'ρBot: thinking...') {
                            if (lastAnswer === $('.last_answer').text()) {
                                clearInterval(timer);
                                resolve($('.last_answer').text());
                            }
                            lastAnswer = $('.last_answer').text();
                        }
                    }, 100);
                    setTimeout(() => {
                        clearInterval(timer);
                        reject(new Error("Timeout Error"));
                    }, 10000); // 10 секунд таймаут
                });
            }, text);
            return this._processResponse(result);
        } catch (error) {
            // Отправляем запрос на запасной сервер при таймауте
            const response = await fetch('https://xu.su/api/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    uid: '',
                    bot: 'main',
                    text: text
                })
            });
            if (!response.ok) {
                throw new Error("Backup server failed: " + response.statusText);
            }
            const backupResult = await response.json();
            return backupResult;
        }
    }

    _processResponse(result) {
        if (typeof result === 'string') {
            result = result.split(':')[1]?.trim();
            result = result.replace(/pBot/g, this.botName);
            result = result.replace(/ρBot/g, this.botName);
        }
        return result;
    }

    async say(text) {
        if (!this.page) {
            throw new Error("Bot is not initialized");
        }
        return this._sayToBot(text);
    }

    async init(options = { headless: true }) {
        this.browser = await puppeteer.launch(options);
        this.page = await this.browser.newPage();
        await this.page.setDefaultNavigationTimeout(0);
        switch (this.lang) {
            case "en":
                await this.page.goto('http://p-bot.ru/en/index.html');
                break;
            case "ru":
            default:
                await this.page.goto('http://p-bot.ru/');
        }
        await this.page.addScriptTag({ url: 'https://code.jquery.com/jquery-3.2.1.min.js' });
    }

    async destroy() {
        if (this.browser) {
            await this.browser.close();
        }
        this.browser = null;
        this.page = null;
    }
}

module.exports = PBot;
