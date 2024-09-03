var express = require('express');
var router = express.Router();

router.get('/shareViaViber', function (req, res) {

  const text = req.query.text ? req.query.text : '';
  const url = req.query.url ? req.query.url : '';

  return res.render('sharing_pages/viber',{text, url});
});

module.exports = router;