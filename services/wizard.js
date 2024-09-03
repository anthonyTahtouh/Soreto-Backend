var db = require('../db_pg');
var async = require('async');
var logger = require('../common/winstonLogging');
var _moment = require('moment');
var utilities = require('../common/utility');

var _ = require('lodash');
const globalVars = require('./sharedServices/globalVars');

let _meta_reward_type = {
  sharerPre: 'sharerPre',
  friendPre: 'friendPre',
  sharerPost: 'sharerPost',
  friendPost: 'friendPost'
};

class WizardService {

  create(payload, baseClientUniqueId, campaignTemplate) {

    return new Promise(async (resolve, reject) => {

      logger.info('Wizard : Started');
      logger.info('Wizard : Starting basic validation');

      let fieldValidation = [];

      missingFieldsValidation(payload, fieldValidation);

      await logicalFieldsValidation(payload, fieldValidation);

      if(fieldValidation.length > 0){

        let error = { code: 400, fieldValidation};
        logger.error(error);
        return reject(error);
      }

      // open main transaction
      db.transaction((t) => {

        // starting async operation
        async.auto({

          // get the informed client
          client: (cb) => {
            if(payload.client._id){

              db('client_js')
                .where({'_id' : payload.client._id })
                .first()
                .then((client) => {

                  // does the client exist?
                  if(_.isNil(client)){
                    return cb(`Client id ${payload.client._id} is not valid.`);
                  }

                  logger.info(`Wizard : Select client : "${client.name}"`);

                  // the client already have a customIdentifier?
                  if(!client.customIdentifier){

                    // add a custom identifier for the client
                    db('client_js')
                      .update({customIdentifier: payload.client.customIdentifier })
                      .where({_id: payload.client._id})
                      .then(() => {
                        return cb(null, client);
                      })
                      .catch((error) => {
                        return cb({ code : 500, message: `Error adding a custom indenfier for the client, check if this custom identifier already exist.`, step: 'client', errorObj: error });
                      });

                  }else{
                    return cb(null, client);
                  }
                })
                .catch((error) => {
                  return cb(`DB error searching for Client id: ${payload.client._id}. Error: ${error}`);
                });

            }else{
              // TODO: this flow will create the client
              // use transaction
            }
          },

          //////////////////////////////////
          // COPY BASE
          /////////////////////////////////
          bases : ['client', (cb) => {

            logger.info('Wizerd : Starting to copy the basic structure');

            async.auto({

              ////////////
              // BASE: CLIENT
              ////////////
              baseClient : (cb) => {

                db('client_js')
                  .where({ customIdentifier: baseClientUniqueId })
                  .first()
                  .then((baseClient) => {

                    if(_.isNil(baseClient)){
                      return cb({ code: 400, step: 'Client', error: `Couldnt find a base client by the custom identifier: "${baseClientUniqueId}"`});
                    }

                    logger.info(`Wizard : The base client is: "${baseClient.name}"`);

                    return cb(null, baseClient);
                  });
              },

              ////////////
              // BASE: CAMPAIGN
              ////////////
              baseCampaign : ['baseClient', (cb, results) => {

                try{

                  // get the base campaign by ClientId and the Description
                  db('campaign_js')
                    .where({ clientId: results.baseClient._id, description: campaignTemplate })
                    .first()
                    .then((baseCampaign) => {

                      if(_.isNil(baseCampaign)){
                        return cb({ code: 400, error: `Couldnt find a base campaign by the version template ${baseClientUniqueId}`});
                      }

                      logger.info(`Wizard : The base campaign is: "${baseCampaign.description}"`);

                      return cb(null, objectBaseClean(baseCampaign));
                    })
                    .catch((error) => {
                      return cb({ error, step : 'Campaign'});
                    });

                }catch(error){
                  return cb({ error, step : 'Campaign'});
                }
              }],

              ////////////
              // BASE: CAMPAIGN VERSION
              ///////////
              baseCampaignVersion : ['baseCampaign', (cb, results) => {

                try{

                  // get the campaign version for the base campaign
                  db('campaign_version_js')
                    .where({ campaignId: results.baseCampaign._id })
                    .first()
                    .then((baseCampaignVersion) => {

                      if(_.isNil(baseCampaignVersion)){
                        return cb({ code: 400, error: `Couldnt find a base campaign version by the version template ${baseClientUniqueId}`});
                      }

                      logger.info(`Wizard : The base campaign version is: "${baseCampaignVersion.name}"`);

                      return cb(null, objectBaseClean(baseCampaignVersion));
                    }).catch((error) => {
                      return cb({ error, step : 'Campaign Version'});
                    });

                }catch(error){
                  return cb({ error, step : 'Campaign Version'});
                }

              }],

              ////////////
              // BASE: REWARDS
              ////////////
              baseRewards : ['baseCampaignVersion', (cb, results) => {

                try{

                  // get all the rewards for the base Client
                  db('reward_js')
                    .where({ clientId: results.baseClient._id })
                    .then((rewards) => {

                      return cb(null, rewards.map( r => objectBaseClean(r)));
                    }).catch((error) => {
                      return cb({ error, step : 'Base Rewards'});
                    });

                }catch(error){
                  return cb({ error, step : 'Base Rewards'});
                }

              }],

              ////////////
              // BASE: REWARD DISCOUNT CODES
              ////////////
              baseRewardDiscountCodes : ['baseRewards', (cb, results) => {

                try{

                  // get all the Rewards Discount Codes for the Rewards
                  db('reward_discount_code_js')
                    .whereIn('rewardId', results.baseRewards.map(r => r._id))
                    .then((baseRewardDiscountCodes) => {

                      return cb(null, baseRewardDiscountCodes.map(rdc => objectBaseClean(rdc)));
                    }).catch((error)=>{
                      cb({ error, step : 'Reward Discount Code'});
                    });
                }catch(error){
                  return cb({ error, step : 'Reward Discount Code'});
                }

              }],

              ////////////
              // BASE: REWARD POOL
              ////////////
              baseRewardPools : ['baseRewards', (cb, results) => {

                try{

                  // get the reward pool for the base Campaign Version
                  db('reward_pool_js')
                    .where({ _id: results.baseCampaignVersion.rewardPoolId })
                    .then((baseRewardPools) => {

                      return cb(null, baseRewardPools.map(rp => objectBaseClean(rp)));
                    })
                    .catch((error)=>{
                      return cb({ error, step : 'Reward Pool'});
                    });

                }catch(error){
                  return cb({ error, step : 'Reward Pool'});
                }

              }],

              ////////////
              // BASE: DISPLAY BLOCKS
              ////////////
              baseDisplayBlocks : ['baseCampaignVersion', (cb, results) => {

                try{
                  // get the Display Blocks for the base Campaign Version
                  db('display_block_js')
                    .where({'campaignVersionId' : results.baseCampaignVersion._id })
                    .then((baseDisplayBlocks) => {

                      return cb(null, baseDisplayBlocks.map(dbl => objectBaseClean(dbl)));
                    })
                    .catch((error) => {
                      return cb({ error, step : 'Display Block'});
                    });
                }catch(error){
                  return cb({ error, step : 'Display Block'});
                }

              }],

              ////////////
              // BASE: CODE BLOCKS
              ////////////
              baseCodeBlocks : ['baseDisplayBlocks', (cb, results) => {

                try{

                  // get the Code Blocks for the base Display blocks
                  db('code_block_js')
                    .whereIn('displayBlockId', results.baseDisplayBlocks.map(db => db._id))
                    .then((baseCodeBlocks) => {

                      return cb(null, baseCodeBlocks.map(cbl => objectBaseClean(cbl)));
                    })
                    .catch((error) => {
                      return cb({ error, step : 'Code Block'});
                    });

                }catch(error){
                  return cb({ error, step : 'Code Block'});
                }
              }],

              ////////////
              // BASE: ASSOC EMAIL CAMPAIGN
              ////////////
              baseEmailCampaignAssoc : ['baseCampaignVersion', (cb, results) => {

                try{

                  // get the association between Campaign and email templates
                  db('assoc_campaigns_email_templates_js')
                    .where({'campaignVersionId' : results.baseCampaignVersion._id })
                    .then((baseEmailCampaignAssoc) => {

                      return cb(null, baseEmailCampaignAssoc.map(eca => objectBaseClean(eca)));
                    })
                    .catch((error) => {
                      return cb({ error, step : 'Assoc Email Capaign'});
                    });

                }catch(error){
                  return cb({ error, step : 'Assoc Email Capaign'});
                }

              }],

              ////////////
              // BASE: EMAIL TEMPLATES
              ////////////
              baseEmailTemplates : ['baseEmailCampaignAssoc', (cb, results) => {

                try{

                  // get email templates
                  db('email_template_js')
                    .whereIn('_id', results.baseEmailCampaignAssoc.map(eca => eca.emailTemplateId))
                    .then((baseEmailTemplates) => {

                      return cb(null, baseEmailTemplates.map(et => objectBaseClean(et)));
                    })
                    .catch((error) => {
                      return cb({ error, step : 'Email Template'});
                    });

                }catch(error){
                  return cb({ error, step : 'Email Template'});
                }

              }]
            }, (err, result) => {

              if(!err){

                // base search has finished
                logger.info('Wizard : Copy base structure, done!');
                cb(null, result);
              }else{
                // an error happened
                cb({ code: 500, message: `An error happened trying to get the base structure on step: "${err.step}, the error was: ${err.error}"`}, result);
              }
            });

          }],

          //////////////////////////////////
          // CREATE : CAMPAIGN
          /////////////////////////////////
          campaigns: ['bases', (cb, results) => {

            logger.info(`Wizard : Creating Campaigns`);

            let promisses = [];

            // payload validation
            if(!payload.client.campaigns || payload.client.campaigns.length == 0){
              return cb({ code : 500, message: `There's no Campaign on payload`, step: 'campaigns'});
            }

            // iterate over all campaigns on payload
            for(let campaign of payload.client.campaigns){

              // get the base campaign model
              let baseCampaignTemplate = results.bases.baseCampaign;

              if(!campaign._id){

                // build object replacing the payload Campaign on base Campaign values
                let finalObject = buildCampaignBasedOnTemplate(baseCampaignTemplate, campaign, payload.client);

                // add insert promisse
                promisses.push(
                  db('campaign_js')
                    .transacting(t)
                    .insert(finalObject)
                    .returning('*'));

              }else{
                // TODO
                // campaign already exists (get and return)
              }
            }

            // execute the inserts
            Promise
              .all(promisses)
              .then((addedResults) => {

                addedResults = addedResults.flatMap(x => x);

                // enrich the payload
                // add the Ids of the inserted campaigns on payload
                payload.client.campaigns.map((c) => {

                  let match = addedResults.find(r => r.description == c.description);

                  if(match){
                    c._id = match._id;
                  }

                  return c;
                });

                logger.info(`Wizard : Creating Campaigns, done!`);
                return cb(null, addedResults);
              })
              .catch((error) => {
                return cb({ code : 500, message: `An error happened during the insert`, step: 'campaigns', errorObj: error });
              });
          }],

          //////////////////////////////////
          // CREATE : CAMPAIGN VERSION
          /////////////////////////////////
          campaignVersions: ['campaigns', (cb, results) => {

            logger.info(`Wizard : Creating Campaign Versions`);

            let promisses = [];

            // iterate over all Campaings
            // this time the campaigns already have their ids from database insert
            for(let campaign of payload.client.campaigns){

              // iterate over all Campaign Versions
              for(let campaignVersion of campaign.campaignVersions){

                // build object replacing the payload Campaign Version on base Campaign Version values
                let finalObject = buildCampaignVersionBasedOnTemplate(results.bases.baseCampaignVersion, campaignVersion, campaign._id, payload.client.productUrl);

                // add insert promisse
                promisses.push(
                  db('campaign_version_js')
                    .transacting(t)
                    .insert(finalObject)
                    .returning('*'));
              }
            }

            // execute the inserts
            Promise
              .all(promisses)
              .then((addedResults) => {

                addedResults = addedResults.flatMap(x => x);

                // enrich the payload
                // add the Ids of the inserted Campaign Versions on payload
                payload.client.campaigns.flatMap(c => c.campaignVersions).map((cv) => {

                  let match = addedResults.find(r => r.name == cv.name);

                  if(match){
                    cv._id = match._id;
                  }

                  return cv;

                });

                logger.info(`Wizard : Creating Campaign Versions, done!`);
                return cb(null, addedResults);
              })
              .catch((error) => {
                return cb({ code : 500, message: `An error happened during the insert`, step: 'campaignVersions', errorObj: error });
              });
          }],

          //////////////////////////////////
          // CREATE : REWARDS
          /////////////////////////////////
          rewards: ['bases', (cb, results) => {

            logger.info(`Wizard : Creating Rewards`);

            let promisses = [];

            // validate results from base before perform the inserts
            if(!results.bases.baseRewards
                || results.bases.baseRewards.length == 0
                || !results.bases.baseRewardPools
                || results.bases.baseRewardPools.length == 0
                || !payload.client.rewards
                || payload.client.rewards.length == 0){
              return cb(null, []);
            }

            // iterate ovel all Reward Pools from base
            for(let rp of results.bases.baseRewardPools){

              // has the Base Reward Pool an Advocate Pre Conversion Reward?
              if(rp.advocatePreConversionRewardId){

                // get the Reward from the payload
                let sharerRewardPayload = payload.client.rewards.find(r => r._meta_reward_type == _meta_reward_type.sharerPre);

                // get the Base Reward
                let base = results.bases.baseRewards.find(r => r._id == rp.advocatePreConversionRewardId);

                // build object replacing the payload Reward  on base Reward values
                let finalObject = buildRewardOnTemplate(base, sharerRewardPayload, payload.client._id);

                // add insert promisse
                promisses.push(
                  db('reward_js')
                    .transacting(t)
                    .insert(finalObject)
                    .returning('*'));
              }

              // has the Base Reward Pool an Advocate Post Conversion Reward?
              if(rp.advocatePostConversionRewardId){

                // get the Reward from the payload // actually sharer post
                let sharerRewardPayload = payload.client.rewards.find(r => r._meta_reward_type == _meta_reward_type.sharerPre);

                // get the Base Reward
                let base = results.bases.baseRewards.find(r => r._id == rp.advocatePostConversionRewardId);

                // build object replacing the payload Reward  on base Reward values
                let finalObject = buildRewardOnTemplate(base, sharerRewardPayload, payload.client._id);

                // add insert promisse
                promisses.push(
                  db('reward_js')
                    .transacting(t)
                    .insert(finalObject)
                    .returning('*'));

              }

              // has the Base Reward Pool a Referee Reward?
              if(rp.refereeRewardId){

                // get the Reward from the payload
                let friendRewardPayload = payload.client.rewards.find(r => r._meta_reward_type == _meta_reward_type.friendPre);

                // get the Base Reward
                let base = results.bases.baseRewards.find(r => r._id == rp.refereeRewardId);

                // build object replacing the payload Reward  on base Reward values
                let finalObject = buildRewardOnTemplate(base, friendRewardPayload, payload.client._id);

                // add insert promisse
                promisses.push(
                  db('reward_js')
                    .transacting(t)
                    .insert(finalObject)
                    .returning('*'));
              }

              // has the Base Reward Pool a Friend Post Reward?
              if(rp.friendPostRewardId){

                // get the Reward from the payload // actually friend post
                let friendRewardPayload = payload.client.rewards.find(r => r._meta_reward_type == _meta_reward_type.friendPre);

                // get the Base Reward
                let base = results.bases.baseRewards.find(r => r._id == rp.friendPostRewardId);

                // build object replacing the payload Reward  on base Reward values
                let finalObject = buildRewardOnTemplate(base, friendRewardPayload, payload.client._id);

                // add insert promisse
                promisses.push(
                  db('reward_js')
                    .transacting(t)
                    .insert(finalObject)
                    .returning('*'));
              }
            }

            // execute the inserts
            Promise
              .all(promisses)
              .then((addedResults) => {

                payload.client.rewards.map((r) => {

                  let match = addedResults.flatMap(x => x).find(ad => ad.name == r.name);

                  if(match){
                    r._id = match._id;
                  }

                  return r;

                });

                logger.info(`Wizard : Creating Rewards, done!`);
                return cb(null, addedResults);
              })
              .catch((error) => {
                return cb({ code : 500, message: `An error happened during the insert`, step: 'rewards', errorObj: error });
              });

          }],

          //////////////////////////////////
          // CREATE : REWARD DISCOUNT CODES
          /////////////////////////////////
          rewardDiscountCodes: ['rewards', (cb, results) => {

            logger.info(`Wizard : Creating Reward Discount Codes`);

            let promisses = [];

            // validate results from base before perform the inserts
            if( !results.rewards
              || results.rewards.length == 0
              || !payload.client.rewards
              || payload.client.rewards.length == 0
              || !results.bases.baseRewardDiscountCodes
              || results.bases.baseRewardDiscountCodes.length == 0){
              return cb(null, []);
            }

            // iterate over all Rewards from payload
            // at this time the Rewards already have their ids from database insert
            for(let reward of payload.client.rewards){

              // get the Base Discount Code related to the Reward
              let baseRewardDiscountCodes = results.bases.baseRewardDiscountCodes.filter(rdc => rdc.rewardId == reward._copied_from_id);

              // iterate over all Base Discount Codes
              for(let rewardDiscountCode of baseRewardDiscountCodes){

                let discountCodeObj = reward.discountCodes[0];

                // build object replacing the payload Reward Discount Code on base Reward Discount Code values
                let finalObject = buildRewardDiscountCodeOnTemplate(rewardDiscountCode, discountCodeObj, reward._id);

                // add insert promisse
                promisses.push(
                  db('reward_discount_code_js')
                    .transacting(t)
                    .insert(finalObject)
                    .returning('*'));
              }
            }

            // execute the inserts
            Promise
              .all(promisses)
              .then((addedResults) => {

                logger.info(`Wizard : Creating Reward Discount Codes, done!`);
                return cb(null, addedResults);
              })
              .catch((error) => {
                return cb({ code : 500, message: `An error happened during the insert`, step: 'rewardDiscountCodes', errorObj: error });
              });

          }],

          //////////////////////////////////
          // CREATE : REWARD POOL
          /////////////////////////////////
          rewardPools: ['campaignVersions', 'rewards', (cb, results) => {

            logger.info(`Wizard : Creating Reward Pools`);

            let promisses = [];

            // iterate over Base Reward Pools
            for(let baseRp of results.bases.baseRewardPools){

              // update the Client Id reference
              baseRp.clientId = payload.client._id;

              // has the Base Reward Pool an Advocate Pre Conversion Reward?
              if(baseRp.advocatePreConversionRewardId){

                let createdReward = payload.client.rewards.find(r => r._copied_from_id == baseRp.advocatePreConversionRewardId);
                baseRp.advocatePreConversionRewardId = createdReward._id;
              }

              // has the Base Reward Pool an Advocate Post Conversion Reward?
              if(baseRp.advocatePostConversionRewardId){
                let createdReward = payload.client.rewards.find(r => r._copied_from_id == baseRp.advocatePostConversionRewardId);
                baseRp.advocatePostConversionRewardId = createdReward._id;
              }

              // has the Base Reward Pool a Referee Reward?
              if(baseRp.refereeRewardId){

                let createdReward = payload.client.rewards.find(r => r._copied_from_id == baseRp.refereeRewardId);
                baseRp.refereeRewardId = createdReward._id;
              }

              // has the Base Reward Pool a Friend Post Reward?
              if(baseRp.friendPostRewardId){
                let createdReward = payload.client.rewards.find(r => r._copied_from_id == baseRp.friendPostRewardId);
                baseRp.friendPostRewardId = createdReward._id;
              }

              delete baseRp._id;

              // add insert promisse
              promisses.push(
                db('reward_pool_js')
                  .transacting(t)
                  .insert(baseRp)
                  .returning('*'));
            }

            // execute the inserts
            Promise
              .all(promisses)
              .then((addedResults) => {

                let subPormisses = [];

                if(addedResults.length > 0){

                  // update the Reward Pool Reference on Campaign Version
                  addedResults.flatMap(x => x).map((rp) => {
                    subPormisses.push(db('campaign_version_js').update({'rewardPoolId': rp._id }).transacting(t).where({_id: results.campaignVersions[0]._id }));
                  });
                }else{

                  // if no Reward Pool was added, clean the reference on Campaign Version
                  subPormisses.push(db('campaign_version_js').update({'rewardPoolId': null }).transacting(t).where({_id: results.campaignVersions[0]._id }));
                }

                Promise
                  .all(subPormisses)
                  .then(() => {

                    logger.info(`Wizard : Creating Reward Pools, done!`);
                    return cb(null, addedResults);
                  })
                  .catch((error) => {
                    return cb({ code : 500, message: `An error happened during the insert`, step: 'rewardPools', errorObj: error });
                  });
              })
              .catch((error) => {
                return cb({ code : 500, message: `An error happened during the insert`, step: 'rewardPools', errorObj: error });
              });
          }],

          //////////////////////////////////
          // CREATE : DISPLAY BLOCKS
          /////////////////////////////////
          displayBlocks: ['campaignVersions', 'rewardDiscountCodes', (cb, results) => {

            logger.info(`Wizard : Creating Display Blocks`);

            let promisses = [];

            // iterate over all Base Display Blocks
            for(let displayBlock of results.bases.baseDisplayBlocks){

              // get the Campaing Version from payload that matches with base Display Block Campaign Version
              let match = payload.client.campaigns.flatMap(c => c.campaignVersions).find(cv => cv._copied_from_id == displayBlock.campaignVersionId);

              if(match){
                displayBlock.campaignVersionId = match._id;
              }

              // add insert promisse
              promisses.push(
                db('display_block_js')
                  .transacting(t)
                  .insert(_.omit(displayBlock, '_id'))
                  .returning('*'));
            }

            // execute the inserts
            Promise
              .all(promisses)
              .then((addedResults) => {

                logger.info(`Wizard : Creating Display Blocks, done!`);
                return cb(null, addedResults.flatMap(x => x));
              })
              .catch((error) => {
                return cb({ code : 500, message: `An error happened during the insert`, step: 'displayBlocks', errorObj: error });
              });
          }],

          //////////////////////////////////
          // CREATE : CODE BLOCKS
          /////////////////////////////////
          codeBlocks: ['dynamicVars', (cb, results) => {

            logger.info(`Wizard : Creating Code Blocks`);

            let promisses = [];

            // basic validation
            if(!results.displayBlocks || results.displayBlocks.length == 0){
              return cb(null, []);
            }

            // iterate over added Display Blocks
            for(let addedDisplayBlock of results.displayBlocks){

              // find base display by type
              let baseDisplayBlock = results.bases.baseDisplayBlocks.find(bdb => bdb.type == addedDisplayBlock.type);

              // find the base Code Block
              let baseCodeBlock = results.bases.baseCodeBlocks.find(dbl => dbl.displayBlockId == baseDisplayBlock._id);

              // update the Display Block Id reference
              baseCodeBlock.displayBlockId = addedDisplayBlock._id;

              baseCodeBlock = buildCodeBlock(baseCodeBlock, results.dynamicVars);

              // add insert promisse
              promisses.push(
                db('code_block_js')
                  .transacting(t)
                  .insert(_.omit(baseCodeBlock, '_id'))
                  .returning('*'));
            }

            // execute the inserts
            Promise
              .all(promisses)
              .then((addedResults) => {

                logger.info(`Wizard : Creating Code Blocks, done!`);
                return cb(null, addedResults.flatMap(x => x));
              })
              .catch((error) => {
                return cb({ code : 500, message: `An error happened during the insert`, step: 'codeBlocks', errorObj: error });
              });
          }],

          //////////////////////////////////
          // CREATE : EMAILS
          /////////////////////////////////
          emails: ['dynamicVars', (cb, results) => {

            logger.info(`Wizard : Creating Emails`);

            let promisses = [];

            // iterate over base Email Templates
            for(let email of results.bases.baseEmailTemplates){

              // override the Client id reference
              email.clientId = payload.client._id;

              email = buildEmail(email, results.dynamicVars);

              // add insert promisse
              promisses.push(
                db('email_template_js')
                  .transacting(t)
                  .insert(_.omit(email, '_id'))
                  .returning('*'));
            }

            // execute the inserts
            Promise
              .all(promisses)
              .then((addedResults) => {

                logger.info(`Wizard : Creating Emails, done!`);
                return cb(null, addedResults.flatMap(x => x));
              })
              .catch((error) => {
                return cb({ code : 500, message: `An error happened during the insert`, step: 'emails', errorObj: error });
              });

          }],

          //////////////////////////////////
          // CREATE : ASSOC EMAIL CAMPAINGS
          /////////////////////////////////
          emailCampaignAssociation: ['emails', (cb, results) => {

            logger.info(`Wizard : Creating Assoc Email Campaigns`);

            let promisses = [];

            // iterate over all base Email Campaign Associations
            for(let baseAssocEmailCampaign of results.bases.baseEmailCampaignAssoc){

              // get base email
              let baseEmail = results.bases.baseEmailTemplates.find(be => be._id == baseAssocEmailCampaign.emailTemplateId);

              // get added email
              let addedEmail = results.emails.find(e => e.type == baseEmail.type);

              // override the properties
              baseAssocEmailCampaign.emailTemplateId = addedEmail._id;
              baseAssocEmailCampaign.campaignVersionId = payload.client.campaigns[0].campaignVersions[0]._id;
              baseAssocEmailCampaign.campaignId = payload.client.campaigns[0]._id;

              // execute the inserts
              promisses.push(
                db('assoc_campaigns_email_templates_js')
                  .transacting(t)
                  .insert(_.omit(baseAssocEmailCampaign, '_id'))
                  .returning('*'));
            }

            // execute the inserts
            Promise
              .all(promisses)
              .then((addedResults) => {

                logger.info(`Wizard : Creating Assoc Email Campaigns, done!`);
                return cb(null, addedResults.flatMap(x => x));
              })
              .catch((error) => {
                return cb({ code : 500, message: `An error happened during the insert`, step: 'emailCampaignAssociation', errorObj: error });
              });
          }],

          dynamicVars : ['displayBlocks', (cb) => {

            try{

              let friendReward = payload.client.rewards.find(r => r._meta_reward_type == _meta_reward_type.friendPre);
              let sharerReward = payload.client.rewards.find(r => r._meta_reward_type == _meta_reward_type.sharerPre);
              let friendDiscountCode = friendReward.discountCodes && friendReward.discountCodes.length > 0 ? friendReward.discountCodes[0] : null;
              let sharerDiscountCode = sharerReward.discountCodes && sharerReward.discountCodes.length > 0 ? sharerReward.discountCodes[0] : null;

              let variables = {
                client_name : payload.client.name,
                client_custom_id: payload.client.customIdentifier,
                client_ad_email: `${payload.client.customIdentifier}@soreto.com`,
                client_short_site: payload.client.siteShortUrl,
                client_site: payload.client.siteUrl,
                client_share_link: payload.client.productUrl,
                client_about: payload.client.about,
                sharer_reward: sharerReward ? sharerReward.literalDescription : '',
                friend_reward: friendReward ? friendReward.literalDescription : '',
                action_button_default_background_color: payload.client.campaigns[0].campaignVersions[0].actionButtonDefaultBackgroundColor,
                action_button_default_text_color: payload.client.campaigns[0].campaignVersions[0].actionButtonDefaultTextColor
              };

              if(friendDiscountCode && sharerDiscountCode){

                variables.diff_rewards = friendDiscountCode.valueAmount != sharerDiscountCode.valueAmount ? 'TRUE' : 'FALSE';
              }

              return cb(null, variables);

            }catch(error){
              return cb({ code : 500, message: `An error happened building dynamic vars`, step: 'dynamicVars', errorObj: error });
            }
          }],

          globalVars : ['dynamicVars', (cb, results) => {

            // get post reward base campaign version global var configuration
            globalVars.getVar('POST_REWARD_VERSION', 'CAMPAIGN_VERSION.POST_REWARD', results.bases.baseCampaignVersion._id)
              .then((gVar) => {

                // is it different of 1
                if(gVar && gVar.length > 0 && gVar[0] != '1'){

                  // get Global Var Definition
                  globalVars.getVarDefinitionByContextAndKey('CAMPAIGN_VERSION.POST_REWARD', 'POST_REWARD_VERSION')
                    .then((varDef) => {

                      let newGlobalVar = {
                        objectId: payload.client.campaigns[0].campaignVersions[0]._id,
                        varDefinitionId: varDef._id,
                        value: [gVar[0]],
                        fallbacked: true
                      };

                      globalVars.updateSettings([newGlobalVar])
                        .then(() => {

                          logger.info(`Wizard : Copy global vars, done!`);

                          return cb(null, null);
                        })
                        .catch((error) => {
                          return cb({ code : 500, message: `An error happened copy global vars`, step: 'globalVars', errorObj: error });
                        });
                    })
                    .catch((error) => {
                      return cb({ code : 500, message: `An error happened copy global vars`, step: 'globalVars', errorObj: error });
                    });
                }else {
                  return cb(null, null);
                }
              })
              .catch((error) => {
                return cb({ code : 500, message: `An error happened copy global vars`, step: 'globalVars', errorObj: error });
              });
          }],

          mpBrand : ['campaignVersions', (cb, results) => {

            if (results.bases.baseCampaign.type !== 'marketplace' || !payload.client.brand) return cb(null, null);

            db('mp_brand_js')
              .where({ clientId: payload.client._id})
              .first()
              .then((brand) => {

                if (brand) {
                  logger.info('Brand already exists: _id: ' + brand._id);
                  return cb(null, brand);
                }

                db('mp_brand_js')
                  .transacting(t)
                  .insert({
                    clientId: payload.client._id,
                    name: payload.client.name,
                    shortName: payload.client.brand.shortName,
                    active: false,
                    shortUrl: payload.client.siteShortUrl,
                    brandDescription: payload.client.brand.description,
                    cardImageUrl: '',
                    logoImageUrl: '',
                    coverImageUrl: '',
                    urlId: payload.client.brand.urlId,
                    trendingIndex: 999,
                    createdAt: new Date(),
                    updatedAt: new Date()
                  })
                  .returning('*')
                  .then(([mpBrand]) => {

                    logger.info(`Wizard : Creating Brand, done!`);

                    if (!payload.client.brand.categories || payload.client.brand.categories.length === 0) return cb(null, mpBrand);

                    db('mp_brand_category_js')
                      .transacting(t)
                      .insert(payload.client.brand.categories.map((payloadBrandCategory) => {
                        return {
                          mpBrandId: mpBrand._id,
                          mpCategoryId: payloadBrandCategory._id
                        };
                      }))
                      .returning('*')
                      .then(() => {
                        logger.info(`Wizard : Creating Brand Categories, done!`);
                        return cb(null, mpBrand);
                      })
                      .catch((error) => {
                        logger.error(error);
                        return cb({ code : 500, message: `An error happened during the insert`, step: 'mpBrand', errorObj: error });
                      });

                  })
                  .catch((e) =>{
                    logger.error(e);
                  });
              });

          }],

          mpOffer : ['campaignVersions', (cb, results) => {

            if (!payload.client.offer) return cb(null, null);

            db('mp_offer_js as moj')
              .select('moj.*')
              .join('campaign_version_js as cvj', 'moj.campaignVersionId', 'cvj._id')
              .where({ campaignId: results.bases.baseCampaign._id})
              .first()
              .then((databaseOffer) => {

                if (!databaseOffer) return cb(null, null);

                databaseOffer = _.omit(databaseOffer, ['_id', 'createdAt', 'updatedAt']);
                databaseOffer = { ...databaseOffer,
                  campaignVersionId: results.campaignVersions[0]._id,
                  name: payload.client.campaigns[0].campaignVersions[0].name,
                  active: false,
                  startDate: payload.client.offer.startDate,
                  endDate: payload.client.offer.endDate,
                  type: payload.client.offer.type,
                  cardDescription:payload.client.offer.cardDescription,
                  title: payload.client.offer.cardDescription,
                  cardTitle: payload.client.offer.cardDescription,
                  condition:payload.client.offer.condition,
                  urlId:payload.client.offer.urlId,
                  trendingIndex: 999,
                  trackingLink: null,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                };

                db('mp_offer_js')
                  .transacting(t)
                  .insert(databaseOffer)
                  .returning('*')
                  .then(([mpOffer]) => {

                    logger.info(`Wizard : Creating Offer, done!`);

                    if (!payload.client.offer.categories || payload.client.offer.categories.length === 0) return cb(null, mpOffer);

                    db('mp_offer_category_js')
                      .transacting(t)
                      .insert(payload.client.offer.categories.map((payloadOfferCategory) => {
                        return {
                          mpOfferId: mpOffer._id,
                          mpCategoryId: payloadOfferCategory._id
                        };
                      }))
                      .returning('*')
                      .then(() => {
                        logger.info(`Wizard : Creating Offer Categories, done!`);
                        return cb(null, mpOffer);
                      })
                      .catch((error) => {
                        logger.error(error.stack);
                        return cb({ code : 500, message: `An error happened during the insert`, step: 'mpOffer', errorObj: error });
                      });

                  }).catch((e) =>{
                    logger.error(e);
                    return cb({ code : 500, message: `An error happened during the insert`, step: 'mpOffer', errorObj: e });
                  });

              });
          }]

        }, (error) => {

          //
          // FINISH!
          //

          // any execution error?
          if(!error){

            // commit DB transaction
            t.commit();

            // resolve promisse
            return resolve();
          }else{

            // roolback DB transaction
            t.rollback(error);

            // generic error treat
            if (typeof error === 'string' || error instanceof String){
              error = { code: 500, message: error };
            }else {

              if(!error.code){
                error.code = 500;
              }
            }

            // reject promisse
            return reject(error);
          }
        });

      });
    });
  }
}

