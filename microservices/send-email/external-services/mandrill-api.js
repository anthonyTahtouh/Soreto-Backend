const mandrillApi = require('mandrill-api/mandrill');
const { MAIL, DEPLOYMENT_ENVIROMENT, BACK_URL } = require('../../../config/config');
var logger = require('../../../common/winstonLogging');
var moment = require('moment');

class MandrillApi {

  constructor(){
  }

  send(data) {
    var mandrill_client = new mandrillApi.Mandrill(MAIL.MANDRILL_API_KEY);
    var template_name = data.templateName;

    if (DEPLOYMENT_ENVIROMENT != 'prod') {
      if (MAIL.TEST_EMAIL){
        data.toEmail = MAIL.TEST_EMAIL;
      }else{
        logger.error('TEST_EMAIL missing on not live enviroment');
        return Promise.reject(new Error('TEST_EMAIL missing on not live enviroment'));
      }
    }
    var template_content = [{}];

    if(data.templateContent){
      template_content = data.templateContent;
    }

    var message = {
      'subject': data.subject,
      'from_email': data.fromEmail ? data.fromEmail : 'info@soreto.com',
      'from_name': data.fromName ? data.fromName : 'Soreto',
      'to': [{
        'email': data.toEmail,
        'name': data.userFirstname,
        'type': 'to'
      }],
      'headers': {
        'Reply-To': data.replyTo || 'info@soreto.com'
      },
      'merge_vars': [
        {
          'rcpt': data.toEmail,
          'vars': [
            {
              'name': 'USERFIRSTNAME',
              'content': data.userFirstname
            },
            {
              'name': 'BACKURL',
              'content': BACK_URL
            },
            {
              'name': 'HEADLINE',
              'content': data.headline
            },
            {
              'name': 'CLIENTNAME',
              'content': data.clientName
            },
            {
              'name': 'BODY',
              'content': data.body
            },
            {
              'name': 'SORETOLINK',
              'content': data.soretoLink
            },
            {
              'name': 'SHARERFIRSTNAME',
              'content': data.sharerFirstname
            },
            {
              'name': 'RESETURL',
              'content': data.RESETURL
            },
            {
              'name': 'FIRSTNAME',
              'content': data.userFirstname
            },
            {
              'name': 'SHAREDURL',
              'content': data.sharedUrl
            },
            {
              'name': 'PERSONALSHAREDURL',
              'content': data.personalSharedUrl
            },
            {
              'name': 'REWARDTARGET',
              'content': data.rewardTarget
            },
            {
              'name': 'CAMPAIGNVERSIONID',
              'content': data.campaignVersionId
            }
          ]
        }
      ],
    };

    if(data.cc){
      message.bcc_address = data.cc;
    }

    if (data.merge_vars){
      message.merge_vars[0].vars = message.merge_vars[0].vars.concat(data.merge_vars);
    }

    // merge new set os variables
    // notice that it improves a bit the way where variable are set into 'merge_vars'
    if(data.variables){

      for(let variable in data.variables){

        let alreadyOnList = message.merge_vars[0].vars.find(v => v.name == variable.toUpperCase());

        if(!alreadyOnList){
          message.merge_vars[0].vars.push({
            name : variable.toUpperCase(),
            content : data.variables[variable]
          });
        }
      }
    }

    // pre render internal variables
    // replace prop values into prop values
    for(let varItem of message.merge_vars[0].vars){

      if(!varItem.content){
        continue;
      }

      try{

        // does it has the Mandrill var variable pattern?
        if(varItem.content.includes && varItem.content.includes('*|') && varItem.content.includes('|*')){

          let variableName = varItem.content.substring(
            varItem.content.lastIndexOf('*|') + 2,
            varItem.content.lastIndexOf('|*')
          );

          let reference = message.merge_vars[0].vars.find(v => v.name == variableName && v.content);

          if(reference){
            varItem.content = varItem.content.replace(`*|${variableName}|*`, reference.content);
          }
        }

      }catch(err){
        logger.error(`Error pre-replacing Mandrill variables: ${err}`);
      }
    }

    var async = false;
    var delay = data.delay ? data.delay : 0;
    var send_at = moment().utc().add(delay, 'minutes').format('YYYY-MM-DD HH:mm:ss');

    return new Promise((resolve, reject) => {
      mandrill_client.messages.sendTemplate({'template_name': template_name, 'template_content': template_content, 'message': message, 'async': async, 'send_at': send_at }, function(result) {
        logger.info(result);
        resolve(result);
      }, function(err) {
        logger.error('A mandrill error occurred: ' + err.name + ' - ' + err.message);
        reject(err);
      });
    });
  }
}

module.exports = new MandrillApi();
