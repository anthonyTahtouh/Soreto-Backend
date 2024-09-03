const express = require('express');
const router = express.Router();
const parser = require('ua-parser-js');
const _ = require('lodash');
const config = require('../../config/config.js');


router.route('/whatsapp')
  .get(function (req, res) {
    let text = _.get(req,'query.text');
    return res.redirect(config.BACK_URL + '/shareViaWhatsapp?text='+encodeURIComponent(text) );
  });

router.get('/shareViaWhatsapp', function (req, res) {
  const text = req.query.text;
  if (!text){
    return res.status(400).json({
      code: 'email_page_attr',
      message: 'Oops something went wrong please try and share another way. requires sharing text',
      data: {}
    });
  }

  const ua = parser(req.headers['user-agent']);
  let windowsOs = _.get(ua,'os.name') === 'Windows';
  let desktop = null;
  switch(_.get(ua,'device.type')) {
  case 'tablet':
  case 'mobile':
    desktop = false;
    break;
  default:
    desktop = true;
  }

  const textEncoded = encodeURIComponent(text);

  return res.render('sharing_pages/whatsapp',{text:text, textEncoded:textEncoded, desktop: desktop, windowsOs: windowsOs });
});

module.exports = router;