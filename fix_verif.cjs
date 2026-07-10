const fs = require('fs');
const p = 'src/components/booking/BookingVerificationSection.tsx';
let txt = fs.readFileSync(p, 'utf8');

txt = txt.replace(
  /"bg-green-50 border-green-200 text-green-800"/,
  '"bg-green-50 border-green-200 text-green-800 cursor-default"'
);
txt = txt.replace(
  /"bg-amber-50 border-amber-200 text-amber-800 animate-\\[blink_2s_infinite\\]"/,
  '"bg-amber-50 border-amber-200 text-amber-800 animate-[blink_2s_infinite] hover:bg-amber-100 cursor-pointer"'
);

fs.writeFileSync(p, txt);
