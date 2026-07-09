const jwt = require('jsonwebtoken');
const token = jwt.sign({ uid: 'admin_123', role: 'admin' }, process.env.JWT_SECRET || 'super-secret-key-change-me');
const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/ads',
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
  id: 'ad_1234',
  imageUrl: 'http://example.com/img3.jpg',
  title: 'Test Undefined',
  linkUrl: '',
  isActive: true,
  frequencySeconds: 10,
  startAt: null,
  endAt: null,
  createdAt: new Date().toISOString()
}));
req.end();
