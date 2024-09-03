const express = require('express');
const router = express.Router();
const {pick} = require('lodash');
const {sendSimpleMail} = require('../../services/externalServices/sendEmail');
const rateLimit = require('express-rate-limit');

/*
|--------------------------------------------------------------------------
| Forward to email endpoint
|--------------------------------------------------------------------------
*/


const createAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5, // start blocking after 5 requests
  message: 'Too many messages sent from this IP, please try again after an hour'
});

router.post('/forwardToEmail', createAccountLimiter,function (req, res) {

  const messageObj = pick(req.body,[
    'name',
    'lastName',
    'company',
    'telephone',
    'email',
    'message',
    'origin',
  ]);

  const message = `This message was sent from the soreto.com form: 
    ${JSON.stringify(messageObj, null, 2)}`;

  let to = messageObj.origin === 'MARKETPLACE' ? 'marketplace@soreto.com' : 'hello@soreto.com';
  let subject = messageObj.origin === 'MARKETPLACE' ? `Form submitted: We've received your message` : 'Business form contact';
  let replyTo = messageObj.email;

  let cc = null;
  let templateName = null;
  let variables = null;

  if(messageObj.origin === 'MARKETPLACE'){
    cc = messageObj.email;
    templateName = 'marketplace_contact_us_autoresponder';

    variables = {
      EMAIL:messageObj.email,
      NAME: messageObj.name,
      TELEPHONE: messageObj.telephone,
      MESSAGE: messageObj.message
    };
  }

  sendSimpleMail(to, replyTo, subject, message, variables, cc, templateName)
    .then((response)=>{
      res.status(200).send(response);
    });
});



module.exports = router;
