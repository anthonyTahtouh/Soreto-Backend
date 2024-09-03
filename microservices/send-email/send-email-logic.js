const constants = require('../../config/constants');
const bussinessConstants = require('../../common/constants');
const { sendinblue } = require('./external-services/sendinblue-api');

const mandrillApi = require('./external-services/mandrill-api');
const config = require('../../config/config');
var logger = require('../../common/winstonLogging');
var _ = require('lodash');

const varService = require('../../services/sharedServices/globalVars');
const emailQueueService = require('../../services/emailQueue');
const EmailQueueService = new emailQueueService();

function sendEmail(context, data, emailTemplateFilter, type){
  emailTemplateFilter.type = type;

  var delay = data.delay;

  context.act(_.extend(constants.EVENTS.RETRIEVE_EMAIL_TEMPLATE,{data: emailTemplateFilter}
  ) , (err,result) => {

    if (err || !result.success) {
      err && logger.warn('Failed to retrive email properties: %s', err);
      !result.success && logger.warn('Retrieving email properties was not successfull');
      return;
    }

    let sharedUrl = data.sharedUrl;

    const urlTypes = {
      share_with_friend_email_reminder:data.sharedUrl,
      reward_email:data.personalUrl
    };

    if (data.personalUrl){
      sharedUrl = urlTypes[type];
    }

    var emailTemplateProperties = result.data[0]; //take the first email template

    //SENDINBLUE is deprecated.
    if(emailTemplateProperties.externalServiceName === 'SENDINBLUE') {
      let emailAttributes = emailTemplateProperties.templateValues;
      emailAttributes.SORETOLINK = sharedUrl;
      emailAttributes.USERFIRSTNAME = data.user.firstName ? data.user.firstName : 'Hey you';
      emailAttributes.CLIENTNAME = data.client.name;

      sendinblue(emailTemplateProperties.externalTemplateId,data.user.email,emailAttributes)
        .catch((()=>{
          logger.error('SENDINBLUE, success: false, message: mail servers failed to send all emails');
        }));
    } else if(emailTemplateProperties.externalServiceName === 'MANDRILL') {

      var emailData = {};

      let emailAttributes = emailTemplateProperties.templateValues;

      emailData.templateName = emailTemplateProperties.externalTemplateId;
      emailData.userFirstname = data.user.firstName ? data.user.firstName : 'Hey you';
      emailData.body = emailAttributes.BODY;
      emailData.soretoLink = sharedUrl;


      emailData.merge_vars = { name: 'CLIENTID', content: data.client._id};
      emailData.toEmail = data.user.email;
      emailData.subject = emailAttributes.HEADLINE;
      emailData.headline = emailAttributes.HEADLINE;
      emailData.clientName = data.client.name;
      emailData.headerImage = emailAttributes.HEADERIMAGE;
      emailData.fromEmail = emailAttributes.CLIENTEMAIL;
      emailData.fromName = emailAttributes.FROMNAME;
      emailData.campaignVersionId = data.campaignVersionId;

      emailAttributes.TESTMODE = data.testMode;

      // add all the atributes into 'variables'
      emailData.variables = {};

      for(let att in emailAttributes){

        emailData.variables[att] = emailAttributes[att];
      }

      //Added both link on both emails, as some template will have a share again feature on the thank you email.
      //We will control which link to use on the email template, also we will maintain the soretoLink for backwards compatibility
      emailData.sharedUrl = data.sharedUrl;
      emailData.personalSharedUrl = data.personalSharedUrl;

      if(delay){
        emailData.delay = delay;
      }
      else {
        emailData.delay = 0;
      }

      if(data.useSoretoEmailQueue){
        // TODO: ask the crew about the object owner id

        // changing the mandrill delay in minutes to seconds
        let mandrillDelay = (emailData.delay * 60);
        let objectId = null;

        if(type == bussinessConstants.EMAIL_TEMPLATE_TYPES.REWARD_EMAIL){
          objectId = data.personalUrlId;
        }else if(type == bussinessConstants.EMAIL_TEMPLATE_TYPES.SHARE_WITH_FRIEND_EMAIL_REMINDER){
          objectId = data.sharedUrlId;
        }

        EmailQueueService.add('MANDRILL', type, mandrillDelay, emailData, objectId)
          .catch((error) => {
            logger.error('Error queueing email on Soreto queue.', error);
          });
      }else {
        mandrillApi.send(emailData)
          .catch(()=>{
            logger.error('MANDRILL, success: false, message: mail servers failed to send all emails');
          });
      }
    }
  });
}

