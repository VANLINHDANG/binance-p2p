// Thử lấy giá Binance P2P USDT/VND từ máy chủ GitHub Actions.
// Chỉ in kết quả, không gửi đi đâu cả.
const URL = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search';

async function lay(tradeType) {
  const body = {
    fiat: 'VND', page: 1, rows: 10, tradeType, asset: 'USDT',
    countries: [], proMerchantAds: false, shieldMerchantAds: false,
    publisherType: null, payTypes: [], classifies: ['mass', 'profession'],
  };
  const r = await fetch(URL, {
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
  const text = await r.text();
  console.log(`\n== tradeType=${tradeType}  HTTP ${r.status} ==`);
  if (!r.ok) { console.log('Nội dung trả về (200 ký tự đầu):', text.slice(0, 200)); return false; }
  let j; try { j = JSON.parse(text); } catch { console.log('Không phải JSON:', text.slice(0, 200)); return false; }
  const ads = (j.data || []).slice(0, 5);
  if (!ads.length) { console.log('Không có quảng cáo nào. Phản hồi:', text.slice(0, 200)); return false; }
  for (const a of ads) {
    console.log(`${a.adv.price}  | còn ${a.adv.surplusAmount} USDT | ${a.advertiser.nickName}`);
  }
  return true;
}

(async () => {
  console.log('Ngày giờ UTC:', new Date().toISOString());
  const a = await lay('BUY');   // BUY = bạn mua USDT
  const b = await lay('SELL');  // SELL = bạn bán USDT
  console.log('\nKẾT LUẬN:', a && b ? 'LẤY ĐƯỢC GIÁ BINANCE ✅' : 'BỊ CHẶN / LỖI ❌');
})();
