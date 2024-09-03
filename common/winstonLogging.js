var Logger = require('r7insight_node');
const config = require('../config/config');


var errLogger = new Logger({
  token: config.ANALYTICS.LOGENTRIES.ERROR_TOKEN,
  console: config.DEPLOYMENT_ENVIROMENT === 'dev'?  true : false,
  region: 'eu'});

var logger = new Logger({
  token: config.ANALYTICS.LOGENTRIES.INFO_TOKEN,
  region: 'eu',
  console: config.DEPLOYMENT_ENVIROMENT === 'dev'?  true : false,
});

logger.error = (...args)=>{
  errLogger.log( 'err', ...args );
};

logger.warn = (...args)=>{
  logger.warning( ...args );
};

logger.streamMorgan = {
  write: function(message) {
    logger.info(message);
  },
};

module.exports = logger;