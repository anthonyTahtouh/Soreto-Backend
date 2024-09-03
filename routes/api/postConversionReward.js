const express = require('express');
const router = express.Router();
const _ = require('lodash');
const moment = require('moment');
const async = require('async');
const { promisify } = require('util');
const _utility = require('../../common/utility');

const authService = require('../../services/auth');
const PostConversionReward = require('../../services/postConversionReward');
const PostConversionRewardService = require('../../services/postConversionRewardService');
const ClientService = require('../../services/client');
const CampaignService = require('../../services/campaign');
const OrderService = require('../../services/order');
const AssocAffiliateClientService = require('../../services/assocAffiliateMerchantClient');
const SharedUrlAccessUserInfoService = require('../../services/sharedUrlAccessUserInfoService');
const SharedUrlService = require('../../services/sharedUrl');
const ExternalOrderService = require('../../services/externalOrder');
const RewardPoolService = require('../../services/rewardPool');
const RewardService = require('../../services/reward');
const RewardDiscountCodeService = require('../../services/rewardDiscountCode');
const GlobalVarService = require('../../services/sharedServices/globalVars');
const UserService = require('../../services/user');
const {sendPostRewardDiscountMail_v2} = require('../../services/externalServices/sendEmail');
const userService = require('../../services/user');
const constants = require('../../config/constants');
var msClient = require('../../common/senecaClient');

const responseHandler = require('../../common/responseHandler');
var sharedUrlHelper =  require('../../utils/sharedUrlHelper');

const _postRewardGVs = [
  'ALLOWED_ORDER_STATUS',
  'POST_REWARD_BLOCKED'
];

const _postRewardCPVGVs = [
  'POST_REWARD_ORDER_MINIMUM_AMOUNT'
];

/**
 * POST REWARD VERSION 2
 */

/**
 * [GET] - Get all the clients that use a specific Post Reward Version
 *
 */
router.get('/postreward/harvest/clients',
  authService.isAuthenticated, authService.isAuthorized, (req, res) => {

    // read params
    let clientIds = req.query.clientIds;

    ClientService.getClientsByIds(clientIds)
      .then((clients) => {

        let enrichmentPromisses = [];

        // iterate over all clients
        for(let client of clients){

          // affiliate assoc enrichments
          enrichmentPromisses.push(
            new Promise((resolve, reject) => {
              AssocAffiliateClientService.get({ clientId : client._id })
                .then((result) => {
                  client.assocList = result;
                  resolve();
                })
                .catch((error) => {
                  reject(error);
                });
            }));

          // global vars enrichment
          enrichmentPromisses.push(
            new Promise((resolve, reject) => {
              GlobalVarService.getVars(_postRewardGVs, 'POST_REWARD', client._id)
                .then((result) => {
                  client.vars= result;
                  resolve();
                })
                .catch((error) => {
                  reject(error);
                });
            }));
        }

        Promise.all(enrichmentPromisses)
          .then(() => {
            return res.status(200).json(clients);
          })
          .catch((error) => {
            return res.status(500).send(`Error rertieving clients: ${error}`);
          });
      })
      .catch((error) => {
        return res.status(500).send(`Error rertieving clients: ${error}`);
      });
  });

/**
 * [GET] - Get Post Reward Campaign Version
 *
 */
router.get('/postreward/harvest/postRewardCampaignVersions',
  authService.isAuthenticated, authService.isAuthorized, (req, res) => {

    // read query parameters
    let campaignExpiredUntilDays = req.query.campaignExpiredUntilDays;

    // get all Campaing Versions that:
    // * have a post reward
    // * the post reward version is 2
    // * have expired in the last 'x' days before
    CampaignService.getAggCampaignRewardPool(2, campaignExpiredUntilDays, true)
      .then((cpvs) => {

        // it is time to fill the Global Vars to the Campaign Versions

        let enrichmentPromisses = [];

        // iterate over all Campaign Versions creating a new promisse
        for(let cpv of cpvs){

          let promisse = new Promise((resolve, reject) => {
            GlobalVarService
              .getVars(_postRewardCPVGVs, 'CAMPAIGN_VERSION.POST_REWARD', cpv.campaignVersionId)
              .then((vars) => {

                cpv.vars = GlobalVarService.friendlify(vars);

                resolve();
              })
              .catch(reject);
          });

          enrichmentPromisses.push(promisse);
        }

        // get all global vars
        Promise.all(enrichmentPromisses)
          .then(() => {
            // all fine!
            return res.status(200).json(cpvs);
          })
          .catch((error) => {
            return res.status(500).send(`Error rertieving vars for the campaigns: ${error}`);
          });
      })
      .catch((error) => {
        return res.status(500).send(`Error rertieving campaigns: ${error}`);
      });
  });

/**
 * [GET] - Get Post Reward Orders
 *
 */
router.get('/postreward/harvest/:campaignVersionId/orders',
  authService.isAuthenticated, authService.isAuthorized, (req, res) => {

    let campaignVersionId = req.params.campaignVersionId;
    let minutesBack = req.query.searchMinutesBack;
    let pageSize = req.query.pageSize;
    let pageNumber = req.query.pageNumber;

    // remove minutes from now
    let updatedAt = moment().subtract(minutesBack, 'minutes').format('YYYY-MM-DD HH:mm:ss');

    OrderService.getAggOrderByCampaignVersion(campaignVersionId, updatedAt, {pageSize, pageNumber})
      .then((result) => {

        return res.status(200).json(result);
      })
      .catch((error) => {
        return res.status(500).send(`Error rertieving orders: ${error}`);
      });
  });

