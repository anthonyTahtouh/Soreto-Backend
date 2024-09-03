const config = require('../../../config/config');
require('mailin-api-node-js');
var logger = require('../../../common/winstonLogging');

const {find} = require('lodash');

module.exports = {
  sendinblue: function(externalTemplateId, emails, emailAttributes){
    if(typeof emails === 'string'){
      emails = [emails];
    }
    return new Promise((resolve,reject)=>{
      const client = new Mailin(config.MAIL.API_URL, config.MAIL.API_KEY ,5000);
      const sendEmail = (email)=>{

        var data = {
          'id': externalTemplateId,
          'to': email,
          'attr': emailAttributes,
          'headers': {'Content-Type': 'text/html;charset=iso-8859-1'}
        };

        return new Promise((resolve)=>{
          client.send_transactional_template(data).on('fail', function (data) {
            logger.error('MAIL FAIL: %s', data);
            return resolve({'success':false}); // set mail to not reject and break the promise all functionality, EG. Promise.when behaviour
          }).on('error', function (data) {
            logger.error('MAIL ERROR: %s', data); //log data but don't pass it on to user as we don't know what it may contain, ids ect.
            return  resolve({'success':false});
          }).on('timeout', function (data) {
            logger.error('MAIL TIMEOUT: %s', data);
            return  resolve({'success':false});
          }).on('complete', function() {
            return  resolve({'success':true});
          });
        });
      };

      var actions = emails.map(sendEmail);

      Promise.all(actions).then((responses)=>{
        if(find(responses,{'success':true})){
          return  resolve({'success':true}); // if one passes mark as success.
        }
        reject(responses);
      });
    });
  }
};
