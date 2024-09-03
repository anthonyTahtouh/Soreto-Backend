var clientService = require('../services/client');

/*
 |--------------------------------------------------------------------------
 | Middleware to restrict client user auto-enrol
 |--------------------------------------------------------------------------
 */

// Checks permission to auto-enrol users on platform
// Statically restricted to Nobody's Child test account during development
function restrictClient (req, res, next) {
  var clientId = req.user;
  var approved = ['admin@nb.com'];

  clientService.getClient(clientId, function (err, client) {
    if (err) {
      res.status(400).json({
        code: 'ERR_CLIENT_NOTFOUND',
        message: 'Client/retailer record was not able to be located.',
        data: {}
      });
    }

    if (client && approved.indexOf(client.email) > -1) {
      next();
    } else {
      res.status(403).json({
        code: 'ERR_CLIENT_NOTFOUND',
        message: 'Client/retailer is not approved for auto-enrolment.',
        data: {}
      });
    }
  });
}

module.exports = restrictClient;