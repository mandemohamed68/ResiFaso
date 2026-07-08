const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

// fix TS2554: Expected 0 arguments, but got 1
serverCode = serverCode.replace(/getFirestore\(\(\(\)=>\{\}\)\(app\), /g, 'getFirestore(');
serverCode = serverCode.replace(/getAuth\(\(\(\)=>\{\}\)\(app\)\)/g, 'getAuth()');
serverCode = serverCode.replace(/const app = \(\(\)=>\{\}\)\(firebaseConfig\);/g, '');
serverCode = serverCode.replace(/\(firebaseConfig as any\)\.firestoreDatabaseId/g, '');

fs.writeFileSync('server.ts', serverCode);

let myBookings = fs.readFileSync('src/components/booking/MyBookings.tsx', 'utf8');
myBookings = myBookings.replace(/hostSettings\.hostCancellationFee/g, "(hostSettings as any).hostCancellationFee");
myBookings = myBookings.replace(/hostSettings\.hostCancellationRulesText/g, "(hostSettings as any).hostCancellationRulesText");
fs.writeFileSync('src/components/booking/MyBookings.tsx', myBookings);
