// Thử lấy giá Bybit P2P USDT/VND từ máy chủ GitHub Actions. Chỉ in kết quả.
const URL_BY = 'https://api2.bybit.com/fiat/otc/item/online';

async function lay(side) {   // side "1" = bạn mua USDT, "0" = bạn bán USDT
  const body = { userId: '', tokenId: 'USDT', currencyId: 'VND', payment: [], side, size: '10', page: '1', amount: '', authMaker: false, canTrade: false };
  const r = await fetch(URL_BY, {
    method: 'POST',
    headers: {
      'content-type': 'application/json;charset=UTF-8',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
      'accept': 'application/json',
      'origin': 'https://www.bybit.com',
      'referer': 'https://www.bybit.com/',
      'lang': 'vi-VN',
    },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  console.log(`\n== side=${side}  HTTP ${r.status} ==`);
  if (!r.ok) { console.log('Nội dung trả về (200 ký tự đầu):', text.slice(0, 200)); return false; }
  let j; try { j = JSON.parse(text); } catch { console.log('Không phải JSON:', text.slice(0, 200)); return false; }
  const items = (j.result && j.result.items) || [];
  if (!items.length) { console.log('Không có quảng cáo. Phản hồi:', text.slice(0, 300)); return false; }
  for (const a of items.slice(0, 5)) {
    console.log(`${a.price}  | còn ${a.lastQuantity} USDT | hạn mức ${a.minAmount}-${a.maxAmount} | ${a.nickName}`);
  }
  return true;
}

(async () => {
  console.log('Ngày giờ UTC:', new Date().toISOString());
  let a = false, b = false;
  try { a = await lay('1'); } catch (e) { console.log('Lỗi side=1:', e.message); }
  try { b = await lay('0'); } catch (e) { console.log('Lỗi side=0:', e.message); }
  console.log('\nKẾT LUẬN:', a && b ? 'LẤY ĐƯỢC GIÁ BYBIT ✅' : 'BỊ CHẶN / LỖI ❌');
})();
