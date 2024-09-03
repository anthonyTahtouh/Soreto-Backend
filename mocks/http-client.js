var config = require('../config/config');

module.exports = config.ENV === 'test' ? require('./http-client.mock') : require('superagent');