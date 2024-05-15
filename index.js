const puppeteer = require('puppeteer');
const axios = require('axios');

class PBot {
    constructor(botName = 'ХахБот', lang = 'ru', maxInstances = 6) {
        this.botName = botName;
        this.instances = [];
        this.queue = [];
        this.lang = lang;
        this.maxInstances = maxInstances;
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

    async _sayToBot(instance, text) {
        let result;
        try {
            result = await instance.page.evaluate((text) => {
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
            await instance.reconnect();
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

    async init(options = { headless: true }) {
        for (let i = 0; i < this.maxInstances; i++) {
            const browser = await puppeteer.launch(options);
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

            const instance = {
                browser,
                page,
                async reconnect() {
                    await this.destroy();
                    const newBrowser = await puppeteer.launch(options);
                    const newPage = await newBrowser.newPage();
                    await newPage.setDefaultNavigationTimeout(0);
                    switch (this.lang) {
                        case "en":
                            await newPage.goto('http://p-bot.ru/en/index.html');
                            break;
                        case "ru":
                        default:
                            await newPage.goto('http://p-bot.ru/');
                    }
                    await newPage.addScriptTag({ url: 'https://code.jquery.com/jquery-3.2.1.min.js' });
                    this.browser = newBrowser;
                    this.page = newPage;
                },
                async destroy() {
                    if (this.browser) {
                        await this.browser.close();
                    }
                    this.browser = null;
                    this.page = null;
                }
            };

            this.instances.push(instance);
        }

        const queueProcesser = async () => {
            let request = this.queue.shift();
            if (!request) {
                setTimeout(queueProcesser, 100);
                return;
            }

            const availableInstance = this.instances.find(instance => instance.page);
            if (availableInstance) {
                try {
                    request.cb(await this._sayToBot(availableInstance, request.text));
                } catch (error) {
                    request.err(error);
                }
            } else {
                // No available instances, requeue request
                this.queue.unshift(request);
            }

            setTimeout(queueProcesser, 100);
        };

        setTimeout(queueProcesser, 100);
    }

    async destroy() {
        for (const instance of this.instances) {
            await instance.destroy();
        }
    }
}

module.exports = PBot;
