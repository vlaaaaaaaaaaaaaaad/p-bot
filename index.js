const puppeteer = require('puppeteer');

class PBot {
    constructor(botName = 'ХахБот', lang = 'ru') {
        this.botName = botName;
        this.page = null;
        this.lang = lang;
        this.browser = null;
    }

    async init() {
        this.browser = await puppeteer.launch({ headless: true });
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

    async say(text) {
        try {
            const result = await this.page.evaluate((text) => {
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
            return result.split(':')[1].trim().replace(/pBot/g, this.botName).replace(/ρBot/g, this.botName);
        } finally {
            await this.destroy();
        }
    }

    async destroy() {
        await this.browser.close();
        this.page = null;
        this.browser = null;
    }
}

module.exports = PBot;