module.exports = {
  sendSimpleMailListener: function(context){
    context.add(constants.EVENTS.SEND_SIMPLE_EMAIL,(msg, respond) => {
      var data = msg.data;

      var emailData = {};
      emailData.templateName = data.templateName || 'from-web-page';
      emailData.toEmail = data.to;
      emailData.replyTo = data.replyTo;
      emailData.subject = data.subject;
      emailData.body = data.message;
      emailData.cc = data.cc;
      emailData.variables = data.variables;

      mandrillApi.send(emailData)
        .then(()=>{
          respond(null, {'success':true});
        })
        .catch(((err)=>{
          logger.error('MANDRILL, success: false, message: mail servers failed to send all emails'+ err);
          respond(null, {'success':false});
        }));
    });
  },
  sendTemplateMailListener: function(context) {
    context.add(constants.EVENTS.SEND_TEMPLATE_EMAIL,(msg, respond) => {
      const data = msg.data;
      let emailTemplateFilter = {'type':data.type};

      if(data.campaignId){
        emailTemplateFilter.campaignId = data.campaignId;
      }

      if(data.campaignVersionId){
        emailTemplateFilter.campaignVersionId = data.campaignVersionId;
      }

      context.act(_.extend(constants.EVENTS.RETRIEVE_EMAIL_TEMPLATE,
        {data: emailTemplateFilter}
      ) , (err,result) => {
        if (err) {
          logger.warn('Failed to retrive email properties: %s', err);
          return;
        }
        if(!result.success){
          logger.warn('Failed to retrive email properties with template filter: %s' + JSON.stringify(emailTemplateFilter));
          return respond(null,
            {
              'success':false,
              'err':'template not found '+ JSON.stringify(emailTemplateFilter),
              'templateFilter':emailTemplateFilter
            });
        }

        var emailTemplateProperties = result.data[0]; //take the first email template
        if(emailTemplateProperties.externalServiceName === 'MANDRILL') {
          let emailAttributes = {};

          emailAttributes.templateName = emailTemplateProperties.externalTemplateId;
          emailAttributes.toEmail = data.to;
          emailAttributes.headline = data.emailAttributes.HEADLINE || emailTemplateProperties.templateValues.HEADLINE;
          emailAttributes.body = emailTemplateProperties.templateValues  && emailTemplateProperties.templateValues.BODY;
          emailAttributes.clientName = emailTemplateProperties.templateValues && emailTemplateProperties.templateValues.CLIENTNAME;
          emailAttributes.soretoLink = data.emailAttributes.SORETOLINK;
          emailAttributes.sharerFirstname = data.emailAttributes.SHARERFIRSTNAME;
          emailAttributes.fromEmail = emailTemplateProperties.templateValues && emailTemplateProperties.templateValues.CLIENTEMAIL;
          emailAttributes.fromName = emailTemplateProperties.templateValues && emailTemplateProperties.templateValues.FROMNAME;

          let mergedEmailAttributes = _.merge(emailAttributes, emailTemplateProperties.templateValues, data.emailAttributes);

          mergedEmailAttributes = _.pickBy(mergedEmailAttributes, _.identity); // remove keys with undefined

          const upperCaseEmailAttributes = _.mapKeys(mergedEmailAttributes, function (v, k) { return k.toUpperCase(); });
          mergedEmailAttributes.merge_vars = Object.entries(upperCaseEmailAttributes).map(([name, content]) => ({name,content}));
          mergedEmailAttributes.templateContent = mergedEmailAttributes.merge_vars;
          mergedEmailAttributes.subject = mergedEmailAttributes.SUBJECT || emailAttributes.headline;
          mandrillApi.send(mergedEmailAttributes)
            .then(()=>{
              respond(null, {'success':true});
            })
            .catch(()=>{
              logger.error('MANDRILL, success: false, message: mail servers failed to send all emails');
              respond(null, {'success':false});
            });
        } else{
          logger.error('MANDRILL, success: false, message: externalServiceName not supported');
          respond(null, {'success':false});
        }
      });
    });
  },
  sendFriendMailListener: function(context) {
    context.add(constants.EVENTS.SEND_FRIEND_EMAIL,(msg, respond) => {
      var data = msg.data;

      var emailTemplateFilter = {'type':'share_with_friend_email'};
      if(data.campaignId){
        emailTemplateFilter.campaignId = data.campaignId;
      }

      if(data.campaignVersionId){
        emailTemplateFilter.campaignVersionId = data.campaignVersionId;
      }
      context.act(_.extend(constants.EVENTS.RETRIEVE_EMAIL_TEMPLATE,
        {data: emailTemplateFilter}
      ) , (err,result) => {
        if (err || result.success === false) {
          logger.warn('Failed to retrive email properties: %s', err);
          return respond(null, {'success':false});
        }

        var emailTemplateProperties = result.data[0]; //take the first email template

        if(emailTemplateProperties.externalServiceName === 'SENDINBLUE') {

          let emailAttributes = emailTemplateProperties.templateValues;

          emailAttributes.BODY = data.emailAttributes.BODY ? data.emailAttributes.BODY : emailAttributes.BODY;
          emailAttributes.REWARD = data.emailAttributes.REWARD ? data.emailAttributes.REWARD: emailAttributes.REWARD;
          emailAttributes.CLIENTNAME = data.emailAttributes.CLIENTNAME ? data.emailAttributes.CLIENTNAME: emailAttributes.CLIENTNAME;
          emailAttributes.HEADER_IMAGE = data.emailAttributes.HEADER_IMAGE ? data.emailAttributes.HEADER_IMAGE: emailAttributes.HEADER_IMAGE;
          emailAttributes.SORETOLINK = data.emailAttributes.SORETOLINK;
          emailAttributes.SHARERFIRSTNAME = data.emailAttributes.SHARERFIRSTNAME;

          sendinblue(emailTemplateProperties.externalTemplateId,data.to,emailAttributes)
            .then(()=>{
              respond(null, {'success':true});
            })
            .catch(()=>{
              logger.error('SENDINBLUE, success: false, message: mail servers failed to send all emails');
              respond(null, {'success':false});
            });
        } else if(emailTemplateProperties.externalServiceName === 'MANDRILL') {
          let emailAttributes = emailTemplateProperties.templateValues;

          emailAttributes.templateName = emailTemplateProperties.externalTemplateId;
          emailAttributes.toEmail = data.to;
          emailAttributes.headline = emailAttributes.HEADLINE;
          emailAttributes.subject = emailAttributes.HEADLINE;
          emailAttributes.body = data.emailAttributes.BODY;
          emailAttributes.clientName = data.emailAttributes.CLIENTNAME;
          emailAttributes.soretoLink = data.emailAttributes.SORETOLINK;
          emailAttributes.sharerFirstname = data.emailAttributes.SHARERFIRSTNAME;
          emailAttributes.fromEmail = emailAttributes.CLIENTEMAIL;
          emailAttributes.fromName = emailAttributes.FROMNAME;

          mandrillApi.send(emailAttributes)
            .then(()=>{
              respond(null, {'success':true});
            })
            .catch(()=>{
              logger.error('MANDRILL, success: false, message: mail servers failed to send all emails');
              respond(null, {'success':false});
            });
        }
      });
    });
  },
  sendPostConversionDiscountMailListener: function(context) {
    context.add(constants.EVENTS.SEND_POST_PURCHASE_DISCOUNT_MAIL,(msg, respond) => {
      var data = msg.data;

      var codeAttributes = data.emailAttributes;
      var rewardTargetType = codeAttributes.rewardTarget === 'SHARER' ? 'post_purchase_discount_reward_email' : 'post_purchase_friend_reward_email';
      const emailTemplateFilter ={
        campaignVersionId:data.campaignVersionId,
        type: rewardTargetType
      };

      context.act(_.extend(constants.EVENTS.RETRIEVE_EMAIL_TEMPLATE,
        {data: emailTemplateFilter}
      ) , (err,result) => {
        if(err){
          return respond(err);
        }
        if(!result.success){
          return respond(null,
            {
              'success':false,
              'err':'template not found '+ JSON.stringify(emailTemplateFilter),
              'templateFilter':emailTemplateFilter
            });
        }

        let emailTemplateProperties = result.data[0];
        let emailAttributes = emailTemplateProperties.templateValues;

        emailAttributes = _.extend(emailAttributes,codeAttributes,{
          templateName: emailTemplateProperties.externalTemplateId,
          toEmail: data.to,
          fromEmail: emailAttributes.CLIENTEMAIL,
          fromName: emailAttributes.FROMNAME,
          headline: emailAttributes.HEADLINE,
          subject: emailAttributes.HEADLINE,
          body: data.emailAttributes.BODY,
          rewardTarget: codeAttributes.rewardTarget.toLowerCase()
        });

        const upperCaseEmailAttributes = _.mapKeys(emailAttributes, function (v, k) { return k.toUpperCase(); });
        emailAttributes.merge_vars = Object.entries(upperCaseEmailAttributes).map(([name, content]) => ({name,content}));

        if (config.MAIL.ENABLED) {
          mandrillApi.send(emailAttributes)
            .then(()=>{
              respond(null, {'success':true});
            })
            .catch((err)=>{
              console.log(err);
              logger.error(err);
              logger.error('MANDRILL, success: false, message: mail servers failed to send all emails');
              respond(null, {
                'success':false,
                'err':err
              });
            });
        }
      });

    });
  },
  sendMailListener: function(context) {
    context.add(constants.EVENTS.NEW_SHARED_URL_INFO, async(msg, respond) => {

      var data = msg.data;

      if (config.MAIL.ENABLED) {

        var emailTemplateFilter = {};
        if(data.campaignId){
          emailTemplateFilter.campaignId = data.campaignId;
        }

        if(data.campaignVersionId){
          emailTemplateFilter.campaignVersionId = data.campaignVersionId;
        }

        let testUser = config.MAIL.TEST_USER_EMAILS ? config.MAIL.TEST_USER_EMAILS.includes(data.user.email) : false;

        // take the client infra config
        data.useSoretoEmailQueue = await varService.getBooleanVar('USE_SORETO_EMAIL_QUEUE', 'CLIENT.INFRA',  data.clientId);

        if(!testUser){

          // take shared url email parameters from Global Vars
          let cpvShareEmailConfig = await varService.getVars(
            ['SHARE_EMAIL_QUOTA', 'SHARE_EMAIL_QUOTA_MINUTES_TTL', 'SHARE_EMAIL_SEND_DELAY'],
            'CAMPAIGN_VERSION.USER_JOURNEY', emailTemplateFilter.campaignVersionId);

          cpvShareEmailConfig = varService.friendlify(cpvShareEmailConfig);

          let shareEmailQuota = cpvShareEmailConfig.shareEmailQuota != undefined ? cpvShareEmailConfig.shareEmailQuota : 1;
          let minutesFromNow = cpvShareEmailConfig.shareEmailQuotaMinutesTtl != undefined ? cpvShareEmailConfig.shareEmailQuotaMinutesTtl : 10;

          data.delay = data.testMode ? 0 :
            (cpvShareEmailConfig.shareEmailSendDelay != undefined ? cpvShareEmailConfig.shareEmailSendDelay : 10);

          var retrieveSocialPostCountFilter = {
            data: {
              user: {
                _id : data.user._id
              },
              campaignVersionId: emailTemplateFilter.campaignVersionId,
              minutesFromNow
            }};

          // regular user flow
          context.act(_.extend(constants.EVENTS.RETRIEVE_SOCIAL_POST_COUNT,
            retrieveSocialPostCountFilter ), (err,result) => {

            if(result.data.socialPostsLength <= shareEmailQuota){

              sendEmail(context, data, Object.assign({}, emailTemplateFilter), bussinessConstants.EMAIL_TEMPLATE_TYPES.SHARE_WITH_FRIEND_EMAIL_REMINDER);
              sendEmail(context, data, Object.assign({}, emailTemplateFilter), bussinessConstants.EMAIL_TEMPLATE_TYPES.REWARD_EMAIL);
            }

            return respond(null, { success: true });
          });

        }else{

          // test user flow
          sendEmail(context, data, Object.assign({}, emailTemplateFilter), bussinessConstants.EMAIL_TEMPLATE_TYPES.SHARE_WITH_FRIEND_EMAIL_REMINDER);
          sendEmail(context, data, Object.assign({}, emailTemplateFilter), bussinessConstants.EMAIL_TEMPLATE_TYPES.REWARD_EMAIL);

          return respond(null, { success: true });
        }
      }
    });
  },
  sendPostRewardEmail: function(context) {

    context.add(constants.EVENTS.SEND_POST_REWARD_MAIL, (msg, respond) => {

      var { emailAttributes} = msg.data;
      var {orderPostReward, user, sharedUrl } = emailAttributes;

      var rewardTargetType = orderPostReward.orderUserRole === 'SHARER'
        ? 'post_purchase_discount_reward_email'
        : 'post_purchase_friend_reward_email';

      const emailTemplateFilter ={
        campaignVersionId: orderPostReward.campaignVersionId,
        type: rewardTargetType
      };

      // retrieve Email template configured to the Campaign Version
      context.act(_.extend(constants.EVENTS.RETRIEVE_EMAIL_TEMPLATE,
        {data: emailTemplateFilter}
      ) , (err,result) => {

        // is there an error?
        if(err){
          return respond(err);
        }

        // no success?
        if(!result.success){

          return respond(null,
            {
              success:false,
              err: `template not found ${JSON.stringify(emailTemplateFilter)}`,
              templateFilter: emailTemplateFilter
            });
        }

        // build attributes
        let emailAttributes = result.data[0].templateValues;

        emailAttributes.templateName = result.data[0].externalTemplateId;
        emailAttributes.subject = emailAttributes.HEADLINE;
        emailAttributes.toEmail = user.email;
        emailAttributes.soretoLink = config.BACK_URL + sharedUrl.shortUrl;
        emailAttributes.rewardTarget = rewardTargetType.toLowerCase();
        emailAttributes.userFirstname = user.firstName || 'Hey you';
        emailAttributes.fromEmail = emailAttributes.CLIENTEMAIL;
        emailAttributes.clientName = emailAttributes.CLIENTNAME;
        emailAttributes.fromName = emailAttributes.FROMNAME;

        const upperCaseEmailAttributes = _.mapKeys(emailAttributes, function (v, k) { return k.toUpperCase(); });
        emailAttributes.merge_vars = Object.entries(upperCaseEmailAttributes).map(([name, content]) => ({name,content}));

        if (config.MAIL.ENABLED) {
          mandrillApi.send(emailAttributes)
            .then(()=>{
              respond(null, {'success':true});
            })
            .catch((err)=>{
              console.log(err);
              logger.error(err);
              logger.error('MANDRILL, success: false, message: mail servers failed to send all emails');
              respond(null, {
                'success':false,
                'err':err
              });
            });
        }else{
          respond(null, {'success':true});
        }
      });

    });
  }
};