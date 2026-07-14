import fs from 'fs';
let content = fs.readFileSync('src/db/queries.ts', 'utf8');

const target1 = `  activeBookings.forEach((b: any) => {
    const resId = b.residence_id || b.residenceId;
    const checkOut = b.checkOut || b.check_out;
    if (checkOut >= todayStr) {
      if (!bookingsMap[resId]) bookingsMap[resId] = [];
      bookingsMap[resId].push({ from: b.checkIn || b.check_in, to: checkOut });
    }
  });`;

const replacement1 = `  activeBookings.forEach((b: any) => {
    const resId = b.residence_id || b.residenceId;
    let checkOut = b.checkOut || b.check_out;
    let checkIn = b.checkIn || b.check_in;
    
    if (checkOut instanceof Date) checkOut = checkOut.toISOString();
    if (checkIn instanceof Date) checkIn = checkIn.toISOString();
    
    checkOut = String(checkOut).split('T')[0];
    checkIn = String(checkIn).split('T')[0];
    
    if (checkOut >= todayStr) {
      if (!bookingsMap[resId]) bookingsMap[resId] = [];
      bookingsMap[resId].push({ from: checkIn, to: checkOut });
    }
  });`;

content = content.replace(target1, replacement1);
fs.writeFileSync('src/db/queries.ts', content);
