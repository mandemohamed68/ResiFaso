const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

// replace the dummy (()=>({}))({ projectId: config.projectId }) with just {}
serverCode = serverCode.replace(/\(\(\)=>\{\}\)\(\{[\s\S]*?\}\);/g, '{} as any;');
serverCode = serverCode.replace(/\(\(\)=>\{\}\)\([^)]+\);/g, '{} as any;');
serverCode = serverCode.replace(/await \(\(\)=>\{\}\)\(\)\.generatePasswordResetLink\(email\)/g, '"" as any;');

fs.writeFileSync('server.ts', serverCode);

let myBookings = fs.readFileSync('src/components/booking/MyBookings.tsx', 'utf8');
myBookings = myBookings.replace(/const data = hostDoc\.data\(\);/g, 'const data: any = hostDoc.data();');
fs.writeFileSync('src/components/booking/MyBookings.tsx', myBookings);

