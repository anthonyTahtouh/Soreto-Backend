var express = require('express');
var router = express.Router();

router.use(require('./analytics'));
router.use(require('./oauth2'));
router.use(require('./login'));
router.use(require('./register'));
router.use(require('./sharedUrls'));
router.use(require('./socialConnect'));
router.use(require('./tracking'));
router.use(require('./shareViaEmail'));
router.use(require('./shareViaMessenger'));
router.use(require('./shareViaViber'));
router.use(require('./shareViaWhatsapp'));
router.use(require('./placement'));
router.use(require('./debugPage'));
router.use(require('./users'));
router.use(require('./optout'));
router.use(require('./marketPlace'));
router.use(require('./shopifyApp'));
router.get('/', function(req, res) {
  res.status(200).send();
});

module.exports = router;
