const axios = require('axios');
const schedule = require('node-schedule');
require('dotenv').config()

const getTimestamp = () => Math.floor(new Date().getTime() / 1000)
// Bearer токен
const bearerToken = process.env.BEARER_TOKEN;

/**
 * Тап
 */
const urlTap = process.env.URL_TAP;
const tapBody = {
  count: 6000,
  availableTaps: 0,
  timestamp: getTimestamp(),
};

/**
 * Boost энергии
 */
const urlBoost = process.env.URL_BOOST;
const boostBody = { boostId: 'BoostFullAvailableTaps', timestamp: getTimestamp() };

/**
 * Синхронизация прибыли в час
 */
const urlSync = process.env.URL_SYNC;

// Интервалы времени в миллисекундах
const TAP_REQUEST_INTERVAL = 230 * 1000; // 230 секунд для тапа
const BOOST_REQUEST_INTERVAL = 1 * 60 * 60 * 1000 + 30 * 1000; // 1 час и 30 секунд для получения boost энергии
const BOOST_REQUEST_REPEAT = 6; // Boost выполняется 6 раз - лимит на 24 часа
const SYNC_REQUEST_INTERVAL = 1 * 60 * 60 * 1000; // 1 час для синхронизации прибыли

// Функция для отправки POST запроса
async function sendPostRequest(type, url, body) {
  try {
    const response = await axios.post(url, body, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bearerToken}`,
      },
    });

    // console.log(`Response from ${url}:`, response.data);
    console.log(`Success ${type}`);
  } catch (error) {
    console.error(`Error sending POST request to ${url}:`, error);
  }
}

let tapRequestIntervalId;
function scheduleTapTask() {
  tapRequestIntervalId = setInterval(() => {
    sendPostRequest('TAP', urlTap, tapBody);
  }, TAP_REQUEST_INTERVAL);
}

function scheduleBoostTask() {
  const rule = new schedule.RecurrenceRule();
  rule.hour = 0;
  rule.minute = 0;
  rule.second = 10;

  schedule.scheduleJob(rule, async () => {
    clearInterval(tapRequestIntervalId);
    for (let i = 0; i < BOOST_REQUEST_REPEAT; i++) {
      await sendPostRequest('BOOST', urlBoost, boostBody);
      if (i < BOOST_REQUEST_REPEAT - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, BOOST_REQUEST_INTERVAL)
        );
      }
    }
    await sendPostRequest('TAP', urlTap, tapBody);
    scheduleTapTask();
  });
}

function scheduleSyncTask() {
    setInterval(() => {
        sendPostRequest('SYNC', urlSync);
    }, SYNC_REQUEST_INTERVAL);
}

// Запускаем задачи
scheduleTapTask();
scheduleBoostTask();
scheduleSyncTask();

console.log('Scheduled tasks started.');
