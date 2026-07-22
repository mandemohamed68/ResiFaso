const fetch = require('node-fetch');

async function test() {
  const adminRes = await fetch('http://localhost:3000/api/users');
  const adminsText = await adminRes.text();
  console.log("Users:", adminsText.substring(0, 200));
}

test();
