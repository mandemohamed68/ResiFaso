const jwt = require('jsonwebtoken');
const token = jwt.sign({ uid: 'admin_123', role: 'admin' }, process.env.JWT_SECRET || 'super-secret-key-change-me');
const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/settings/global',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  }
}, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log(body));
});
req.write(JSON.stringify({
  platformName: 'ResiFaso'
}));
req.end();
