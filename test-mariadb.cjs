require('dotenv').config();
const { executeSql } = require('./dist/server.cjs').__mariadb || {}; // this won't work
