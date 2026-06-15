const fs = require('fs');
let content = fs.readFileSync('src/components/booking/OwnerDashboard.tsx', 'utf8');

content = content.replace(/selectedBookingForDetails\.formatCurrency\(([^|]+)(?:[^)]+)\)+\)/g, "formatCurrency($1)");
content = content.replace(/0\.formatCurrency\(9\),\(\( 0\) \|\| 0\)\)/g, "0.9), 0))"); // wait, `reduce... => acc + (curr.totalPrice * 0.9), 0)`
content = content.replace(/0\.formatCurrency\(1\),\(\( 0\) \|\| 0\)\)/g, "0.1), 0))");
content = content.replace(/w\.formatCurrency\(amount,\(\( 0\)\) \|\| 0\)/g, "w.amount, 0");
content = content.replace(/Math\.formatCurrency\(max\(0,\(\( ([^)]+) \|\| 0\)\)\)/g, "formatCurrency(Math.max(0, $1))");

fs.writeFileSync('src/components/booking/OwnerDashboard.tsx', content);
