var pg = require('pg');
var config = require('./config/config');

if (config.ENV === 'prod') {
  pg.defaults.ssl = true;
}

var BigNumber = require('bignumber.js');
// Converts numeric to float type on query.

var toBigNumber = function (val) {
  return new BigNumber(val);
};

pg.types.setTypeParser(1700, 'text', toBigNumber);
pg.types.setTypeParser(20, 'text', parseInt);

var conn = require('knex')({
  client: 'postgresql',
  connection: {
    connectionString: config.DB_URI,
    ssl: config.ENV === 'dev' || config.ENV === 'test' ? undefined : { rejectUnauthorized: false },
    application_name: 'reverb'
  },
  searchPath: 'reverb',
  debug: false
});

module.exports = conn;