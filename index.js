const TelegramBot = require('node-telegram-bot-api');

const TOKEN = '8103981278:AAFmg0wtzeyRODAAOFC-h2ubMxaysOcgTx8';

const bot = new TelegramBot(TOKEN, {polling: true});

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  
  bot.sendMessage(chatId, 'Привет, октагон!', {
    reply_markup: {
      keyboard: [['/start']],
      resize_keyboard: true
    }
  });
  
  console.log(`Пользователь ${msg.from.username} начал диалог`);
});

bot.on('polling_error', (error) => {
  console.error(`Ошибка: ${error.code} - ${error.message}`);
});

console.log('Бот успешно запущен и ожидает сообщений...');