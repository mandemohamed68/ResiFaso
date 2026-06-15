const fs = require('fs');

const files = [
  'src/components/search/MapView.tsx',
  'src/components/booking/OwnerDashboard.tsx',
  'src/components/booking/MyBookings.tsx',
  'src/components/booking/InvoiceModal.tsx',
  'src/components/admin/AdminDashboard.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/import \{ formatCurrency \} from '\.\.\/\.\.\/\.\.\/\.\.\/utils\/currency';/g, "import { formatCurrency } from '../../utils/currency';");
  fs.writeFileSync(file, content);
});
console.log("Fixed imports");
