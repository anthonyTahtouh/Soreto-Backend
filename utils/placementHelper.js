const _ = require('lodash');

var CodeBlockService = require('../services/codeBlock');

var DisplayBlockService = require('../services/displayBlock');

var clientService = require('../services/client');

const campaignService = require('../services/campaign');
const campaignVersionService = require('../services/campaignVersion');
const ruleInfrastuctureHelper = require('../utils/ruleInfrastuctureHelper');
const utility = require('../common/utility');

module.exports = {

  constructPlacmentDetailsObject: function (clientId, placementType, options = {}) {
    return new Promise(function(resolve, reject) {

      var codeBlockService = new CodeBlockService();
      var displayBlockService = new DisplayBlockService();

      function resolvePlacmentByCampaignVersionObject(campaignVersion){

        displayBlockService.getActiveDisplayBlockByType(campaignVersion._id, placementType, function(err, displayBlock){
          if (err || _.isEmpty(displayBlock)) {
            return reject({status:400,code:'NO_ACTIVE_DISPLAY_BLOCK', message: `no active DISPLAY_BLOCK for campaignVersion:${campaignVersion._id} && placementType: ${placementType}`,'data':{}});
          }
          codeBlockService.getActiveCodeBlock(displayBlock._id,function(err, codeBlock){
            if (err || _.isEmpty(codeBlock)) {
              return reject({status:400,code:'getActiveCodeBlock', message: `no active Code Block for campaignVersion:${campaignVersion._id} && ${placementType}`,'data':{}});
            }
            let templateObject = _.pick(codeBlock, ['htmlBody', 'css', 'javascript', 'cssExternal', 'jsExternal','meta']);
            //DEPRECATED: campaignVersion variable will be removed soon, use campaignVersionId instead.
            templateObject.campaignVersion = campaignVersion._id;
            templateObject.campaignVersionId = campaignVersion._id;
            templateObject.clientId = clientId;
            templateObject.sharedUrlId = options.sharedUrlId;
            templateObject.linkExpiryDays=campaignVersion.linkExpiryDays;
            templateObject.privateLinkExpiryDays=campaignVersion.privateLinkExpiryDays;

            Object.keys(templateObject).forEach((key) => {
              if( _.isEmpty(templateObject[key]) && !Number.isInteger(templateObject[key])) {
                templateObject[key] = '';
              }
            });

            return resolve(templateObject);
          });
        });
      }

      if(options.campaignVersionId){
        campaignVersionService.getCampaignVersionCampaignClientStatus(options.campaignVersionId,function(err,campaignVersion){
          if (err || _.isEmpty(campaignVersion)) {
            return reject({status:400, code:`cannot find campaignVersion: ${options.campaignVersionId}`,'data':{}});
          }

          // prevent lightbox placement to be opened when the CPV is inactive
          // allow only test mode calls
          if((placementType == 'lightbox' || placementType == 'sharestaticpage')
            && (
              !campaignVersion.active
              || !campaignVersion.campaignActive
              || (campaignVersion.campaignType == 'on_site_referral' && !campaignVersion.clientActive)
              || (campaignVersion.campaignType == 'marketplace' && !campaignVersion.clientActiveMarketplace))
            && (typeof options.testMode == 'undefined' ||  !utility.parseBoolean(options.testMode))) {

            return reject(
              {
                status:400,
                code:'CAMPAIGN_VERSION_INACTIVE',
                message: `campaign version with id ${options.campaignVersionId} is inactive`,
                data :{}
              }
            );
          }

          resolvePlacmentByCampaignVersionObject(campaignVersion);
        });
      }else{

        clientService.getClient(clientId, function(err,client){

          if(!client){
            return reject({status:400, code:'CLIENT_ID_NOT_VALID', message: `client with id ${clientId} is not valid`,'data':{}});
          }

          if(!client.active && (typeof options.testMode == 'undefined' || !utility.parseBoolean(options.testMode))) {
            return reject({status:400, code:'CLIENT_INACTIVE', message: `client with id ${clientId} is inactive`,'data':{}});
          }

          campaignService.getActiveCampaign(clientId, true, null, options.country, function(err, campaign){
            if (err || _.isEmpty(campaign)) {
              return reject({status:400, code:'getActiveCampaign', message: `no active campaign for ${clientId}`,'data':{}});
            }
            campaignVersionService.getActiveCampaignVersionsByCampaignId(campaign._id, options.sourceTag,
              function(err,campaignVersions){
                if (err || _.isEmpty(campaignVersions)) {
                  return reject({status:400, code:'getActiveCampaignVersionsByCampaignId', message: `no active campaign versions for campaign: ${campaign._id} && placementType: ${placementType}`,'data':{}});
                }

                const campaignVersion = ruleInfrastuctureHelper.returnObjectByExposureValue(campaignVersions);

                resolvePlacmentByCampaignVersionObject(campaignVersion);

              });
          });
        });
      }


    });
  }
};