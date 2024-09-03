var config = require('../config/config');
var authService = require('../services/auth');
var moment = require('moment');
var uuid = require('uuid');
var uaParser = require('ua-parser-js');

module.exports = function(req , res , next){

  var userAgent = uaParser(req.headers['user-agent']);

  var reverbToken = req.signedCookies[config.COOKIE.KEY];
  var reverbAnalytics =  req.cookies[config.ANALYTICS.COOKIE.KEY];
  var identity = {};

  /*
    Gather up user details such as browser , IP etc
   */
  identity.properties = {};
  identity.properties['$referring_domain'] = req.headers.referer;
  identity.properties['$browser'] = userAgent.browser.name;
  identity.properties['$os'] = userAgent.cpu.architecture;
  identity.properties['ip'] =  req.ip;
  reverbAnalytics ? identity.properties['reverb_analytics_id'] = reverbAnalytics : false;

  /*
    If a user is logged in (reverbToken) we set the distinct_id to the user's id.
    else if the analytics cookie is set (reverbAnalytics) we set the distinct_id to the analytics cookie
    else we created the analytics cookie and set the distinct_id as the analytics cookie
   */

  if (reverbToken) {
    var user = authService.decodeJwt(reverbToken);
    req.userIdentityDetails = user;
    identity.properties.distinct_id = user.sub;
  } else if (reverbAnalytics) {
    identity.properties.distinct_id = reverbAnalytics;
  }
  else {

    identity.properties.distinct_id = uuid.v4();
    res.cookie(config.ANALYTICS.COOKIE.KEY, identity.properties.distinct_id,
      {
        expires: moment().add(config.ANALYTICS.COOKIE.YEARS, 'years').toDate(),
        domain: config.COOKIE.DOMAIN,
        httpOnly: false,
        signed: false,
        sameSite: 'None',
        secure: config.COOKIE.SECURE
      });
  }

  req.identity = identity; //attach identity to request to be used later
  next();
};