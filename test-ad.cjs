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
  id: 'ad_123',
  title: 'Test',
  description: 'Test ad',
  image_url: 'http://example.com/img.jpg',
  link_url: 'http://example.com',
  is_active: true,
  frequency_seconds: 10,
  start_at: null,
  end_at: null
}));
req.end();