const missingFieldsValidation = (payload, fieldValidation) => {

  let required = {
    client: [
      '_id',
      'customIdentifier',
      'siteUrl',
      'siteShortUrl',
      'productUrl',
      'about',
      'campaigns',
      'rewards'
    ],
    campaigns: [
      'description',
      'startDate',
      'expiry',
      'campaignVersions',
      'countryId'
    ],
    campaignVersions: [
      'name',
      'actionButtonDefaultBackgroundColor',
      'actionButtonDefaultTextColor'
    ],
    rewards: [
      'name',
      'literalDescription'
    ],
    rewardDiscountCodes: [
      'code',
      'valueAmount',
      'validFrom'
    ],
    brand: [
      'shortName'
    ]
  };

  let campaign = (_.get(payload, 'client.campaigns') && payload.client.campaigns.length > 0) ? payload.client.campaigns[0] : null;
  let campaignVersion = (campaign && campaign.campaignVersions && campaign.campaignVersions.length > 0) ? campaign.campaignVersions[0] : null;
  let friendPreReward = _.get(payload, 'client.rewards') ? payload.client.rewards.find(r => r._meta_reward_type == _meta_reward_type.friendPre) : null;
  let sharerPreReward = _.get(payload, 'client.rewards') ? payload.client.rewards.find(r => r._meta_reward_type == _meta_reward_type.sharerPre) : null;
  let friendPreRewardDiscountCode = (friendPreReward && friendPreReward.discountCodes && friendPreReward.discountCodes.length > 0) ? friendPreReward.discountCodes[0] :null;
  let sharerPreRewardDiscountCode = (sharerPreReward && sharerPreReward.discountCodes && sharerPreReward.discountCodes.length > 0) ? sharerPreReward.discountCodes[0] :null;
  let brand = _.get(payload, 'client.brand');

  let missingFields = {
    'client': getMissingFields(required.client, payload.client),
    'client.campaign': getMissingFields(required.campaigns, campaign),
    'client.campaign.campaignVersion': getMissingFields(required.campaignVersions, campaignVersion),
    'client.rewards.friend_pre': getMissingFields(required.rewards, friendPreReward),
    'client.rewards.sharer_pre': getMissingFields(required.rewards, sharerPreReward),
    'client.rewards.friend_pre.discountCode': getMissingFields(required.rewardDiscountCodes, friendPreRewardDiscountCode),
    'client.rewards.sharer_pre.discountCode': getMissingFields(required.rewardDiscountCodes, sharerPreRewardDiscountCode)
  };

  // Only validate this field on the new wizard screen
  if (payload.client.brand) {
    missingFields['client.brand'] = getMissingFields(required.brand, brand);
  }

  for (let missingProp in missingFields) {
    for (let miss of missingFields[missingProp]) {
      {
        fieldValidationAdd(fieldValidation,`${missingProp}.${miss}`, 'Required field');
      }
    }
  }
};

