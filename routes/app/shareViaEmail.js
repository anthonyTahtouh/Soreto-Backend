var express = require('express');
var router = express.Router();
var config = require('../../config/config.js');

router.get('/shareviaemail', function (req, res) {

  let sharingLink = req.query.url ? req.query.url : false;
  let campaignVersionId = req.query.campaignversionid ? req.query.campaignversionid : false;
  let sharerFirstname = req.query.sharerfirstname ? req.query.sharerfirstname : '';
  let text = req.query.text ? req.query.text : false;

  if (!sharingLink || !campaignVersionId || !text){
    return res.status(400).json({
      code: 'email_page_attr',
      message: 'Oops something went wrong please try and share another way. requires campaignVersionid, sharing url and text message.',
      data: {}
    });
  }


  return res.render('sharing_pages/email',
    {
      placeholderMessage: text,
      campaignVersionId:campaignVersionId,
      sharingUrl:sharingLink,
      backUrl:config.BACK_URL,
      sharerFirstname: sharerFirstname
    }
  );
});

module.exports = router;
