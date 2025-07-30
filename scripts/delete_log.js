const path = require('path');
const fs = require('fs');

const filePath = path.resolve(__dirname, '..', 'node_modules/@huaweicloud/huaweicloud-sdk-core/http/DefaultHttpClient.js');

const content = fs.readFileSync(filePath, 'utf-8');

const newCntent = content.replace("this._logger.error('Some error found:', exceptionResponse);", '');

fs.writeFileSync(filePath, newCntent);
