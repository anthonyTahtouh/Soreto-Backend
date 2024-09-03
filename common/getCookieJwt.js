var config = require('../config/config');

function getCookieJwt (req, res, next) {
  // If a JWT cookie is sent, and the authorization header is not set, attach an Authorization header
  if (req.url.indexOf('/auth/login') === -1 && !req.headers.authorization && req.signedCookies && req.signedCookies[config.COOKIE.KEY]) {
    req.headers.authorization = 'Bearer ' + req.signedCookies[config.COOKIE.KEY];
  }

  return next();
}

module.exports = getCookieJwt;