/**
 * [POST] - Create Order Post Reward
 */
router.post('/postreward/orders',
  authService.isAuthenticated, authService.isAuthorized, (req, res) => {

    PostConversionRewardService
      .create(req.body)
      .then((result) => {
        return res.status(200).json(result);
      })
      .catch((error) => {
        return res.status(500).send(`Error rertieving orders: ${error}`);
      });

  });

/**
 * [PATCH] - Update Order Post Reward
 */
router.patch('/postreward/:orderPostRewardId/orders',
  authService.isAuthenticated, authService.isAuthorized, (req, res) => {

    let orderPostRewardId = req.params.orderPostRewardId;

    PostConversionRewardService
      .update(orderPostRewardId, req.body)
      .then((result) => {
        return res.status(200).json(result);
      })
      .catch((error) => {
        return res.status(500).send(`Error rertieving Order Post Reward: ${error}`);
      });

  });

/**
 * [GET] - Validates Post Reward entry
 */
router.get('/postreward/:orderPostRewardId/validator',
  authService.isAuthenticated, authService.isAuthorized,(req, res) => {

    let orderPostRewardId = req.params.orderPostRewardId;

    // get Order Post Reward
    PostConversionRewardService
      .get({ _id : orderPostRewardId })
      .then((result) => {

        // validate if it was found
        if(!result || result.length == 0){
          return res.status(404).send('Order Post Reward not found.');
        }

        // Order Post Reward register
        let orderPostReward = result[0];

        let validator = {
          qualified : false,
          status : null,
          message : null
        };

        // has an User Id?
        if(!orderPostReward.userId){

          validator.status = 'no_user_defined';
          validator.message = 'The User was not yet defined for this Reward.';

          return res.status(200).json(validator);
        }

        async.auto({

          //////////////
          // Get Order
          //////////////
          order: (cb) => {

            // Order Promisse for Soreto or External Order
            let orderPromisse = null;

            if(orderPostReward.orderId){

              // soreto order promisse
              orderPromisse = new Promise((resolve, reject) => {
                OrderService.getOrder({ _id: orderPostReward.orderId}, (err, result) => {

                  if(err){
                    reject(err);
                  }else{
                    resolve(result);
                  }
                });
              });
            }else if(orderPostReward.externalOrderId){

              // external order promisse
              orderPromisse = new Promise((resolve, reject) => {

                ExternalOrderService.get({ _id: orderPostReward.externalOrderId})
                  .then((result) => {

                    if(!result || result.length == 0){
                      resolve();
                    }else{
                      resolve(result[0]);
                    }
                  })
                  .catch((error) => {
                    reject(error);
                  });
              });
            }

            orderPromisse
              .then((order) => {

                // Order exists?
                if(!order){
                  return cb({ code: 404, message: 'Order not found.' });
                }else{
                  return cb(null, order);
                }
              })
              .catch((error) => {
                return cb({ code: 500, message: `Error rertieving Order: ${error}` });
              });
          },
          campaignVersionRestrictions : [ 'order', (cb, results) => {

            // get Campaign Version Global Vars
            GlobalVarService
              .getVars(_postRewardCPVGVs, 'CAMPAIGN_VERSION.POST_REWARD', orderPostReward.campaignVersionId)
              .then((vars) => {

                validator.qualified = true;

                vars = GlobalVarService.friendlify(vars);

                if(vars.postRewardOrderMinimumAmount && !isNaN(vars.postRewardOrderMinimumAmount)){

                  let minimum = Number(vars.postRewardOrderMinimumAmount);

                  if(results.order.total < minimum){

                    validator.qualified = false;
                    validator.status = 'BLOCKED_ORDER_MINIMUM_AMOUNT';
                    validator.message = `The order does not achieve the minimum configured amount for this Campaign Version. ${vars.postRewardOrderMinimumAmount}`;
                  }
                }

                cb(null, validator);
              })
              .catch((error) => {
                return cb({ code: 500, message: `Error rertieving CPV vars: ${error}` });
              });

          }],
          /**
           * Test Circular Post Reward
           */
          circularPostReward : ['campaignVersionRestrictions', (cb, results) => {

            let chainedValidator = results.campaignVersionRestrictions;

            // if the validator already has an error
            if(chainedValidator && chainedValidator.qualified === false){
              return cb(null, chainedValidator);
            }

            if(results.order.sharedUrlAccessId){

              SharedUrlService.getSharedUrlByAccessId(results.order.sharedUrlAccessId)
                .then((sua) => {

                  if(sua.type == 'FRIEND_POST_REWARD' ||
                    sua.type == 'SHARER_POST_REWARD'){

                    validator.qualified = false;
                    validator.status = 'BLOCKED_CIRCULAR_REWARD';
                    validator.message = 'Blocked circular reward, the orders was generated by a post reward';

                    cb(null, validator);
                  }else {

                    validator.qualified = true;
                    cb(null, validator);
                  }

                })
                .catch((error) => {
                  return cb({ code: 500, message: `Error rertieving Order: ${error}` });
                });

            }else {
              cb(null);
            }
          }],
          /**
           * Test the amount of Discount Code given to a user
           */
          rewardLimit : ['circularPostReward', (cb, results) => {

            let chainedValidator = results.circularPostReward;

            // if the validator already has an error
            if(chainedValidator.qualified === false){
              return cb(null, chainedValidator);
            }

            // get the related Reward Pool
            RewardPoolService
              .getById(orderPostReward.rewardPoolId)
              .then((rewardPool) => {

                if((orderPostReward.orderUserRole == 'SHARER'
                  && rewardPool.postRewardPerUser)
                  || (orderPostReward.orderUserRole == 'BUYER'
                  && rewardPool.friendPostRewardPerUser)){

                  PostConversionRewardService
                    .countPostRewardPerUser(orderPostReward.userId,
                      orderPostReward.orderUserRole,
                      orderPostReward.rewardPoolId)
                    .then((count) => {

                      let limit = (orderPostReward.orderUserRole == 'SHARER')
                        ? rewardPool.postRewardPerUser
                        : rewardPool.friendPostRewardPerUser;

                      if(limit > count){
                        validator.qualified = true;
                      }else{
                        validator.qualified = false;
                        validator.status = 'BLOCKED_REWARD_LIMIT';
                        validator.message = `Reward limit was achieved. user:${orderPostReward.userId}, limit:${limit}`;
                      }

                      return cb(null, validator);
                    })
                    .catch((err)=>{
                      return cb(`Error retrieving Order Post Reward's User count: ${err}`);
                    });

                }else{

                  validator.qualified = true;
                  return cb(null, validator);
                }
              })
              .catch((err) => {
                return cb(`Error retrieving Order Post Reward's Reward Pool: ${err}`);
              });
          }],

          reward : ['rewardLimit', (cb, results) => {

            let chainedValidator = results.rewardLimit;

            // if the validator already has an error
            if(chainedValidator.qualified === false){
              return cb(null, chainedValidator);
            }

            // if it has a Reward Group Id defined it means
            // that this PostReward record supports multiple rewards
            // no need to move forward
            if(orderPostReward.rewardGroupId){
              return cb(null, chainedValidator);
            }

            RewardService
              .getById(orderPostReward.rewardId)
              .then((reward) => {

                if(_.isEmpty(reward)){
                  return cb(`Reward not found, id: ${orderPostReward.rewardId}`);
                }

                return cb(null, reward);
              })
              .catch((err) => {
                return cb(`Error retrieving Reward: ${err}`);
              });

          }],
          rewardGroup : ['rewardLimit', (cb, results) => {

            let chainedValidator = results.rewardLimit;

            // if the validator already has an error
            if(chainedValidator.qualified === false){
              return cb(null, chainedValidator);
            }

            // if it has no Reward Group Id defined it means
            // that this PostReward record does not support multiple rewards
            if(!orderPostReward.rewardGroupId){
              return cb(null, chainedValidator);
            }

            RewardService
              .getRewardsByGroupId(orderPostReward.rewardGroupId)
              .then((rewards) => {

                ////////////////////////////////////
                // filter Rewards by their rules
                ////////////////////////////////////
                rewards = rewards.filter((r) => {

                  let orderAmountRuleExists =_.get(r, 'rules.orderAmountRange.from');

                  // if no rules defined
                  if(orderAmountRuleExists == null) return true;

                  if(results.order.total >= r.rules.orderAmountRange.from
                      && (!r.rules.orderAmountRange.to || results.order.total <= r.rules.orderAmountRange.to)){
                    return true;
                  }

                  // the reward rule does not match
                  return false;

                });

                if(_.isEmpty(rewards) || rewards.length == 0){

                  validator.qualified = false;
                  validator.status = 'BLOCKED_NO_REWARD_FOUND';
                  validator.message = `No reward found for the group. Group id:${orderPostReward.rewardGroupId}`;

                  return cb(null, validator);
                }

                return cb(null, rewards);
              })
              .catch((err) => {
                return cb(`Error retrieving Reward: ${err}`);
              });

          }],
          /**
           * Test if there is discount codes available
           */
          discountCodeAvailability : ['reward', (cb, results) => {

            let chainedValidator = results.rewardLimit;

            // if the validator already has an error
            if(chainedValidator.qualified === false){
              return cb(null, chainedValidator);
            }

            // if the Post Reward Shared Url was already created
            // this validation is no longer necessary
            if(orderPostReward.sharedUrlId){
              return cb(null, chainedValidator);
            }

            // if it has a Reward Group Id defined it means
            // that this PostReward record supports multiple rewards
            // no need to move forward
            if(orderPostReward.rewardGroupId){
              return cb(null, chainedValidator);
            }

            // if the reward is not batch, this validation is not necessary
            if(results.reward.type == 'discount'){
              return cb(null, chainedValidator);
            }

            // count how much codes available
            RewardDiscountCodeService
              .countDiscountCodesAvailableByRewardId(orderPostReward.rewardId)
              .then((codesAvailableCount) => {

                // count how much post Reward Shared Url still ready to get a code
                PostConversionRewardService
                  .countSharedUrlPendingDiscountCode(orderPostReward.rewardId)
                  .then((pendingSharedUrlCount) => {

                    if(pendingSharedUrlCount >= codesAvailableCount){
                      chainedValidator.qualified = false;
                      chainedValidator.status = 'NO_DISCOUNT_CODE_AVAILABLE';
                      chainedValidator.message = `There is no available discount code quota. Available Codes:${codesAvailableCount}, Pending Shared Url:${pendingSharedUrlCount}`;
                    }else{
                      chainedValidator.qualified = true;
                    }

                    return cb(null, chainedValidator);
                  })
                  .catch((error) => {
                    return cb(`Error counting Pending Shared Url Discount Code: ${error}`);
                  });
              })
              .catch((error) => {
                return cb(`Error counting available Discount Codes: ${error}`);
              });
          }],
          /**
           * Test if there is discount codes available
           */
          discountCodeGroupAvailability : ['rewardGroup', (cb, results) => {

            let chainedValidator = results.rewardLimit;

            // if the validator already has an error
            if(chainedValidator.qualified === false){
              return cb(null, chainedValidator);
            }

            // if the Post Reward Shared Url was already created
            // this validation is no longer necessary
            if(orderPostReward.sharedUrlId){
              return cb(null, chainedValidator);
            }

            // if it has no Reward Group Id defined it means
            // that this PostReward record does not support multiple rewards
            // no need to move forward
            if(!orderPostReward.rewardGroupId){
              return cb(null, chainedValidator);
            }

            let batchRewards = results.rewardGroup.filter(r => r.type != 'discount');
            let promisses = [];

            for(let reward of batchRewards){

              let promisse = new Promise((resolve, reject) => {

                // count how much codes available
                RewardDiscountCodeService
                  .countDiscountCodesAvailableByRewardId(reward.reward_id)
                  .then((codesAvailableCount) => {
                    // count how much post Reward Shared Url still ready to get a code
                    PostConversionRewardService
                      .countSharedUrlPendingDiscountCode(reward.reward_id)
                      .then((pendingSharedUrlCount) => {

                        resolve({ reward, pendingSharedUrlCount, codesAvailableCount });
                      })
                      .catch((error) => {
                        reject(error);
                      });
                  })
                  .catch((error) => {
                    reject(error);
                  });
              });

              promisses.push(promisse);
            }

            Promise.all(promisses)
              .then((availabilities) => {

                for(let availability of availabilities){

                  if(availability.pendingSharedUrlCount >= availability.codesAvailableCount){

                    chainedValidator.qualified = false;
                    chainedValidator.status = 'NO_DISCOUNT_CODE_AVAILABLE';
                    chainedValidator.message = `There is no discount code available for the reward: ${availability.reward.name}. Available Codes:${availability.codesAvailableCount}, Pending Shared Url:${availability.pendingSharedUrlCount}`;

                    // the lack of a single code in a group is enough to block the reward
                    return cb(null, chainedValidator);
                  }
                }

                return cb(null, chainedValidator);
              })
              .catch((error) => {
                return cb(`Error counting available Discount Codes: ${error}`);
              });

          }],
          final: ['discountCodeAvailability', 'discountCodeGroupAvailability', (cb, results) => {
            return cb(null, results.discountCodeAvailability);
          }]
        }, (error, results) => {

          if(error){

            let errorCode = error.code || 500;
            let errorMessage = error.message || JSON.stringify(error);

            return res.status(errorCode).send(errorMessage);
          }

          return res.status(200).send(results.final);
        });
      })
      .catch((err) => {
        return res.status(500).send(`Error rertieving Order Post Reward: ${err}`);
      });

  });