const getMissingFields = (payloadRequiredFields, payload) => {

  let missingFields = [];

  if(!payload){
    return payloadRequiredFields;
  }

  for (let reqField of payloadRequiredFields) {
    let value = _.get(payload, reqField);
    if (!value || _.isNil(value) || (Array.isArray(value) && value.length == 0)) {
      missingFields.push(reqField);
    }
  }

  return missingFields;
};

const logicalFieldsValidation = (payload, fieldValidation) => {

  return new Promise((resolve) => {

    let campaign = (_.get(payload, 'client.campaigns') && payload.client.campaigns.length > 0) ? payload.client.campaigns[0] : null;
    let friendPreReward = _.get(payload, 'client.rewards') ? payload.client.rewards.find(r => r._meta_reward_type == _meta_reward_type.friendPre) : null;
    let sharerPreReward = _.get(payload, 'client.rewards') ? payload.client.rewards.find(r => r._meta_reward_type == _meta_reward_type.sharerPre) : null;
    let friendPreRewardDiscountCode = (friendPreReward && friendPreReward.discountCodes && friendPreReward.discountCodes.length > 0) ? friendPreReward.discountCodes[0] :null;
    let sharerPreRewardDiscountCode = (sharerPreReward && sharerPreReward.discountCodes && sharerPreReward.discountCodes.length > 0) ? sharerPreReward.discountCodes[0] :null;
    let brand = _.get(payload, 'client.brand');
    let offer = _.get(payload, 'client.offer');

    if(payload.client){

      if(!utilities.isValidCustomIdentifier(payload.client.customIdentifier)){
        fieldValidationAdd(fieldValidation, 'client.customIdentifier', `Custom identifier out of pattern. (Use only letter, numbers, '-' or '_'). Empty space is not allowed.`);
      }

      if(!utilities.isValidUrl(payload.client.siteUrl)){
        fieldValidationAdd(fieldValidation, 'client.siteUrl', 'Invalid Url');
      }
    }

    if(campaign){
      if(_moment(campaign.startDate).isSameOrAfter(_moment(campaign.expiry))){
        fieldValidationAdd(fieldValidation, 'client.campaign.startDate', 'Start Date should be before of End Date');
      }
    }

    if(friendPreRewardDiscountCode){
      if(_moment(friendPreRewardDiscountCode.validFrom).isSameOrAfter(_moment(friendPreRewardDiscountCode.validTo))){
        fieldValidationAdd(fieldValidation, 'client.rewards.friend_pre.discountCode.validFrom', 'Start Date should be before of End Date');
      }

      if(isNaN(friendPreRewardDiscountCode.valueAmount)){
        fieldValidationAdd(fieldValidation, 'client.rewards.friend_pre.discountCode.valueAmount', 'Amount should be a number');
      }else if(friendPreRewardDiscountCode.valueAmount <= 0){
        fieldValidationAdd(fieldValidation, 'client.rewards.friend_pre.discountCode.valueAmount', 'Amount should be grater than 0');
      }
    }

    if(sharerPreRewardDiscountCode){
      if(_moment(sharerPreRewardDiscountCode.validFrom).isSameOrAfter(_moment(sharerPreRewardDiscountCode.validTo))){
        fieldValidationAdd(fieldValidation, 'client.rewards.sharer_pre.discountCode.validFrom', 'Start Date should be before of End Date');
      }

      if(!_moment(sharerPreRewardDiscountCode.validFrom).isValid()){
        fieldValidationAdd(fieldValidation, 'client.rewards.sharer_pre.discountCode.validFrom', 'Start Date is invalid');
      }

      if(sharerPreRewardDiscountCode.validTo && !_moment(sharerPreRewardDiscountCode.validTo).isValid()){
        fieldValidationAdd(fieldValidation, 'client.rewards.sharer_pre.discountCode.validTo', 'End Date is invalid');
      }

      if(isNaN(sharerPreRewardDiscountCode.valueAmount)){
        fieldValidationAdd(fieldValidation, 'client.rewards.sharer_pre.discountCode.valueAmount', 'Amount should be a number');
      }else if (sharerPreRewardDiscountCode.valueAmount <= 0){
        fieldValidationAdd(fieldValidation, 'client.rewards.sharer_pre.discountCode.valueAmount', 'Amount should be greater than 0');
      }
    }

    let promises = [];

    if (brand) {
      if (!brand.urlId || brand.urlId.indexOf(' ') >= 0 || brand.urlId.length < 1 || brand.urlId.length > 50) {
        fieldValidationAdd(fieldValidation, 'client.brand.urlId', `Length cannot 0 or bigger than 50 and there shouldn't be any white spaces`);
      } else {
        promises.push(db('mp_brand_js').select('*').where({ 'urlId': brand.urlId }).first());
      }
    }

    if (offer) {
      if (!offer.urlId || offer.urlId.indexOf(' ') >= 0 || offer.urlId.length < 1 || offer.urlId.length > 50) {
        fieldValidationAdd(fieldValidation, 'client.offer.urlId', `Length cannot be 0 or bigger than 50 and there shouldn't be any white spaces`);
      } else {
        promises.push(db('mp_offer_js').select('*').where({ urlId: offer.urlId }).first());
      }
    }

    Promise.all(promises).then((promisesResult) => {
      let brandDatabase = promisesResult[0];
      let offerDatabase = promisesResult[1];
      if (brandDatabase) {
        fieldValidationAdd(fieldValidation, 'client.brand.urlId', `The URL Id already exists`);
      }
      if (offerDatabase) {
        fieldValidationAdd(fieldValidation, 'client.offer.urlId', `The URL Id already exists`);
      }
      resolve(fieldValidation);
    });

  });
};

