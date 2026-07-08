const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

serverCode = serverCode.replace(/adminDb = \(\(\)=>\{\}\)\(dbId\);/g, 'adminDb = ({} as any);');
serverCode = serverCode.replace(/db = getFirestore\(\(\(\)=>\{\}\)\(app\), dbId\);/g, 'db = ({} as any);');
serverCode = serverCode.replace(/\(\(\)=>\{\}\)\(\{\n          projectId: config\.projectId,\n        \}\);/g, '');

fs.writeFileSync('server.ts', serverCode);