/**
 * [GET] - Get Order Post Reward
 */
router.get('/postreward/report',
  authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

    let clientId = req.query.clientId;
    let startDate = req.query.startDate;
    let endDate = req.query.endDate;
    let userEmail = req.query.userEmail;
    let rewardRetrieved = req.query.rewardRetrieved;
    let limit = req.query.limit;
    let offset = req.query.offset;
    let sortField = req.query.sortField;
    let sortOrder = req.query.sortOrder;
    try {

      const result = await PostConversionRewardService.getAggOrderPostRewardReport(limit, offset,sortField,sortOrder, clientId, startDate, endDate, userEmail, rewardRetrieved);
      return responseHandler.result(res, result);

    } catch (error) {
      return responseHandler.errorComposer(res, error);
    }
  });

/**
 * [GET] - Get Order Post Reward
 */
router.get('/postreward/orders',
  authService.isAuthenticated, authService.isAuthorized, (req, res) => {

    let processed = req.query.processed ? _utility.parseBoolean(req.query.processed) : null;
    let blockedPostReward = req.query.blockedPostReward ? _utility.parseBoolean(req.query.blockedPostReward) : null;
    let fromDate = req.query.searchDaysBack ? moment().subtract(req.query.searchDaysBack, 'days').format('YYYY-MM-DD') : null;

    PostConversionRewardService
      .getAggOrderPostReward(processed, blockedPostReward, fromDate)
      .then((result) => {
        return res.status(200).json(result);
      })
      .catch((error) => {
        return res.status(500).send(`Error rertieving orders: ${error}`);
      });

  });

