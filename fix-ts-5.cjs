const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

serverCode = serverCode.replace(/\(\(\)=>\{\}\)\(\{\n          projectId: config\.projectId,\n        \}\);/g, '');
serverCode = serverCode.replace(/\(\(\)=>\{\}\)\(\{\n          projectId: config\.projectId,\n        \}\);/g, '');
serverCode = serverCode.replace(/      if \(apps\.length === 0\) \{\n        \(\(\)=>\{\}\)\(\{\n          projectId: config.projectId,\n        \}\);\n      \}/g, '');
serverCode = serverCode.replace(/adminDb = \(\(\)=>\{\}\)\(dbId\);/g, 'adminDb = ({} as any);');
serverCode = serverCode.replace(/db = getFirestore\(\(\(\)=>\{\}\)\(app\), dbId\);/g, 'db = ({} as any);');

fs.writeFileSync('server.ts', serverCode);

