var express = require('express');
var router = express.Router();

router.get('/test/featured', function (req, res) {
  return res.status(200).json(['payloadss']);
});


module.exports = router;