/**
 * [POST] - Set the Order Post Reward User
 */
router.post('/postreward/:orderPostRewardId/users',
  authService.isAuthenticated, authService.isAuthorized, (req, res) => {

    let orderPostRewardId = req.params.orderPostRewardId;

    async.auto({

      // Start Point: Order Post Reward
      orderPostReward : (cb) => {

        PostConversionRewardService
          .get({ _id : orderPostRewardId })
          .then((result) => {

            // validate if it was found
            if(!result || result.length == 0){
              return cb({ code: 404, message: 'Order Post Reward not found.' });
            }

            // Order Post Reward register
            let orderPostReward = result[0];

            return cb(null, orderPostReward);
          }).catch((error) => {
            return cb({ code: 500, message: `Error rertieving Order Post Reward: ${error}` });
          });

      },

      //////////////
      // Order
      //////////////
      order: ['orderPostReward', (cb, results) => {

        // Order Promisse for Soreto or External Order
        let orderPromisse = null;

        if(results.orderPostReward.orderId){

          // soreto order promisse
          orderPromisse = new Promise((resolve, reject) => {
            OrderService.getOrder({ _id: results.orderPostReward.orderId}, (err, result) => {

              if(err){
                reject(err);
              }else{
                resolve(result);
              }
            });
          });
        }else if(results.orderPostReward.externalOrderId){

          // external order promisse
          orderPromisse = new Promise((resolve, reject) => {
            ExternalOrderService.get({ _id: results.orderPostReward.externalOrderId})
              .then((result) => {

                if(!result || result.length == 0){
                  resolve();
                }else{
                  resolve(result[0]);
                }
              })
              .catch((error) => {
                reject(error);
              });
          });
        }

        orderPromisse
          .then((order) => {

            // Order exists?
            if(!order){
              return cb({ code: 404, message: 'Order not found.' });
            }else{
              return cb(null, order);
            }
          })
          .catch((error) => {
            return cb({ code: 500, message: `Error rertieving Order: ${error}` });
          });
      }],

      /////////////////////
      // Shared Url Access
      /////////////////////
      sharedUrlAccess: [ 'order', (cb, results) => {


        // Shared Url Access Id
        let sharedUrlAccessId = results.order.sharedUrlAccessId;

        // get Shared Url Access Id
        SharedUrlService
          .getUrlAccessed({_id:sharedUrlAccessId},(err, sharedUrlAccess) => {

            // error?
            if(err){
              return cb({ code: 500, message:`Error retrieving Shared Url Access: ${err}`});
            }

            // Shared Url Access exists?
            if(!sharedUrlAccess){
              return cb({ code: 404, message:'Shared Url Access not found.'});
            }

            return cb(null, sharedUrlAccess);

          });
      }],

      ///////////////////////////////
      // Shared Url Access User Info
      ///////////////////////////////
      sharedUrlAccessUserInfo: ['sharedUrlAccess', (cb, results) => {

        // get Shared Url Access User Info
        SharedUrlAccessUserInfoService
          .get({sharedUrlAccessId : results.sharedUrlAccess._id })
          .then((userInfos) => {

            return cb(null, userInfos);
          })
          .catch((error) => {
            return cb({ code: 500, message: `Error retrieving Shared Url Access User Info: ${error}`});
          });
      }],

      ///////////////////////////////////////
      // Shared Url Access User Same Session
      ///////////////////////////////////////
      sharedUrlAccessUserInfoSameSession: ['sharedUrlAccessUserInfo', (cb, results) => {

        if(!results.sharedUrlAccessUserInfo || !results.sharedUrlAccessUserInfo.length == 0){

          // there is no Shared Url Access User info

          // get Shared Url Access with the same Session
          SharedUrlService
            .getUrlAccesseds({ sessionId : results.sharedUrlAccess.sessionId },
              (err, sharedUrlAccessSameSession) => {

                if(err){
                  return cb({ code: 500, message: `Error retrieving Shared Url Access ${err}`});
                }

                let infoPromisses = [];

                if(sharedUrlAccessSameSession && sharedUrlAccessSameSession.length > 0){

                  for(let suass of sharedUrlAccessSameSession){
                    infoPromisses.push(SharedUrlAccessUserInfoService.get({ sharedUrlAccessId : suass._id}));
                  }

                  Promise.all(infoPromisses)
                    .then((results) => {
                      return cb(null, results.flatMap(x => x));
                    })
                    .catch((error) => {
                      return cb({ code: 500, message: `Error retrieving Shared Url Access User Info: ${error}`});
                    });

                }else{
                  return cb(null);
                }

              });

        }else{
          cb(null);
        }
      }],

      ///////////////////////
      // Shared Url
      ///////////////////////
      sharedUrl: ['sharedUrlAccessUserInfoSameSession', (cb, results) => {


        let sharedUrlId = (results.sharedUrlAccess)
          ? results.sharedUrlAccess.sharedUrlId
          : results.order.meta.sharedUrlId;

        SharedUrlService.getSharedUrl({ _id:sharedUrlId }, (err, sharedUrl) => {

          if(err){
            return cb({ code: 500, message: `Error retrieving Shared Url: ${err}`});
          }

          if(!sharedUrl){
            return cb({ code: 404, message:'Shared Url not found.'});
          }else{
            return cb(null, sharedUrl);
          }
        });
      }],

      ///////////////////////
      // User Id
      ///////////////////////
      userId: ['sharedUrl', (cb, results) => {

        if(results.orderPostReward.orderUserRole == 'SHARER'){

          return cb(null, results.sharedUrl.userId);

        }else if (results.orderPostReward.orderUserRole == 'BUYER'){

          let email = null;

          if(results.order && results.order.buyerId){
            return cb(null, results.order.buyerId);
          }else if (results.order && results.order.buyerEmail){
            email = results.order.buyerEmail;
          }else if(results.sharedUrlAccessUserInfo && results.sharedUrlAccessUserInfo > 0){

            email = results.sharedUrlAccessUserInfo[0].email;

          }else if (results.sharedUrlAccessUserInfoSameSession && results.sharedUrlAccessUserInfoSameSession.length > 0){

            // order by created at
            results.sharedUrlAccessUserInfoSameSession.sort(function(a,b){
              return b.createdAt - a.createdAt;
            });

            email = results.sharedUrlAccessUserInfoSameSession[0].email;
          }

          if(email){

            // create user by email if it does not exist
            UserService.createUserByEmailWhenNotExists(email)
              .then((user) => {
                return cb(null, user._id);
              })
              .catch((error) => {
                return cb({ code: 500, message: `Error creating User by email "${email}" : ${error}`});
              });
          }else{

            return cb({ code: 404, message: `It was not possible to found a ${results.orderPostReward.orderUserRole} user `});
          }
        }
      }],

      ///////////////////////
      // final
      ///////////////////////
      final : ['userId', (cb, results) => {

        // update Order Post Reward
        PostConversionRewardService
          .update(results.orderPostReward._id, {userId : results.userId})
          .then(() => {
            return cb(null);
          })
          .catch((error) => cb(error));
      }]

    }, (error) => {

      if(error){

        let errorCode = error.code || 500;
        let errorMessage = error.message || JSON.stringify(error);

        return res.status(errorCode).send(errorMessage);
      }

      return res.status(200).send();

    });
  });

