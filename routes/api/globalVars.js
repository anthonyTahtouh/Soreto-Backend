const express = require('express');
const router = express.Router();
const authService = require('../../services/auth');
const varService = require('../../services/sharedServices/globalVars');

router.get('/globalvars', function(req, res){
  if(!req.query.context){
    return res.status(500).send('"Context" parameter must be informed');
  }else if(!req.query.objectId){
    return res.status(500).send('"ObjectId" parameter must be informed');
  }

  let clientId = req.query.clientId ? req.query.clientId : null;

  varService.getClientSettings(req.query.context, clientId, req.query.objectId)
    .then((result) => {
      return res.status(200).send(result);
    })
    .catch((error) => {
      return res.status(500).send(error);
    });

});

//router.post('/globalvars', function (req, res) {
router.post('/globalvars', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // param validation
  if(!req.body.globalVars || req.body.globalVars.length == 0){
    return res.status(200).send();
  }

  // persist
  varService.updateSettings(req.body.globalVars)
    .then(() => {
      return res.status(200).send({});
    })
    .catch((error) => {
      return res.status(500).send(error);
    });

});

module.exports = router;


