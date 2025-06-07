const TelegramBot = require('node-telegram-bot-api');

const TOKEN = '8103981278:AAFmg0wtzeyRODAAOFC-h2ubMxaysOcgTx8';
const bot = new TelegramBot(TOKEN, {polling: true});

// /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeText = `Привет, октагон!\n\n` +
                     `Я бот с полезной информацией.\n` +
                     `Используй /help для списка команд.`;
  
  bot.sendMessage(chatId, welcomeText);
});

// /help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const helpText = `📋 Доступные команды:\n\n` +
                   `/site - Ссылка на сайт Октагона\n` +
                   `/creator - Информация о создателе бота\n` +
                   `/help - Список всех команд`;
  
  bot.sendMessage(chatId, helpText);
});

// /site
bot.onText(/\/site/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '🌐 Официальный сайт Октагона: https://octagon-students.ru/');
});

// /creator
bot.onText(/\/creator/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '👨‍💻 Создатель бота: Грошева Полина Сергеевна');
});

bot.on('polling_error', (error) => {
  console.error(`Ошибка: ${error.code} - ${error.message}`);
});

console.log('Бот успешно запущен и ожидает сообщений...');