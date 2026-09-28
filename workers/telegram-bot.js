// Cloudflare Worker: Telegram bot webhook for SMC Liquidity Hunting AI Lab.
// Deploy: wrangler deploy | Set the token as a secret: wrangler secret put BOT_TOKEN
// NEVER hardcode the bot token in this file.
// Set webhook: https://api.telegram.org/bot<TOKEN>/setWebhook?url=<WORKER_URL>

const DASHBOARD_URL = 'https://smc-lab.pages.dev'; // update after Cloudflare Pages deploy

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('OK', { status: 200 });
    }

    let update;
    try {
      update = await request.json();
    } catch (e) {
      return new Response('Bad Request', { status: 400 });
    }

    const message = update.message || update.channel_post;
    if (!message || !message.text) {
      return new Response('OK', { status: 200 });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();

    if (text.startsWith('/start')) {
      await sendMessage(env.BOT_TOKEN, chatId,
        '📈 Welcome to SMC Liquidity Hunting AI Lab!\n' +
        'Bilingual institutional Forex & Gold signals: ' + DASHBOARD_URL + '\n\n' +
        '📈 এসএমসি লিকুইডিটি হান্টিং এআই ল্যাবে স্বাগতম!\n' +
        'দ্বিভাষিক ইনস্টিটিউশনাল ফরেক্স ও গোল্ড সিগন্যাল: ' + DASHBOARD_URL);
    } else if (text.startsWith('/dashboard')) {
      await sendMessage(env.BOT_TOKEN, chatId, '📊 ' + DASHBOARD_URL);
    } else if (text.startsWith('/id')) {
      await sendMessage(env.BOT_TOKEN, chatId, 'Chat ID: ' + chatId);
    }

    return new Response('OK', { status: 200 });
  }
};

async function sendMessage(token, chatId, text) {
  await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text })
  });
}
