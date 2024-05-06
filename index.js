const puppeteer = require('puppeteer');

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
                // Переподключение при ошибке
                await this.destroy();
                await this.init(options);
            }
            this.queueTimer = setTimeout(queueProcesser, 100);
        };
        this.queueTimer = setTimeout(queueProcesser, 100);
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
