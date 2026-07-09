const jwt = require('jsonwebtoken');
const token = jwt.sign({ uid: 'admin_123', role: 'admin' }, process.env.JWT_SECRET || 'super-secret-key-change-me');
const http = require('http');

// Make a large string for image_url
const largeString = 'data:image/jpeg;base64,' + 'A'.repeat(70000);

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
  id: 'ad_1235',
  imageUrl: largeString,
  title: 'Test Ad Large',
  description: 'Test ad large description',
  linkUrl: 'http://example.com',
  isActive: true,
  frequencySeconds: 10,
  startAt: null,
  endAt: null
}));
req.end();
