const { copyFileSync } = require('fs');
const path = require('path');
copyFileSync(path.join(__dirname, 'app.js'), path.join(__dirname, '../dist/app.js'));