const fieldValidationAdd = (fieldValidation, field, message) => {

  // prevent duplicated
  if(!fieldValidation.find(fv => fv.field === field)){
    fieldValidation.push({ field, message});
  }
};

const buildCampaignBasedOnTemplate = (base, campaignPayload, client) => {

  let propsToOverride = ['description', 'countryId', 'startDate', 'expiry'];
  let fixedValues = {
    active : false,
    sourceCampaignId: base._id,
    clientId: client._id,
    shortUrlCustomStringComponent: client.customIdentifier
  };

  base = _.merge(base, _.pick(campaignPayload, propsToOverride));
  base = _.merge(base, fixedValues);

  campaignPayload._copied_from_id = base._id;

  base = _.omit(base, '_id');

  return base;
};

const buildCampaignVersionBasedOnTemplate = (base, campaignVersionPayload, campaignId, trackingLink) => {

  let propsToOverride = ['name', 'mpOfferTitle'];
  let fixedValues = {
    campaignId: campaignId,
    trackingLink
  };

  base = _.merge(base, _.pick(campaignVersionPayload, propsToOverride));
  base = _.merge(base, fixedValues);

  campaignVersionPayload._copied_from_id = base._id;
  base = _.omit(base, '_id');

  return base;
};

const buildRewardOnTemplate = (base, rewardPayload, clientId) => {

  let propsToOverride = ['name'];
  let fixedValues = {
    clientId: clientId
  };

  base = _.merge(base, _.pick(rewardPayload, propsToOverride));
  base = _.merge(base, fixedValues);

  rewardPayload._copied_from_id = base._id;

  base = _.omit(base, '_id');

  return base;
};

