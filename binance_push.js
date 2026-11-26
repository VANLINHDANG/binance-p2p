// Lấy giá Binance và Bybit P2P USDT/VND rồi gửi lên Worker Cloudflare (POST /api/push).
// Chạy bởi GitHub Actions. Cần 2 secret trong repo: WORKER_URL, ALERT_KEY.
const WORKER = (process.env.WORKER_URL || '').replace(/\/+$/, '');
const KEY = process.env.ALERT_KEY || '';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36';

// ---- Binance: BUY = bạn mua USDT, SELL = bạn bán USDT
async function binanceSide(tradeType, rows) {
  const body = {
    fiat: 'VND', page: 1, rows, tradeType, asset: 'USDT',
    countries: [], proMerchantAds: false, shieldMerchantAds: false,
    publisherType: null, payTypes: [], classifies: ['mass', 'profession'],
  };
  const r = await fetch('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
    method: 'POST',
    headers: {
      'content-type': 'application/json', 'user-agent': UA, 'accept': 'application/json',
      'origin': 'https://p2p.binance.com', 'referer': 'https://p2p.binance.com/vi/trade/all-payments/USDT?fiat=VND',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Binance ${tradeType}: HTTP ${r.status}`);
  const j = await r.json();
  return (j.data || []).map(a => ({
    p: Number(a.adv.price), a: Number(a.adv.surplusAmount),
    lo: Number(a.adv.minSingleTransAmount), hi: Number(a.adv.maxSingleTransAmount),
    n: a.advertiser.nickName,
    m: (a.adv.tradeMethods || []).map(t => t.tradeMethodName || t.identifier).filter(Boolean).slice(0, 3),
  }));
}
async function binance() {
  const side = async t => { try { return await binanceSide(t, 20); } catch (e) { return await binanceSide(t, 10); } };
  return { buy: await side('BUY'), sell: await side('SELL') };
}

// ---- Bybit: side "1" = bạn mua USDT, "0" = bạn bán USDT
async function bybitSide(side, size) {
  const body = { userId: '', tokenId: 'USDT', currencyId: 'VND', payment: [], side, size: String(size), page: '1', amount: '', authMaker: false, canTrade: false };
  const r = await fetch('https://api2.bybit.com/fiat/otc/item/online', {
    method: 'POST',
    headers: {
      'content-type': 'application/json;charset=UTF-8', 'user-agent': UA, 'accept': 'application/json',
      'origin': 'https://www.bybit.com', 'referer': 'https://www.bybit.com/', 'lang': 'vi-VN',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Bybit side=${side}: HTTP ${r.status}`);
  const j = await r.json();
  return ((j.result && j.result.items) || []).map(a => ({
    p: Number(a.price), a: Number(a.lastQuantity),
    lo: Number(a.minAmount), hi: Number(a.maxAmount), n: a.nickName, m: [],
  }));
}
async function bybit() {
  const side = async s => { try { return await bybitSide(s, 20); } catch (e) { return await bybitSide(s, 10); } };
  return { buy: await side('1'), sell: await side('0') };
}

(async () => {
  if (!WORKER || !KEY) { console.error('Thiếu secret WORKER_URL hoặc ALERT_KEY'); process.exit(1); }
  const [bn, by] = await Promise.allSettled([binance(), bybit()]);
  const payload = {};
  for (const [k, r, name] of [['bn', bn, 'Binance'], ['by', by, 'Bybit']]) {
    if (r.status === 'fulfilled') {
      payload[k] = r.value;
      console.log(`${name}: mua tốt nhất ${r.value.buy[0] && r.value.buy[0].p}, bán tốt nhất ${r.value.sell[0] && r.value.sell[0].p} (${r.value.buy.length}/${r.value.sell.length} quảng cáo)`);
    } else console.error(`${name} LỖI: ${r.reason && r.reason.message}`);
  }
  if (!Object.keys(payload).length) { console.error('Không lấy được sàn nào'); process.exit(1); }
  const r = await fetch(WORKER + '/api/push', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-key': KEY }, body: JSON.stringify(payload),
  });
  console.log('Worker trả về:', r.status, (await r.text()).slice(0, 200));
  if (!r.ok) process.exit(1);
})().catch(e => { console.error('LỖI:', e.message); process.exit(1); });
