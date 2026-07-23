import { executeSql } from './src/db/index.js';
async function test() {
  const res = await executeSql("SELECT value FROM settings WHERE key = 'global'");
  console.log(res);
}
test();