const buildRewardDiscountCodeOnTemplate = (base, rewardDiscountCodePayload, rewardId) => {

  let propsToOverride = ['code', 'valueAmount', 'validFrom', 'validTo'];

  rewardDiscountCodePayload.validTo = !rewardDiscountCodePayload.validTo ? null : rewardDiscountCodePayload.validTo;

  let fixedValues = {
    rewardId: rewardId,
    activeFrom: rewardDiscountCodePayload['validFrom'],
    activeTo: rewardDiscountCodePayload['validTo']
  };

  base = _.merge(base, _.pick(rewardDiscountCodePayload, propsToOverride));
  base = _.merge(base, fixedValues);

  rewardDiscountCodePayload._copied_from_id = base._id;

  base = _.omit(base, '_id');

  return base;
};

const buildCodeBlock = (codeBlock, variables) => {

  // iterate over variables
  for(let variable in variables){

    let reg = new RegExp(`##${variable}##`, 'g');

    codeBlock.htmlBody = codeBlock.htmlBody.replace(reg, variables[variable]);
    codeBlock.css = codeBlock.css.replace(reg, variables[variable]);
    codeBlock.scss = codeBlock.scss.replace(reg, variables[variable]);
    codeBlock.javascript = codeBlock.javascript.replace(reg, variables[variable]);
    codeBlock.cssExternal = codeBlock.cssExternal.replace(reg, variables[variable]);
  }

  return codeBlock;
};

const buildEmail = (email, variables) => {

  // iterate over variables
  for(let variable in variables){

    let reg = new RegExp(`##${variable}##`, 'g');

    for(let val in email.templateValues){
      email.templateValues[val] = email.templateValues[val].replace(reg, variables[variable]);
    }
  }

  return email;
};

// commom properties to remove from object
let commomMetaProperties = ['createdAt', 'updatedAt'];

const objectBaseClean = (object) => {
  return _.omit(object, commomMetaProperties);
};

let service = new WizardService();

module.exports = {
  _meta_reward_type,
  create: service.create
};
