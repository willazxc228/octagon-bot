const TelegramBot = require('node-telegram-bot-api');
const mysql = require('mysql2/promise');

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

bot.on('polling_error', (error) => {
  console.error(`Ошибка: ${error.code} - ${error.message}`);
});

console.log('Бот успешно запущен и ожидает сообщений...');