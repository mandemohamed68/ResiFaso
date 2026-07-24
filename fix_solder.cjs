const fs = require('fs');
let content = fs.readFileSync('src/components/booking/OwnerDashboard.tsx', 'utf8');

content = content.replace(
  /\`Tout solder \(\$\{formatCurrency\(b.totalPrice\)\} F\)\`/g,
  "`Confirmer Paiement Total (${formatCurrency(b.totalPrice)} F)`"
);

fs.writeFileSync('src/components/booking/OwnerDashboard.tsx', content, 'utf8');
console.log("Fixed solder in OwnerDashboard");
