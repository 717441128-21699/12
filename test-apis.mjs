const BASE = 'http://localhost:4000/api';

async function testApi(name, method, path, body = null, headers = {}) {
  try {
    const opts = { method, headers: { 'Content-Type': 'application/json', ...headers } };
    if (body) opts.body = typeof body === 'string' ? body : JSON.stringify(body);
    const res = await fetch(BASE + path, opts);
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${typeof data === 'object' ? (data.error || data.details || text) : text}`);
    const detail = Array.isArray(data) ? `array[${data.length}]` :
      typeof data === 'object' ? JSON.stringify(data).slice(0, 80) :
      String(data).slice(0, 80);
    console.log(`\x1b[32mPASS\x1b[0m ${name} -> ${method} ${path}  ${detail}`);
    return { name, ok: true };
  } catch (e) {
    console.log(`\x1b[31mFAIL\x1b[0m ${name} -> ${method} ${path}  ${e.message}`);
    return { name, ok: false, error: e.message };
  }
}

async function main() {
  const all = [];

  console.log('\n=== 1. Public APIs ===');
  all.push(await testApi('health', 'GET', '/health'));
  all.push(await testApi('courses list', 'GET', '/courses'));
  all.push(await testApi('categories', 'GET', '/categories'));
  all.push(await testApi('stores', 'GET', '/stores'));
  all.push(await testApi('pricing rules', 'GET', '/pricing'));

  console.log('\n=== 2. Member login ===');
  const mLogin = await fetch(BASE + '/auth/login', { method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'member', phone: '13800000001', password: '123456' }) }).then(r => r.json());
  const mTok = mLogin.token;
  console.log(`  member token: ${mTok ? 'OK len=' + mTok.length : 'FAIL'}`);
  const mH = { 'Authorization': 'Bearer ' + mTok };

  console.log('\n=== 3. Member APIs ===');
  all.push(await testApi('member /me', 'GET', '/auth/me', null, mH));
  all.push(await testApi('member bookings', 'GET', '/bookings', null, mH));
  all.push(await testApi('member waiting', 'GET', '/waiting', null, mH));
  all.push(await testApi('member refunds', 'GET', '/refunds', null, mH));
  all.push(await testApi('member messages', 'GET', '/messages', null, mH));
  all.push(await testApi('member unread count', 'GET', '/messages/unread-count', null, mH));

  console.log('\n=== 4. Booking flow ===');
  all.push(await testApi('book course5', 'POST', '/bookings', { courseId: 'course5' }, mH));
  all.push(await testApi('book full course2 (should waitlist)', 'POST', '/bookings', { courseId: 'course2' }, mH));

  console.log('\n=== 5. Coach login ===');
  const cLogin = await fetch(BASE + '/auth/login', { method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'coach', phone: '13900000001', password: '123456' }) }).then(r => r.json());
  const cTok = cLogin.token;
  console.log(`  coach token: ${cTok ? 'OK len=' + cTok.length : 'FAIL'}`);
  const cH = { 'Authorization': 'Bearer ' + cTok };

  console.log('\n=== 6. Coach APIs ===');
  all.push(await testApi('coach /me', 'GET', '/auth/me', null, cH));
  all.push(await testApi('coach course detail', 'GET', '/courses/course7', null, cH));
  all.push(await testApi('coach waiting list', 'GET', '/waiting', null, cH));
  all.push(await testApi('coach stats', 'GET', '/stats/coach/coach1', null, cH));

  console.log('\n=== 7. Manager login ===');
  const mgLogin = await fetch(BASE + '/auth/login', { method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'manager', phone: '13700000001', password: '123456' }) }).then(r => r.json());
  const mgTok = mgLogin.token;
  console.log(`  manager token: ${mgTok ? 'OK len=' + mgTok.length : 'FAIL'}`);
  const mgH = { 'Authorization': 'Bearer ' + mgTok };

  console.log('\n=== 8. Manager APIs ===');
  all.push(await testApi('manager refunds', 'GET', '/refunds', null, mgH));
  all.push(await testApi('coach satisfaction ranking', 'GET', '/stats/coach-satisfaction', null, mgH));

  console.log('\n=== 9. Owner login ===');
  const oLogin = await fetch(BASE + '/auth/login', { method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'owner', phone: '13600000001', password: '123456' }) }).then(r => r.json());
  const oTok = oLogin.token;
  console.log(`  owner token: ${oTok ? 'OK len=' + oTok.length : 'FAIL'}`);
  const oH = { 'Authorization': 'Bearer ' + oTok };

  console.log('\n=== 10. Owner APIs ===');
  all.push(await testApi('store monthly stats', 'GET', '/stats/store-monthly', null, oH));

  console.log('\n\n========== SUMMARY ==========');
  const pass = all.filter(r => r.ok).length;
  const fail = all.filter(r => !r.ok).length;
  console.log(`Total: ${all.length}, Pass: \x1b[32m${pass}\x1b[0m, Fail: \x1b[31m${fail}\x1b[0m`);
  if (fail > 0) {
    console.log('\nFailed tests:');
    all.filter(r => !r.ok).forEach(r => console.log(`  - ${r.name}: ${r.error}`));
  }
}

main();
