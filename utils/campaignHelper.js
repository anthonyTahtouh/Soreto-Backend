const _ = require('lodash');
const logger = require('../common/winstonLogging');
const constants = require('../common/constants');

const campaignService = require('../services/campaign');
const campaignVersionService = require('../services/campaignVersion');
const globalVarsService = require('../services/sharedServices/globalVars');
//const ruleInfrastuctureHelper = require('../utils/ruleInfrastuctureHelper');

var rewardService = require('../services/reward');
var {getRewardsByCampaignVersion} = require('../services/campaignVersion');
var rewardDiscountCodeService = require('../services/rewardDiscountCode');

module.exports = {

  getActiveCampaignsVersionByClient : (clientId, country, sourceTag) => {

    return new Promise((resolve, reject) => {

      // get the Active Campaign
      campaignService.getActiveCampaign(clientId, true, null, country,
        function(err, campaign){

          // is there any error?
          if (err || _.isEmpty(campaign)) {

            logger.error(`Fail getting active CP for a client. Client ID: ${clientId}`);
            logger.error(err);

            return reject({status:400, code:'getActiveCampaign', message: `no active campaign for ${clientId}`,'data':{}});
          }

          // get the Campaign Versions to the Campaing
          campaignVersionService.getActiveCampaignVersionsByCampaignId(campaign._id, sourceTag,
            function(err, campaignVersions){

              // is there any error?
              if (err || _.isEmpty(campaignVersions)) {

                logger.error(`Fail getting active CPVs for a CP. CP ID: ${campaign._id}`);
                logger.error(err);

                return reject({status:400, code:'getActiveCampaignVersionsByCampaignId', message: `no active campaign versions for campaign: ${campaign._id}`,'data':{}});
              }

              // sort AB Campaigns
              //const campaignVersion = ruleInfrastuctureHelper.returnObjectByExposureValue(campaignVersions);

              let detailsPromisses = campaignVersions.map(cv => getCampaignVersionGlobalVars(cv._id));

              // fill Campaing Version Global Vars

              Promise.all(detailsPromisses)
                .then((campaignsVars) => {

                  campaignsVars.forEach((v, i) => campaignVersions[i].globalVars = v);

                })
                .catch((error) => {

                  logger.error(`Fail filling CPV global vars.`);
                  logger.error(error);

                })
                .finally(() => {
                  resolve(campaignVersions);
                });

            });
        });
    });
  },

  getCampaingVersionDetails : (campaignVersionId) => {

    return new Promise((resolve, reject) => {

      campaignVersionService.getCampaignVersion(campaignVersionId, function(err,campaignVersion){

        if (err || _.isEmpty(campaignVersion)) {

          logger.error(`Fail getting CPV. CPV ID: ${campaignVersionId}`);
          logger.error(err);

          return reject({status:400, code:`cannot find campaignVersion: ${campaignVersionId}`,'data':{}});
        }

        getCampaignVersionGlobalVars(campaignVersion._id)
          .then((campaignVars) => {
            campaignVersion.globalVars = campaignVars;
          })
          .catch((error) => {
            logger.error(`Fail filling CPV global vars. CPV ID ${campaignVersion._id}`);
            logger.error(error);
          })
          .finally(() => {
            resolve(campaignVersion);
          });

      });
    });
  },

  getDiscountCode: function ( campaignVersionId, discountStage ,userId, sharedUrlAccessId = null, rewardId = null, redeemedUserId = null) {
    return new Promise(function(resolve, reject) {

      if(!rewardId){

        // no reward id passed
        // follow the classical flow

        // get all the available rewards to the campaign version
        getRewardsByCampaignVersion(campaignVersionId).then((discounts)=>{

          var discount = _.find(discounts, (o)=>{return o.stage == discountStage; });

          if(!discount){
            return reject();
          }

          // BATCH DISCOUNT
          if(discount.type == 'batch-discount'){

            rewardDiscountCodeService.getBatchDiscountCodeAndAssignUserId(campaignVersionId, discount.stage, userId, sharedUrlAccessId, redeemedUserId)
              .then((rewardDiscountCode) =>{
                return resolve({
                  _id:rewardDiscountCode._id || rewardDiscountCode.reward_discount_code_id,
                  valueAmount: rewardDiscountCode.valueAmount ,
                  code: rewardDiscountCode.code
                });
              }).catch((err)=>{
                return reject(err);
              });

          }
          // DISCOUNT
          else if(discount.type == 'discount'){

            rewardDiscountCodeService.getValidDiscountCode(discount.rewardId)
              .then((rewardDiscountCode) =>{
                return resolve({
                  _id:rewardDiscountCode[0]._id,
                  valueAmount: rewardDiscountCode[0].valueAmount,
                  code: rewardDiscountCode[0].code
                });
              }).catch((err)=>{
                return reject(err);
              });
          } else {
            return reject(); //handle non-standard types
          }

        });
      }else{

        // a reward id was defined
        // revalidate the reward availability, prevent fraud

        rewardService.getById(rewardId)
          .then((reward) => {

            // discount code found?
            if(!reward){
              return reject();
            }

            switch(reward.type){

            case constants.REWARD_DISCOUNT_TYPE.BATCH:

              rewardDiscountCodeService.getBatchDiscountCodeByRewardIdAndAssignUserId(rewardId, userId, sharedUrlAccessId)
                .then((rewardDiscountCode) => {
                  return resolve({
                    _id:rewardDiscountCode._id || rewardDiscountCode.reward_discount_code_id,
                    valueAmount: rewardDiscountCode.valueAmount ,
                    code: rewardDiscountCode.code,
                    rewardId
                  });
                })
                .catch(reject);

              break;

            case constants.REWARD_DISCOUNT_TYPE.EVERGREEN:

              rewardDiscountCodeService.getValidDiscountCode(rewardId)
                .then((rewardDiscountCode) =>{
                  return resolve({
                    _id:rewardDiscountCode[0]._id,
                    valueAmount: rewardDiscountCode[0].valueAmount,
                    code: rewardDiscountCode[0].code,
                    rewardId
                  });
                }).catch((err)=>{
                  return reject(err);
                });
              break;

            default:
              reject();
            }

          })
          .catch(reject);
      }
    });
  }
};

