var assocJoinEmailsTemplatesService = require('../../services/assocJoinEmailsTemplates');
var sharedUrlService = require('../../services/sharedUrl');
const constants = require('../../config/constants');
var moment = require('moment');
var logger = require('../../common/winstonLogging');

module.exports = {
  retrieveEmailTemplateListener: (context) => {
    context.add(constants.EVENTS.RETRIEVE_EMAIL_TEMPLATE, (msg, respond) => {
      const filter = msg.data;
      assocJoinEmailsTemplatesService.getEmailTemplate(filter, function (err, emailTemplateProperties) {
        if(err){
          return respond(err);
        }
        if(!emailTemplateProperties){
          return respond(null, {success: false});
        }
        return respond(null, { success: true, data: emailTemplateProperties });
      });
    });
  },

  retrieveSocialPostCount: (context) => {
    context.add(constants.EVENTS.RETRIEVE_SOCIAL_POST_COUNT, async (msg, respond) => {

      var filter = msg.data;

      if(!msg.data || !msg.data.user || !msg.data.user._id || !msg.data.minutesFromNow){
        respond(`Invalid filter, must be on the format: { data : { user: { _id: 'XXXX' }, minutesFromNow: 5 } }`,{ success: false });
      }

      try {

        let sus = await sharedUrlService.getSharedUrlByUserIdCampaignVersion(
          filter.user._id,
          filter.campaignVersionId,
          'SHARED',
          moment().utc().subtract(filter.minutesFromNow, 'minutes').format('YYYY-MM-DDTHH:mm:ss'));

        return respond(null, { success: true, data: { socialPostsLength: sus.length } });
      } catch (err) {
        logger.warn('Failed to retrive previous post data: %s', err);
        return respond('Failed to retrive previous post data: ' + err,{ success: false });
      }
    });
  }
};
