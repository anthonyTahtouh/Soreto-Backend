var express = require('express');
var router = express.Router();
var config = require('../../config/config');
var authService = require ('../../services/auth');
var moment = require('moment');
var identify = require('../../middleware/identify');
const _ = require('lodash');
var rolesService = require('../../services/role');
var logger = require('../../common/winstonLogging');




router.get('/client/:clientId/impersonate', identify , authService.isAuthenticated, authService.isAuthorized, function (req, res) {

  const userIdentityDetails = req.userIdentityDetails;

  let user = _.pick(userIdentityDetails,['sub','firstName','lastName','email','roles','clientId']);
  user.roles = userIdentityDetails.roles.split(',');
  user._id = userIdentityDetails.sub;
  user.ogUser = _.pick(user,['sub','firstName','lastName','email','roles','clientId']);

  rolesService.getRoles({name:'clientUser'},(err,role)=>{
    if(err){
      return logger.error(err);
    }

    user.roles = [role[0]._id]; //clientUserId
    user.clientId = req.params.clientId;

    res.cookie(config.COOKIE.KEY,
      authService.createJwt(user),
      {
        expires: moment().add(config.COOKIE.DAYS, 'days').toDate(),
        domain: config.COOKIE.DOMAIN,
        signed: true,
        httpOnly: true,
        sameSite: 'None',
        secure: config.COOKIE.SECURE
      }
    );
    return res.redirect(config.FRONT_URL);
  });
});

router.get('/unimpersonate', authService.isAuthenticated, authService.isAuthorized, identify ,function (req, res) {
  const userIdentityDetails = req.userIdentityDetails;

  if(userIdentityDetails.ogUser){
    let ogUserIdentityDetails = userIdentityDetails.ogUser;

    ogUserIdentityDetails._id = ogUserIdentityDetails.sub;

    res.cookie(
      config.COOKIE.KEY,
      authService.createJwt(ogUserIdentityDetails),
      {
        expires: moment().add(config.COOKIE.DAYS, 'days').toDate(),
        domain: config.COOKIE.DOMAIN,
        signed: true,
        httpOnly: true,
        sameSite: 'None',
        secure: config.COOKIE.SECURE
      }
    );
  }
  return res.redirect(config.FRONT_URL);
});

module.exports = router;
