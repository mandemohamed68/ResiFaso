import fs from 'fs';
let content = fs.readFileSync('src/db/queries.ts', 'utf8');

const target2 = `    occupiedDates: bookings
      .filter((b: any) => (b.checkOut || b.check_out) >= new Date().toISOString().split('T')[0])
      .map((b: any) => ({ from: b.checkIn || b.check_in, to: b.checkOut || b.check_out })),`;

const replacement2 = `    occupiedDates: bookings
      .map((b: any) => {
        let co = b.checkOut || b.check_out;
        let ci = b.checkIn || b.check_in;
        if (co instanceof Date) co = co.toISOString();
        if (ci instanceof Date) ci = ci.toISOString();
        return { from: String(ci).split('T')[0], to: String(co).split('T')[0] };
      })
      .filter((b: any) => b.to >= new Date().toISOString().split('T')[0]),`;

content = content.replace(target2, replacement2);
fs.writeFileSync('src/db/queries.ts', content);
