var express = require('express');
var ID = require('mongo-testid');
var router = express.Router();
var config = require('../../config/config.js');
const cookieHandler = require('../../common/cookieHandler');

router.get('/index', cookieHandler.start,
  function (req, res) {

    var clientId = '574f267cb7456442581f5e1d';
    var userId = ID('user123');
    var shareId = ID('share123');

    req.cookieHandler.sharerUserIds.set(clientId, userId, true, config.COOKIE.DAYS * 1440);
    req.cookieHandler.sharedUrlAccessIds.set(clientId, shareId, true, config.COOKIE.DAYS * 1440);

    res.sendFile('/example/index.html', {root: '.'});
  });

module.exports = router;
