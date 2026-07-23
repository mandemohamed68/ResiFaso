async function run() {
  const res = await fetch('https://api.prod.sappay.net/api/checkout/perform/', {
    method: 'POST',
    body: '{}',
    headers: { 'Content-Type': 'application/json' }
  });
  console.log(res.status);
  console.log(await res.text());
}
run();
