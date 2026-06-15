const fs = require('fs');

const files = [
  'src/components/booking/OwnerDashboard.tsx',
  'src/components/booking/MyBookings.tsx',
  'src/components/admin/AdminDashboard.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/formatCurrency\(([^)]*?)\?\)/g, "formatCurrency($1)");
  fs.writeFileSync(file, content);
});
console.log("Fixed ? issues.");
