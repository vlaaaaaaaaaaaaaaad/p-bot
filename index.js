const puppeteer = require('puppeteer');
const axios = require('axios');

class PBot {
    constructor(botName = 'ХахБот', lang = 'ru', poolSize = 6) {
        this.botName = botName;
        this.lang = lang;
        this.poolSize = poolSize;
        this.browserPool = [];
        this.activeBrowsers = new Map();
        this.reconnecting = false;
    }

    async init() {
        for (let i = 0; i < this.poolSize; i++) {
            const browser = await puppeteer.launch({ headless: true });
            this.browserPool.push(browser);
        }
    }

    async getBrowser() {
        if (this.browserPool.length > 0) {
            return this.browserPool.pop();
        } else {
            // Ожидание освобождения браузера, если пул пуст
            return new Promise(resolve => {
                const interval = setInterval(() => {
                    if (this.browserPool.length > 0) {
                        clearInterval(interval);
                        resolve(this.browserPool.pop());
                    }
                }, 100);
            });
        }
    }

    async freeBrowser(browser) {
        this.browserPool.push(browser);
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

    async say(text) {
        const browser = await this.getBrowser();
        try {
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

            const result = await page.evaluate((text) => {
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
                    }, 5000);
                });
            }, text);

            let resultText = result.split(':')[1].trim();
            resultText = resultText.replace(/pBot/g, this.botName);
            resultText = resultText.replace(/ρBot/g, this.botName);

            await page.close(); // Закрываем страницу после обработки запроса
            this.freeBrowser(browser); // Возвращаем браузер в пул

            return resultText;
        } catch (error) {
            console.error('Error during browser operation:', error);
            this.freeBrowser(browser); // В случае ошибки браузер также возвращается
            throw error;
        }
    }

    async destroy() {
        while (this.browserPool.length > 0) {
            const browser = this.browserPool.pop();
            await browser.close();
        }
    }
}

module.exports = PBot;