/**
 * [POST] - Create Order Post Reward Shared Url
 */
router.post('/postreward/:orderPostRewardId/sharedUrl',
  authService.isAuthenticated, authService.isAuthorized, (req, res) => {

    let orderPostRewardId = req.params.orderPostRewardId;

    PostConversionRewardService
      .get({ _id : orderPostRewardId })
      .then((result) => {

        if(!result || result.length == 0){
          return res.status(404).send('Order Post Reward not found.');
        }

        let orderPostReward = result[0];
        let orderPromisse = null;

        // if Order Post Reward already exists
        if(orderPostReward.sharedUrlId){
          return res.status(200).send();
        }

        if(orderPostReward.orderId){

          // soreto order promisse
          orderPromisse = new Promise((resolve, reject) => {
            OrderService.getOrder({ _id: orderPostReward.orderId}, (err, result) => {

              if(err){
                reject(err);
              }else{
                resolve(result);
              }
            });
          });
        }else if(orderPostReward.externalOrderId){

          // external order promisse
          orderPromisse = new Promise((resolve, reject) => {
            ExternalOrderService.get({ _id: orderPostReward.externalOrderId})
              .then((result) => {

                if(!result || result.length == 0){
                  resolve();
                }else{
                  resolve(result[0]);
                }
              })
              .catch((error) => {
                reject(error);
              });
          });
        }

        orderPromisse
          .then((order) => {

            if(!order){
              return res.status(404).send(`It was not possible to find the related Order`);
            }

            let sharedUrlAccessId = order.sharedUrlAccessId;

            SharedUrlService
              .getUrlAccessed({_id:sharedUrlAccessId},(err, sharedUrlAccess) => {

                if(err){
                  return res.status(500).send();
                }

                let sharedUrlId = (sharedUrlAccess) ? sharedUrlAccess.sharedUrlId : order.meta.sharedUrlId;

                SharedUrlService.getSharedUrl({ _id:sharedUrlId }, (err, sharedUrl) => {

                  if(err){
                    return res.status(500).send();
                  }

                  let postRewardSharedUrl = _.pick(sharedUrl,
                    ['clientId',
                      'userId',
                      'productUrl',
                      'campaignId',
                      'campaignVersionId',
                      'testMode',
                      'sharedUrlGroupId',
                      'socialPlatform']
                  );

                  if(orderPostReward.orderUserRole == 'BUYER'){
                    postRewardSharedUrl.type = 'FRIEND_POST_REWARD';

                    // if the access was provinient from a Super Campaign
                    // the Order Friend Post Reward link must be related to the Super Campaign too
                    if(sharedUrlAccess.overrideCampaignVersionId){
                      postRewardSharedUrl.campaignVersionId = sharedUrlAccess.overrideCampaignVersionId;
                    }

                  }else if (orderPostReward.orderUserRole == 'SHARER'){
                    postRewardSharedUrl.type = 'SHARER_POST_REWARD';
                  }

                  postRewardSharedUrl.userId = orderPostReward.userId;

                  SharedUrlService.createShortUrl(postRewardSharedUrl, (err, newPostRewardSharedUrl) => {

                    if(err){
                      err = err.message || err;
                      return res.status(500).send(`Error creating ${postRewardSharedUrl.type} shared URL: ${err}`);
                    }

                    orderPostReward.sharedUrlId = newPostRewardSharedUrl._id;

                    // update Order Post Reward
                    PostConversionRewardService
                      .update(orderPostReward._id, orderPostReward)
                      .then(() => {
                        return res.status(200).send();
                      });

                    msClient.act(_.extend(constants.EVENTS.MARKETPLACE.NOTIFY_POST_REWARD , { postRewardSharedUrl: newPostRewardSharedUrl }));
                  });
                });
              });
          });
      })
      .catch((error) => {
        return res.status(500).send(`Error rertieving Order Post Reward: ${error}`);
      });
  });

