const puppeteer = require('puppeteer');
const genericPool = require('generic-pool');

class PBot {
    constructor(botName = 'ХахБот', lang = 'ru') {
        this.botName = botName;
        this.lang = lang;

        this.browserPool = genericPool.createPool({
            create: async () => {
                const browser = await puppeteer.launch({ headless: true });
                return browser;
            },
            destroy: async (browser) => {
                await browser.close();
            }
        }, {
            max: 50, // Максимальное количество браузеров в пуле
            min: 2 // Минимальное количество браузеров в пуле
        });
    }

    async _sayToBot(page, text) {
        await page.addScriptTag({ url: 'https://code.jquery.com/jquery-3.2.1.min.js' });

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
        const browser = await this.browserPool.acquire();
        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(0);

        try {
            switch (this.lang) {
                case "en":
                    await page.goto('http://p-bot.ru/en/index.html');
                    break;
                case "ru":
                default:
                    await page.goto('http://p-bot.ru/');
            }

            const response = await this._sayToBot(page, text);
            await page.close();
            this.browserPool.release(browser);
            return response;
        } catch (error) {
            await page.close();
            this.browserPool.release(browser);
            throw error;
        }
    }
}

module.exports = PBot;
