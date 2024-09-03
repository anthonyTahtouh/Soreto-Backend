var express = require('express');
var router = express.Router();
const cookieHandler = require('../../common/cookieHandler');

router.get('/test/cookies', cookieHandler.start, function (req, res) {
  var payload = {};
  payload.cookies = req.cookieHandler.all.get();
  payload.ip = req.ip;
  payload.ua = req.headers['user-agent'];
  payload.req = req;
  return res.status(200).json(payload);
});




module.exports = router;
