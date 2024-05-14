const puppeteer = require('puppeteer');
const axios = require('axios');  // Для отправки HTTP-запросов

class PBot {
    constructor(botName = 'ХахБот', lang = 'ru') {
        this.botName = botName;
        this.page = null;
        this.queue = [];
        this.lang = lang;
        this.browser = null;
    }

    async _sayToBot(text) {
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
                }, 10000);  // 10 секунд таймаут
            });
        }, text);
        return result.split(':')[1].trim().replace(/pBot|ρBot/g, this.botName);
    }

    async say(text) {
        return new Promise((resolve, reject) => {
            this.queue.push({
                text, cb: (response) => resolve(response), err: (error) => {
                    this.handleError(error, text, resolve, reject);
                }
            });
        });
    }

    async handleError(error, text, resolve, reject) {
        if (error.message === "Timeout Error") {
            try {
                // Отправка сообщения на резервный сервер
                const response = await axios.post('https://xu.su/api/send', {
                    uid: '', bot: 'main', text
                });
                resolve(response.data);
            } catch (e) {
                reject(new Error("Timeout Error"));
            }
        } else {
            reject(error);
        }
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

        this.queueTimer = setTimeout(() => this.processQueue(), 100);
    }

    async processQueue() {
        if (!this.queue.length) {
            this.queueTimer = setTimeout(() => this.processQueue(), 100);
            return;
        }
        let request = this.queue.shift();
        try {
            request.cb(await this._sayToBot(request.text));
        } catch (error) {
            request.err(error);
        }
        this.queueTimer = setTimeout(() => this.processQueue(), 100);
    }

    async destroy() {
        clearTimeout(this.queueTimer);
        if (this.browser) {
            await this.browser.close();
        }
        this.browser = null;
        this.page = null;
    }
}

module.exports = PBot;
