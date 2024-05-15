const puppeteer = require('puppeteer');
const axios = require('axios');

class PBot {
    constructor(botName = 'ХахБот', lang = 'ru') {
        this.botName = botName;
        this.browserPool = [];
        this.queue = [];
        this.lang = lang;
        this.reconnecting = false;
        this.initializeBrowserPool();
    }

    async _sendBackupRequest(text) {
        try {
            const response = await axios.post('https://xu.su/api/send', {
                uid: '',
                bot: 'main',
                text: text
            });
            if (response.data.ok) {
                return response.data.text;
            }
            throw new Error('Backup server failed');
        } catch (error) {
            throw new Error("Timeout Error");
        }
    }

    async _reconnect() {
        if (!this.reconnecting) {
            this.reconnecting = true;
            try {
                await this.destroy();
                await this.init({ headless: true });
            } finally {
                this.reconnecting = false;
            }
        }
    }

    async _sayToBot(text) {
        let result;
        try {
            result = await this.page.evaluate((text) => {
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
                    }, 5000);  // 5 секунд таймаут
                });
            }, text);
        } catch (error) {
            await this._reconnect();
            console.log('Attempting backup server due to timeout...');
            return await this._sendBackupRequest(text);
        }
        result = result.split(':')[1].trim();
        result = result.replace(/pBot/g, this.botName);
        result = result.replace(/ρBot/g, this.botName);
        return result;
    }

    async say(text) {
        return new Promise((resolve, reject) => {
            this.queue.push({ text, cb: (response) => resolve(response), err: reject });
        });
    }

    async initializeBrowserPool() {
        const concurrency = 6; // Количество одновременных экземпляров браузера
        for (let i = 0; i < concurrency; i++) {
            const browser = await puppeteer.launch({ headless: true });
            this.browserPool.push(browser);
        }
    }

    async init(options = { headless: true }) {
        const browser = this.browserPool.pop(); // Берем экземпляр браузера из пула
        this.browser = browser;
        this.page = await browser.newPage();
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

        const queueProcesser = async () => {
            let request = this.queue.shift();
            if (!request) {
                this.queueTimer = setTimeout(queueProcesser, 100);
                return;
            }
            try {
                request.cb(await this._sayToBot(request.text));
            } catch (error) {
                request.err(error);
            }
            this.queueTimer = setTimeout(queueProcesser, 100);
        };
        this.queueTimer = setTimeout(queueProcesser, 100);
    }

    async destroy() {
        clearTimeout(this.queueTimer);
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
        }
    }
}

module.exports = PBot;