/**
 * Get Campaing Version Global Vars
 */
const getCampaignVersionGlobalVars = (campaignVersionId) => {

  return new Promise(async (resolve, reject) => {

    let lightboxKeys = ['ARIA_LABEL', 'MINIMIZATION_ENABLED', 'LAUNCH_MINIMIZED', 'MINI_LARGE', 'MINI_MEDIUM', 'MINI_SMALL', 'TOGGLE_BUTTON_INNER_HTML', 'SHOW_MINIMUM_ORDER_VALUE', 'RENDER_VERSION', 'DIMENSIONS'];
    let userJourneyKeys = ['DELIVER_PERSONAL_SU_ON_SHARE'];

    try {

      let lightboxVars = await globalVarsService.getVars(lightboxKeys, 'CAMPAIGN_VERSION.LIGHTBOX', campaignVersionId);
      let userJourneyVars = await globalVarsService.getVars(userJourneyKeys, 'CAMPAIGN_VERSION.USER_JOURNEY', campaignVersionId);

      let lightboxVarsObj = globalVarsService.friendlify(lightboxVars);
      let userJourneyVarsObj = globalVarsService.friendlify(userJourneyVars);

      let scope = {
        mini: {
          minimizationEnabled: lightboxVarsObj.minimizationEnabled,
          launchMinimized: lightboxVarsObj.launchMinimized,
          miniLarge: lightboxVarsObj.miniLarge,
          miniMedium: lightboxVarsObj.miniMedium,
          miniSmall: lightboxVarsObj.miniSmall,
          toggleButtonInnerHtml: lightboxVarsObj.toggleButtonInnerHtml
        },
        showLightboxMinimumOrderValue:lightboxVarsObj.showMinimumOrderValue,
        userJourney: {
          deliverPersonalSharedUrlOnShare: userJourneyVarsObj.deliverPersonalSuOnShare
        },
        accessibility: {
          modalAriaLabel: lightboxVarsObj.ariaLabel
        },
        lightboxRenderVersion: lightboxVarsObj.renderVersion,
        lightboxDimensions: lightboxVarsObj.dimensions
      };

      resolve(scope);
    } catch (error) {
      reject(error);
    }
  });

};