/**
 * [POST] - Send Order Post Reward email
 */
router.post('/postreward/:orderPostRewardId/email',
  authService.isAuthenticated, authService.isAuthorized, (req, res) => {

    let orderPostRewardId = req.params.orderPostRewardId;

    PostConversionRewardService
      .get({ _id : orderPostRewardId })
      .then((result) => {

        if(!result || result.length == 0){
          return res.status(404).send('Order Post Reward not found.');
        }

        let orderPostReward = result[0];

        let promisses = [];

        // 0 - user, 1 - shared url
        promisses.push(promisify(UserService.getUser)(orderPostReward.userId));
        promisses.push(SharedUrlService.getSharedUrlById(orderPostReward.sharedUrlId));

        Promise.all(promisses)
          .then((results) => {

            let user = results[0];
            let sharedUrl = results[1];

            // get the Campaign Custom String to compose the final Shared Url Link
            sharedUrlHelper.getShortUrlCustomStringComponentByCampaignIdOrCampaignVersion(null, sharedUrl.campaignVersionId)
              .then((customString) => {

                sharedUrl.shortUrl = customString + sharedUrl.shortUrl;

                sendPostRewardDiscountMail_v2(orderPostReward, user, sharedUrl)
                  .then(() => {
                    return res.status(200).send();
                  })
                  .catch((err) => {
                    return res.status(500).send(`Error sending email: ${err}`);
                  });

              })
              .catch((err) => {
                return res.status(500).send(`Error trying to build the Shared Url: ${err}`);
              });
          })
          .catch((err) => {
            return res.status(500).send(`Error retireving Order Post Reward Details ${err}`);
          });
      })
      .catch((error) => {
        return res.status(500).send(`Error rertieving Order Post Reward: ${error}`);
      });
  });

