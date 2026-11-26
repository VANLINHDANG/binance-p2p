// Lấy giá Binance P2P USDT/VND rồi gửi lên Worker Cloudflare (POST /api/push).
// Chạy bởi GitHub Actions. Cần 2 secret trong repo: WORKER_URL, ALERT_KEY.
const URL_BN = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search';
const WORKER = (process.env.WORKER_URL || '').replace(/\/+$/, '');
const KEY = process.env.ALERT_KEY || '';

async function lay(tradeType) {
  const body = {
    fiat: 'VND', page: 1, rows: 10, tradeType, asset: 'USDT',
    countries: [], proMerchantAds: false, shieldMerchantAds: false,
    publisherType: null, payTypes: [], classifies: ['mass', 'profession'],
  };
  const r = await fetch(URL_BN, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
      'accept': 'application/json',
      'origin': 'https://p2p.binance.com',
      'referer': 'https://p2p.binance.com/vi/trade/all-payments/USDT?fiat=VND',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Binance ${tradeType}: HTTP ${r.status}`);
  const j = await r.json();
  return (j.data || []).map(a => ({
    p: Number(a.adv.price),
    a: Number(a.adv.surplusAmount),
    lo: Number(a.adv.minSingleTransAmount),
    hi: Number(a.adv.maxSingleTransAmount),
    n: a.advertiser.nickName,
    m: (a.adv.tradeMethods || []).map(t => t.tradeMethodName || t.identifier).filter(Boolean).slice(0, 3),
  }));
}

(async () => {
  if (!WORKER || !KEY) { console.error('Thiếu secret WORKER_URL hoặc ALERT_KEY'); process.exit(1); }
  const buy = await lay('BUY');    // BUY = bạn mua USDT
  const sell = await lay('SELL');  // SELL = bạn bán USDT
  console.log(`Binance: mua tốt nhất ${buy[0] && buy[0].p}, bán tốt nhất ${sell[0] && sell[0].p}`);
  const r = await fetch(WORKER + '/api/push', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-key': KEY },
    body: JSON.stringify({ buy, sell }),
  });
  const t = await r.text();
  console.log('Worker trả về:', r.status, t.slice(0, 200));
  if (!r.ok) process.exit(1);
})().catch(e => { console.error('LỖI:', e.message); process.exit(1); });
