const webpush = require('web-push');

const PUB = 'BJ25L-oScKAw3wroUw2eK81vZIkgy1zFpQB1EPzC8rNP4lAw2eHIb7vTpP4H9S09YSPqY5j5iQt_ttt-xpm5TiY';
// Разрешаем отправку только на серверы push-служб браузеров
const HOSTS = ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'push.apple.com', 'notify.windows.com', 'push.services.mozilla.com'];
const KINDS = ['msg', 'call', 'missed'];
const cut = (s, n) => String(s == null ? '' : s).slice(0, n);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'POST only' };
  if (!process.env.VAPID_PRIVATE_KEY) return { statusCode: 500, body: 'VAPID_PRIVATE_KEY is not set' };
  if ((event.body || '').length > 4096) return { statusCode: 413, body: 'Too large' };

  let b;
  try { b = JSON.parse(event.body); } catch { return { statusCode: 400, body: 'Bad JSON' }; }
  const sub = b && b.sub, p = (b && b.p) || {};
  if (!sub || typeof sub.endpoint !== 'string' || !sub.keys || typeof sub.keys.p256dh !== 'string' || typeof sub.keys.auth !== 'string')
    return { statusCode: 400, body: 'Bad subscription' };

  let host;
  try { const u = new URL(sub.endpoint); if (u.protocol !== 'https:') throw 0; host = u.hostname; } catch { return { statusCode: 400, body: 'Bad endpoint' }; }
  if (!HOSTS.some(h => host === h || host.endsWith('.' + h))) return { statusCode: 400, body: 'Endpoint not allowed' };

  const k = KINDS.includes(p.k) ? p.k : 'msg';
  const payload = JSON.stringify({ t: cut(p.t, 60), b: cut(p.b, 160), u: cut(p.u, 40).replace(/[^A-Za-z0-9_]/g, ''), k });

  webpush.setVapidDetails('https://zilo-mesenger.netlify.app', PUB, process.env.VAPID_PRIVATE_KEY);
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
      payload,
      { TTL: k === 'call' ? 45 : 86400, urgency: k === 'call' ? 'high' : 'normal' }
    );
    return { statusCode: 200, body: 'ok' };
  } catch (e) {
    if (e.statusCode === 404 || e.statusCode === 410) return { statusCode: 410, body: 'gone' };
    return { statusCode: 502, body: 'push failed' };
  }
};
