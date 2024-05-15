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

    async initializeBrowserPool() {
        const concurrency = 6; // Количество одновременных экземпляров браузера
        for (let i = 0; i < concurrency; i++) {
            const browser = await puppeteer.launch({ headless: true });
            this.browserPool.push(browser);
        }
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
                await this.initializeBrowserPool();
            } finally {
                this.reconnecting = false;
            }
        }
    }

    async _sayToBot(text) {
        let result;
        const browser = this.browserPool.pop() || await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        try {
            result = await page.evaluate((text) => {
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
            console.log('Attempting backup server due to timeout...');
            result = await this._sendBackupRequest(text);
        } finally {
            await page.close();
            this.browserPool.push(browser);
        }
        result = result.split(':')[1].trim();
        result = result.replace(/pBot/g, this.botName);
        result = result.replace(/ρBot/g, this.botName);
        return result;
    }

    async say(text) {
        return new Promise((resolve, reject) => {
            this.queue.push({ text, cb: (response) => resolve(response), err: reject });
            if (this.queue.length === 1) {
                this.processQueue();
            }
        });
    }

    async processQueue() {
        while (this.queue.length > 0) {
            const request = this.queue.shift();
            try {
                const response = await this._sayToBot(request.text);
                request.cb(response);
            } catch (error) {
                request.err(error);
            }
        }
    }

    async destroy() {
        this.queue = [];
        while (this.browserPool.length > 0) {
            const browser = this.browserPool.pop();
            await browser.close();
        }
    }
}

module.exports = PBot;