/**
 * [POST] - Create Order Post Reward Log entry
 */
router.post('/postreward/order/log',
  authService.isAuthenticated, authService.isAuthorized, (req, res) => {

    PostConversionRewardService
      .log(req.body.orderPostRewardId, req.body.step, req.body.log, req.body.error)
      .then(() => {
        return res.status(200).send();
      })
      .catch((error) => {
        return res.status(500).send(`Error rertieving orders: ${error}`);
      });

  });

/**
 * [POST] - Simulate Post Reward Email
 */
router.post('/postreward/simulate',
  authService.isAuthenticated, authService.isAuthorized, (req, res) => {

    // validates missing parameters
    let requiredParameters = ['campaignVersionId', 'userEmail', 'postRewardType'];
    let missingParams = [];

    for(let reqParam of requiredParameters){
      if(!req.query[reqParam]){
        missingParams.push(reqParam);
      }
    }

    // any missing param?
    if(missingParams && missingParams.length > 0){
      return res.status(400).send(`'Missing ${missingParams.join(',')} parameter(s).'`);
    }

    let cpvId = req.query.campaignVersionId;
    let userEmail = req.query.userEmail;
    let postRewardType = req.query.postRewardType;

    // start the chained execution
    async.auto(
      {

        /**
         * Get user by email
         */
        user: (cb) => {

          userService.getUserByEmail(userEmail, (error, user) => {

            // any error?
            if(error){
              return cb(error);
            }

            // no result?
            if(!user){
              return cb({ code: 404, message: 'Could not find a user by the informed email', friendly: true });
            }

            // all good
            return cb(null, user);

          });

        },

        /**
         * Get an existing Post Reward Shared Ur, create when it does not exist
         */
        sharedUrl: ['user', (cb, r) => {

          SharedUrlService.getSharedUrls({ campaignVersionId: cpvId, userId: r.user._id }, null,
            (error, sus) => {

              const USE_EXISTING_SHARED_URL = false;

              // any error?
              if(error){
                return cb(error);
              }

              // no result?
              if(!sus){
                return cb({ code: 404, message: 'Could not find any Shared Url for the Campaign Version and User informed', friendly: true });
              }

              // search for an existing Post Reward SU

              // order by created at desc
              sus = sus.sort(function(a,b){
                return new Date(b.createdAt) - new Date(a.createdAt);
              });

              if (USE_EXISTING_SHARED_URL) {

                let postRewardSu = sus.find(s => s.type == postRewardType);

                if(postRewardSu){
                  return cb(null, postRewardSu);
                }

              }
              // at this point we must generate a fake SU to simulate the Post Reward

              // get the shared one
              let sharedSu = sus.find(s => s.type == 'SHARED');

              // validates it again
              if(!sharedSu){
                return cb({ code: 404, message: 'Could not find a Shared Url for the Campaign Version and User informed', friendly: true });
              }

              // copy properties from the existing ones
              let newPostRewardSu = _.pick(sharedSu,
                ['clientId',
                  'userId',
                  'productUrl',
                  'campaignId',
                  'campaignVersionId',
                  'testMode',
                  'sharedUrlGroupId',
                  'socialPlatform']
              );

              newPostRewardSu.type = postRewardType;
              newPostRewardSu.userId = r.user._id;

              // create a new Post reward SU
              SharedUrlService.createShortUrl(newPostRewardSu, (error, createdPostRewardSharedUrl) => {

                // any error?
                if(error){
                  return cb(error);
                }

                return cb(null, createdPostRewardSharedUrl);
              });

            });

        }],

        /**
         * Sends the email
         */
        email: [ 'sharedUrl', (cb, result) => {

          // create a fake Order Post Reward
          let orderPostReward = {
            campaignVersionId: cpvId,
            orderUserRole : postRewardType == 'SHARER_POST_REWARD' ? 'SHARER' : 'FRIEND'
          };

          // send email
          sendPostRewardDiscountMail_v2(orderPostReward, result.user, result.sharedUrl)
            .then(() => {
              return cb();
            })
            .catch((error) => {
              return cb(error);
            });

        }]
      },
      (error) => {

        // any error?
        if(error){

          if(error.friendly === true){
            return res.status(error.code).send(error.message);
          }else{
            return res.status(500).send(error);
          }
        }

        // everything went well!
        return res.status(200).send();
      }
    );

  });

