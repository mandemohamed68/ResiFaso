const fs = require('fs');
const p = 'src/components/booking/BookingVerificationSection.tsx';
let txt = fs.readFileSync(p, 'utf8');

txt = txt.replace(
  '"bg-amber-50 border-amber-200 text-amber-800 animate-[blink_2s_infinite]"',
  '"bg-amber-50 border-amber-200 text-amber-800 animate-[blink_2s_infinite] cursor-pointer hover:bg-amber-100"'
);

txt = txt.replace(
  /"bg-red-50 border-red-100 text-red-700"/,
  '"bg-red-50 border-red-100 text-red-700 cursor-not-allowed"'
);

fs.writeFileSync(p, txt);
