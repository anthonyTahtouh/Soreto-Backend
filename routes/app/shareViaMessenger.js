var express = require('express');
var router = express.Router();
var config = require('../../config/config.js');

router.get('/shareViaMessenger', function (req, res) {

  let sharingLink = req.query.url ? req.query.url : false;
  const text = req.query.text ? req.query.text : '';


  sharingLink = sharingLink.includes(config.SHARE_URL) ? sharingLink : false;  // make sure url is a soreto url


  if (!sharingLink){
    return res.status(400).json({
      code: 'email_page_attr',
      message: 'Oops something went wrong please try and share another way. requires sharing url',
      data: {}
    });
  }

  return res.render('sharing_pages/messenger',{sharingUrl:sharingLink,text:text});
});

module.exports = router;