const puppeteer = require('puppeteer');

class PBot {
    constructor(botName = 'ХахБот', lang = 'ru', browserCount = 20) {
        this.botName = botName;
        this.lang = lang;
        this.browsers = [];
        this.pages = [];
        this.queue = [];
        this.browserCount = browserCount;
        this.initPromise = this.init();
    }

    async _sayToBot(page, text) {
        let result = await page.evaluate((text) => {
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
                }, 30000);  // 30 секунд таймаут
            });
        }, text);
        result = result.split(':')[1].trim();
        result = result.replace(/pBot/g, this.botName);
        result = result.replace(/ρBot/g, this.botName);
        return result;
    }

    async say(text) {
        const page = await this.getFreePage();
        if (!page) {
            return new Promise((resolve, reject) => {
                this.queue.push({ text, cb: resolve, err: reject });
            });
        }
        try {
            const response = await this._sayToBot(page, text);
            this.releasePage(page);
            return response;
        } catch (error) {
            this.releasePage(page);
            throw error;
        }
    }

    async init() {
        for (let i = 0; i < this.browserCount; i++) {
            const browser = await puppeteer.launch({ headless: true });
            const page = await browser.newPage();
            await page.setDefaultNavigationTimeout(0);
            switch (this.lang) {
                case "en":
                    await page.goto('http://p-bot.ru/en/index.html');
                    break;
                case "ru":
                default:
                    await page.goto('http://p-bot.ru/');
            }
            await page.addScriptTag({ url: 'https://code.jquery.com/jquery-3.2.1.min.js' });
            this.browsers.push(browser);
            this.pages.push(page);
        }

        this.queueProcesser();
    }

    async getFreePage() {
        return this.pages.shift() || null;
    }

    releasePage(page) {
        this.pages.push(page);
        this.queueProcesser();
    }

    async queueProcesser() {
        while (this.queue.length > 0 && this.pages.length > 0) {
            const request = this.queue.shift();
            const page = await this.getFreePage();
            if (page) {
                try {
                    const response = await this._sayToBot(page, request.text);
                    this.releasePage(page);
                    request.cb(response);
                } catch (error) {
                    this.releasePage(page);
                    request.err(error);
                }
            } else {
                this.queue.unshift(request);
                break;
            }
        }
    }

    async destroy() {
        for (const browser of this.browsers) {
            await browser.close();
        }
        this.browsers = [];
        this.pages = [];
    }
}

module.exports = PBot;
