var express = require('express');
var router = express.Router();

router.use(require('./sharedUrls'));
router.use(require('./terms_and_conditions'));
router.get('/', function(req, res) {
  res.status(200).send();
});

module.exports = router;