/**
 * LEGACY POST REWARD ENDPOINTS
 */
router.post('/postConversionReward/fire',authService.isAuthenticated, authService.isAuthorized, function (req, res) {

  let postConversionReward = new PostConversionReward();

  postConversionReward.processDiscountPostConversionRewards()
    .then(() => {

      postConversionReward.processBatchDiscountPostConversionRewards()
        .then(() => {
          return res.status(200).send('Post reward sucessfully processed.');
        })
        .catch((error) => {
          return res.status(500).send(`Error processing batch discount: ${error}`);
        });
    })
    .catch((error) => {
      return res.status(500).send(`Error processing regular discount: ${error}`);
    });

});

router.post('/postConversionReward/fire/:orderId',authService.isAuthenticated, authService.isAuthorized, function (req, res) {

  let postConversionReward = new PostConversionReward();
  var orderId = req.params.orderId;
  const query = req.query;

  // is it post reward version 2 ?
  if(query.postRewardVersion == 2){

    let filter = (query.type == 'external-order') ? { externalOrderId: orderId } : { orderId: orderId };

    PostConversionRewardService
      .get(filter)
      .then((result) => {

        if(_.isEmpty(result)){
          return res.status(400).send(`[POST REWARD VERSION : 2]: The Order is not available to be rewarded.`);
        }

        // iterate over all Order Post Reward
        // validation
        for(let orderPostReward of result){

          // is the user Id defined?
          if(!orderPostReward.userId){
            return res.status(400).send(`[POST REWARD VERSION : 2]: The Order Post Reward has no User defined. Order Role: ${orderPostReward.orderUserRole}`);
          }

          // is Shared Url defined?
          if(!orderPostReward.sharedUrlId){
            return res.status(400).send(`[POST REWARD VERSION : 2]: The Order Post Reward has no Shared Url defined. Order Role: ${orderPostReward.orderUserRole}`);
          }
        }

        let sendEmailPromisses = [];

        // iterate over all Order Post Reward
        for(let orderPostReward of result){

          let promisses = [];

          // 0 - user, 1 - shared url
          promisses.push(promisify(UserService.getUser)(orderPostReward.userId));
          promisses.push(SharedUrlService.getSharedUrlById(orderPostReward.sharedUrlId));

          sendEmailPromisses.push(new Promise((resolve, reject) => {

            Promise.all(promisses)
              .then((results) => {

                let user = results[0];
                let sharedUrl = results[1];

                sendPostRewardDiscountMail_v2(orderPostReward, user, sharedUrl)
                  .then(() => {
                    resolve();
                  })
                  .catch((err) => {
                    reject(`Error sending email: ${err}`);
                  });
              })
              .catch((err) => {
                reject(`Error retireving Order Post Reward Details ${err}`);
              });

          }));
        }

        // send Emails
        Promise.all(sendEmailPromisses)
          .then(() => {
            return res.status(200).send();
          })
          .catch((error) => {
            return res.status(500).send(`Error: ${error}`);
          });

      })
      .catch((error) => {
        return res.status(500).send(`Error: ${error}`);
      });

  }else{

    OrderService.getPaidOrdersWithOustandingRewards([orderId])
      .then((result) => {

        if(_.isEmpty(result)){
          return res.status(400).send(`[POST REWARD VERSION : 1]: The Order is not available to be rewarded.`);
        }

        let callBoth = (!query || !query.discountType);
        let callRegulatDiscount = !callBoth && query.discountType == 'REGULAR';
        let callBatchDiscount = !callBoth && query.discountType == 'BATCH';

        if([callBoth, callRegulatDiscount, callBatchDiscount].every((i) => i === false)){
          return res.status(400).json('The provided Discount Type parameter is not valid');
        }

        if(callBoth){

          postConversionReward.processDiscountPostConversionRewards([orderId])
            .then(() => {

              postConversionReward.processBatchDiscountPostConversionRewards([orderId])
                .then(() => {
                  return res.status(200).send('Post reward sucessfully processed.');
                })
                .catch((error) => {
                  return res.status(500).send(`Error processing batch discount: ${error}`);
                });
            })
            .catch((error) => {
              return res.status(500).send(`Error processing regular discount: ${error}`);
            });
        }else{

          if(callRegulatDiscount){

            postConversionReward.processDiscountPostConversionRewards([orderId])
              .then(() => {
                return res.status(200).send('Post reward sucessfully processed.');
              })
              .catch((error) => {
                return res.status(500).send(`Error processing regular discount: ${error}`);
              });

          }
          if(callBatchDiscount){

            postConversionReward.processBatchDiscountPostConversionRewards([orderId])
              .then(() => {
                return res.status(200).send('Post reward sucessfully processed.');
              })
              .catch((error) => {
                return res.status(500).send(`Error processing batch discount: ${error}`);
              });
          }
        }
      })
      .catch((error) => {
        return res.status(500).send(`Error: ${error}`);
      });
  }
});

module.exports = router;
