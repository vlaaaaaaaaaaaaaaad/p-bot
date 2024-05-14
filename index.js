const puppeteer = require('puppeteer');

class BrowserPool {
    constructor(maxInstances) {
        this.maxInstances = maxInstances;
        this.instances = [];
        this.queue = [];
    }

    async createBrowser() {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(0);
        await page.goto('http://p-bot.ru/');
        await page.addScriptTag({ url: 'https://code.jquery.com/jquery-3.2.1.min.js' });
        return { browser, page };
    }

    async requestInstance() {
        if (this.instances.length < this.maxInstances) {
            const instance = await this.createBrowser();
            this.instances.push(instance);
            return instance;
        } else {
            return new Promise(resolve => this.queue.push(resolve));
        }
    }

    async releaseInstance(instance) {
        const idx = this.instances.indexOf(instance);
        if (idx !== -1) {
            await instance.browser.close();
            this.instances.splice(idx, 1);
            if (this.queue.length > 0) {
                const newInstance = await this.createBrowser();
                this.instances.push(newInstance);
                const resolve = this.queue.shift();
                resolve(newInstance);
            }
        }
    }
}

class PBot {
    constructor(botName = 'ХахБот', lang = 'ru', browserPool) {
        this.botName = botName;
        this.lang = lang;
        this.browserPool = browserPool;
        this.queue = [];
        this.queueTimer = null;
    }

    async _sayToBot(text, page) {
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
                }, 10000);  // 10 секунд таймаут
            });
        }, text);
        result = result.split(':')[1].trim();
        result = result.replace(/pBot/g, this.botName);
        result = result.replace(/ρBot/g, this.botName);
        return result;
    }

    async say(text) {
        const { page } = await this.browserPool.requestInstance();
        try {
            const response = await this._sayToBot(text, page);
            return response;
        } finally {
            this.browserPool.releaseInstance({ page, browser: page.browser() });
        }
    }
}

module.exports = { PBot, BrowserPool };
