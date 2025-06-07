const TelegramBot = require('node-telegram-bot-api');
const mysql = require('mysql2/promise');
const QRCode = require('qrcode');
const puppeteer = require('puppeteer');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'chatbottests'
};

const pool = mysql.createPool(dbConfig);

const TOKEN = '8103981278:AAFmg0wtzeyRODAAOFC-h2ubMxaysOcgTx8';
const bot = new TelegramBot(TOKEN, {polling: true});

// Команда /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const welcomeText = `Привет, октагон!\n\n` +
                     `Я бот с полезной информацией.\n` +
                     `Используй /help для списка команд.`;
  
  await bot.sendMessage(chatId, welcomeText);
});

// Команда /help
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  const helpText = `📋 Доступные команды:\n\n` +
                   `/site - Ссылка на сайт Октагона\n` +
                   `/creator - Информация о создателе бота\n` +
                   `/randomItem - Получить случайный предмет\n` +
                   `/getItemByID [id] - Получить предмет по ID\n` +
                   `/deleteItem [id] - Удалить предмет по ID\n` +
                   `/help - Список всех команд`;
  
  await bot.sendMessage(chatId, helpText);
});

// Команда /randomItem
bot.onText(/\/randomItem/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM Items ORDER BY RAND() LIMIT 1');
    connection.release();

    if (rows.length > 0) {
      const item = rows[0];
      await bot.sendMessage(chatId, `(${item.id}) - ${item.name}: ${item.desc}`);
    } else {
      await bot.sendMessage(chatId, 'В базе данных нет предметов');
    }
  } catch (error) {
    console.error(error);
    await bot.sendMessage(chatId, 'Произошла ошибка при получении случайного предмета');
  }
});

// Команда /getItemByID
bot.onText(/\/getItemByID (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const itemId = match[1];

  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM Items WHERE id = ?', [itemId]);
    connection.release();

    if (rows.length > 0) {
      const item = rows[0];
      await bot.sendMessage(chatId, `(${item.id}) - ${item.name}: ${item.desc}`);
    } else {
      await bot.sendMessage(chatId, `Предмет с ID ${itemId} не найден`);
    }
  } catch (error) {
    console.error(error);
    await bot.sendMessage(chatId, 'Произошла ошибка при поиске предмета');
  }
});

// Команда /deleteItem
bot.onText(/\/deleteItem (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const itemId = match[1];

  try {
    const connection = await pool.getConnection();
    const [result] = await connection.query('DELETE FROM Items WHERE id = ?', [itemId]);
    connection.release();

    if (result.affectedRows > 0) {
      await bot.sendMessage(chatId, `Предмет с ID ${itemId} успешно удален`);
    } else {
      await bot.sendMessage(chatId, `Предмет с ID ${itemId} не найден`);
    }
  } catch (error) {
    console.error(error);
    await bot.sendMessage(chatId, 'Произошла ошибка при удалении предмета');
  }
});

// Команда !qr
bot.onText(/!qr (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];

  try {
    const dataUrl = await QRCode.toDataURL(text, { margin: 2 });

    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    const imgBuffer = Buffer.from(base64Data, 'base64');

    await bot.sendPhoto(chatId, imgBuffer, {}, { filename: 'qr.png', contentType: 'image/png' });
  } catch (err) {
    console.error('QR error', err);
    await bot.sendMessage(chatId, 'Не удалось сгенерировать QR-код');
  }
});

// Команда !webscr
bot.onText(/!webscr (https?:\/\/\S+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const url = match[1];

  await bot.sendMessage(chatId, 'Снимаю скриншот, подождите… ⏳');

  let browser;
  try {
    browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();

    const NAVIGATION_TIMEOUT = 20_000;             
    const TOTAL_TIMEOUT      = 20_000;             

    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
    page.setDefaultTimeout(NAVIGATION_TIMEOUT);

    const makeScreenshot = async () => {
      await page.setViewport({ width: 1280, height: 800 });
      await page.goto(url, { waitUntil: 'networkidle2' });
      return page.screenshot({ fullPage: true });
    };

    const buffer = await Promise.race([
      makeScreenshot(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Screenshot timeout')), TOTAL_TIMEOUT)
      )
    ]);

    await bot.sendPhoto(chatId, buffer);
  } catch (err) {
    console.error('Webscr error', err);
    const text = err.message === 'Screenshot timeout'
      ? 'Превышено максимальное время создания скриншота'
      : 'Не удалось сделать скриншот сайта';
    await bot.sendMessage(chatId, text);
  } finally {
    if (browser) await browser.close();
  }
});


bot.on('polling_error', (error) => {
  console.error(`Ошибка: ${error.code} - ${error.message}`);
});

console.log('Бот успешно запущен и ожидает сообщений...');