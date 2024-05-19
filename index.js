const puppeteer = require('puppeteer');

class PBot {
    constructor(botName = 'ХахБот', lang = 'ru') {
        this.botName = botName;
        this.lang = lang;
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
                }, 10000);  // 10 секунд таймаут
            });
        }, text);
        result = result.split(':')[1].trim();
        result = result.replace(/pBot/g, this.botName);
        result = result.replace(/ρBot/g, this.botName);
        return result;
    }

    async say(text) {
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

        let response;
        try {
            response = await this._sayToBot(page, text);
        } catch (error) {
            console.error('Error during bot communication:', error);
            throw error;
        } finally {
            await browser.close();
        }

        return response;
    }
}

module.exports = PBot;
