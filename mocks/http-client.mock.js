var httpMockConfig = require('../config/httpMockConfig');
var request = require('superagent');

//Changes request with mock functionality.
require('superagent-mock')(request, httpMockConfig);

module.exports = request;