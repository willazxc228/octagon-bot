const TelegramBot = require('node-telegram-bot-api');
const mysql = require('mysql2/promise');
const QRCode = require('qrcode');
const puppeteer = require('puppeteer');
const { setIntervalAsync, clearIntervalAsync } = require('set-interval-async/dynamic');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'chatbottests'
};
const pool = mysql.createPool(dbConfig);

const TOKEN = '8103981278:AAFmg0wtzeyRODAAOFC-h2ubMxaysOcgTx8';
const bot = new TelegramBot(TOKEN, { polling: true });

// /start
bot.onText(/\/start/, async msg => {
  await bot.sendMessage(
    msg.chat.id,
    `Привет, октагон!\n\nЯ бот с полезной информацией.\nИспользуй /help для списка команд.`
  );
});

// /help
bot.onText(/\/help/, async msg => {
  const helpText =
    `📋 Доступные команды:\n\n` +
    `/site - Ссылка на сайт Октагона\n` +
    `/creator - Информация о создателе бота\n` +
    `/randomItem - Получить случайный предмет\n` +
    `/getItemByID [id] - Получить предмет по ID\n` +
    `/deleteItem [id] - Удалить предмет по ID\n` +
    `/help - Список всех команд`;
  await bot.sendMessage(msg.chat.id, helpText);
});

// /site
bot.onText(/\/site/, async (msg) => {
  const chatId = msg.chat.id;
  const siteUrl = 'https://octagon-students.ru/';
  await bot.sendMessage(chatId, `Наш официальный сайт:\n${siteUrl}`);
});

// /creator
bot.onText(/\/creator/, async (msg) => {
  const chatId = msg.chat.id;
  const creatorInfo =
    `Бот создан Грошевой Полиной Сергеевной 👨‍💻\n` +
    `GitHub: https://github.com/willazxc228\n` +
    `Telegram: @niceFittts`;
  await bot.sendMessage(chatId, creatorInfo);
});


// /randomItem
bot.onText(/\/randomItem/, async msg => {
  const chatId = msg.chat.id;
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT * FROM Items ORDER BY RAND() LIMIT 1');
    conn.release();

    if (rows.length > 0) {
      const it = rows[0];
      await bot.sendMessage(chatId, `(${it.id}) ${it.name}: ${it.desc}`);
    } else {
      await bot.sendMessage(chatId, 'В базе данных нет предметов');
    }
  } catch (err) {
    console.error(err);
    await bot.sendMessage(chatId, 'Ошибка при получении случайного предмета');
  }
});

// /getItemByID
bot.onText(/\/getItemByID (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const id = match[1];
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT * FROM Items WHERE id = ?', [id]);
    conn.release();

    if (rows.length > 0) {
      const it = rows[0];
      await bot.sendMessage(chatId, `(${it.id}) ${it.name}: ${it.desc}`);
    } else {
      await bot.sendMessage(chatId, `Предмет с ID ${id} не найден`);
    }
  } catch (err) {
    console.error(err);
    await bot.sendMessage(chatId, 'Ошибка при поиске предмета');
  }
});

// /deleteItem
bot.onText(/\/deleteItem (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const id = match[1];
  try {
    const conn = await pool.getConnection();
    const [res] = await conn.query('DELETE FROM Items WHERE id = ?', [id]);
    conn.release();

    if (res.affectedRows > 0) {
      await bot.sendMessage(chatId, `Предмет с ID ${id} удалён`);
    } else {
      await bot.sendMessage(chatId, `Предмет с ID ${id} не найден`);
    }
  } catch (err) {
    console.error(err);
    await bot.sendMessage(chatId, 'Ошибка при удалении предмета');
  }
});

// !qr
bot.onText(/!qr (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  try {
    const dataUrl = await QRCode.toDataURL(text, { margin: 2 });
    const img = Buffer.from(dataUrl.split(',')[1], 'base64');
    await bot.sendPhoto(chatId, img, {}, { filename: 'qr.png', contentType: 'image/png' });
  } catch (err) {
    console.error(err);
    await bot.sendMessage(chatId, 'Не удалось сгенерировать QR-код');
  }
});

// !webscr
bot.onText(/!webscr (https?:\/\/\S+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const url = match[1];
  await bot.sendMessage(chatId, 'Снимаю скриншот, подождите… ⏳');


  let browser;
  try {
    browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(20000);
    page.setDefaultTimeout(20000);

    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: 'networkidle2' });
    const buffer = await page.screenshot({ fullPage: true });

    await bot.sendPhoto(chatId, buffer);
  } catch (err) {
    console.error(err);
    const msgText = err.message.includes('navigation') 
      ? 'Не удалось загрузить страницу' 
      : 'Ошибка создания скриншота';
    await bot.sendMessage(chatId, msgText);
  } finally {
    if (browser) await browser.close();
  }
});

bot.on('message', async msg => {
  if (!msg.from || !msg.from.id) return;

  const userId = msg.from.id;
  const now = new Date();

  try {
    const conn = await pool.getConnection();
    await conn.query(
      `INSERT INTO Users (ID, lastMessage) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE lastMessage = ?`,
      [userId, now, now]
    );
    conn.release();
  } catch (err) {
    console.error('Ошибка обновления lastMessage:', err);
  }
});

async function sendReminders() {
  console.log('sendReminders: проверяем молчаливых пользователей...');
  try {
    const conn = await pool.getConnection();
    const [users] = await conn.query(
      `SELECT ID 
         FROM Users 
        WHERE lastMessage < DATE_SUB(NOW(), INTERVAL 2 DAY)`
    );

    for (const u of users) {
      const chatId = u.ID;
      const [items] = await conn.query('SELECT * FROM Items ORDER BY RAND() LIMIT 1');
      if (items.length) {
        const it = items[0];
        await bot.sendMessage(
          chatId,
          `Привет! Давно не было от тебя вестей. Вот случайный элемент:\n\n` +
          `(${it.id}) ${it.name}: ${it.desc}`
        );
      }
    }

    conn.release();
  } catch (err) {
    console.error('Ошибка в sendReminders:', err);
  }
}

// Планировщик: запускает sendReminders каждый день в 13:00 (МСК)
function scheduleDailyAt(hour, minute, fn) {
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);

  const delay = next.getTime() - now.getTime();
  setTimeout(() => {
    fn();
    setIntervalAsync(fn, 24 * 60 * 60 * 1000);
  }, delay);
}

// Запуск планировщика
scheduleDailyAt(13, 0, sendReminders);

bot.on('polling_error', e => console.error('Polling error', e));
console.log('Бот запущен и ожидает сообщений...');
