var moment = require('moment');
var _ = require('lodash');
var logger = require('./../common/winstonLogging');
var util = require('./../common/utility');
var orderService = require('./../services/order');
var userService = require('./../services/user');

const processPostConversionRewardService = require('./../services/processPostConversionReward');
const {sendPostRewardDiscountMail} = require('./../services/externalServices/sendEmail');
const rewardDiscountCodeService = require('./../services/rewardDiscountCode');

class PostConversionRewardService {

  constructor() {
  }

  retriveActSave(retriveString,action,saveString,errorstring){
    return new Promise((resolve)=>{
      processPostConversionRewardService.getProcessWithoutNextStatusWithEmail(retriveString,saveString)
        .then((processes)=>{
          const promiseArray = processes.map((obj)=>{
            obj._id = undefined;
            const processColoumns = ['processId', 'rewardId','orderId','processStatus',
              'meta','externalOrderId','sharedUrlId', 'targetUserId', 'targetEmail', 'targetUserName', 'type'];
            return action(obj)
              .then((processValue)=>{
                obj = _.pick(obj,processColoumns);
                obj.processStatus = saveString;
                obj.meta = {previousProcessValue:processValue};
                return processPostConversionRewardService.create(obj);
              })
              .catch((err)=>{
                logger.error(err);
                obj.meta = {err:err};
                obj.processStatus = errorstring;
                obj = _.pick(obj,processColoumns);
                return processPostConversionRewardService.create(obj);
              });
          });
          return Promise.all(promiseArray);
        })
        .then(()=>{
          return resolve();
        }).catch(()=>{
          return resolve();
        });
    });
  }

  processDiscountPostConversionRewards(orderIds){

    return new Promise((resolve, reject)=>{

      logger.info(`||| Discount process started |||`);

      orderService.getPaidOrdersWithOustandingRewards(orderIds)
        .then((orders)=>{

          this.mapOrders(orders, 'discount')
            .then((ordersWithDiscount) => {

              if(!ordersWithDiscount || ordersWithDiscount.length == 0){
                logger.info(`---> There's no order to be processed`);
                resolve();
              }

              function getRewardAndSendEmail(order){

                return new Promise((resolve,reject)=>{
                  if(!order) return resolve();
                  rewardDiscountCodeService.getValidDiscountCode(order.rewardId)
                    .then((reward)=>{
                      if (!reward[0]){
                        return reject('no reward found');
                      }
                      reward = _.pick(reward[0],[
                        'code',
                        'valueAmount',
                        'discountType',
                        'validFrom',
                        'validTo']);

                      reward.base64code = Buffer.from(reward.code).toString('base64');
                      reward.validFrom = moment(reward.validFrom).format('DD/MM/YYYY');
                      reward.validTo = (reward.validTo) ? moment(reward.validTo).format('DD/MM/YYYY') : null;

                      let rewardTarget = 'SHARER';

                      if(order.type === 'FRIEND'){
                        rewardTarget = 'FRIEND';
                      }

                      let emailDetails = _.extend(reward,{
                        campaignVersionId:order.campaignVersionId,
                        firstName:order.targetUserName,
                        sharedUrlId:order.sharedUrlId,
                        clientId:order.clientId,
                        rewardTarget: rewardTarget
                      });

                      return sendPostRewardDiscountMail(order.targetEmail, emailDetails);
                    }).then(()=>{
                      return resolve();
                    }).catch((err)=>{
                      return reject(err);
                    });
                });
              }

              // get all registers with email and  no userId
              // some orders may not have a user already created
              // the process should create the user at runtime
              let emailsFromOrdersWithNoUserId = _.filter(ordersWithDiscount, order => !order.userId && order.email);

              emailsFromOrdersWithNoUserId = emailsFromOrdersWithNoUserId.map(order => order.email);

              // get a duplicated-free list
              emailsFromOrdersWithNoUserId = _.uniq(emailsFromOrdersWithNoUserId);

              if(emailsFromOrdersWithNoUserId && emailsFromOrdersWithNoUserId.length > 0){
                logger.info(`There are ${emailsFromOrdersWithNoUserId.length} untracked users to reward`);
              }

              // create all users before the main execution
              Promise.all(emailsFromOrdersWithNoUserId.map(this.createUserWhenNotExists))
                .then(() => {

                  // deal with non blocked orders
                  const straightOrderProcess = Promise.all(ordersWithDiscount.filter(order => !order.blocked).map(this.startPostProcess)).then(() => {
                    return this.retriveActSave('discount-started-post-process',getRewardAndSendEmail,'process-complete','err-discount-started-process-email-not-sent');
                  });

                  // deal with blocked orders
                  const blockedOrderProcess = Promise.all(ordersWithDiscount.filter(order => order.blocked).map(this.handleBlockedOrders));

                  // main execution
                  // fire the execution of blocked and non blocked orders
                  Promise.all([straightOrderProcess, blockedOrderProcess]).then(()=>{
                    resolve({success:true});
                  })
                    .catch((err)=>{
                      logger.error(err);
                      resolve({
                        success:false,
                        err:err
                      });
                    });
                });
            })
            .catch(reject);
        });
    });
  }

  processBatchDiscountPostConversionRewards(orderIds){

    return new Promise((resolve, reject)=>{

      logger.info(`||| Batch discount process started |||`);

      orderService.getPaidOrdersWithOustandingRewards(orderIds)
        .then((orders)=>{

          this.mapOrders(orders, 'batch-discount')
            .then((ordersWithDiscount) => {

              if(!ordersWithDiscount || ordersWithDiscount.length == 0){
                logger.info(`---> There's no order to be processed`);
                resolve();
              }

              function getBatchDiscountCodeAndAssignUserId(order){

                const postRewardType = order.type === 'SHARER' ? 'advocatePostConversion' : 'friendPostReward';

                return rewardDiscountCodeService.getBatchDiscountCodeAndAssignUserId(order.campaignVersionId, postRewardType , order.targetUserId);
              }

              function sendEmail(order){
                const codeDetails = _.get(order,'meta.previousProcessValue');

                if(codeDetails.code){
                  let emailDetails = {};
                  emailDetails.firstName = order.targetUserName;
                  emailDetails.code = codeDetails.code;
                  emailDetails.base64code = Buffer.from(codeDetails.code).toString('base64');
                  emailDetails.validFrom = moment(codeDetails.valid_from).format('DD/MM/YYYY');
                  emailDetails.validTo = (codeDetails.valid_to) ? moment(codeDetails.valid_to).format('DD/MM/YYYY') : null;
                  emailDetails.rewardAmmount = codeDetails.value_amount;
                  emailDetails.discountType = codeDetails.discount_type;
                  emailDetails.campaignVersionId = order.campaignVersionId;
                  emailDetails.sharedUrlId = order.sharedUrlId;
                  emailDetails.clientId = order.clientId;
                  let rewardTarget = order.type === 'SHARER' ? 'SHARER' : 'FRIEND';
                  emailDetails.rewardTarget = rewardTarget;

                  return sendPostRewardDiscountMail(order.targetEmail, emailDetails);
                }else{
                  return Promise.reject('no-previous-process-value');
                }
              }

              // get all registers with email and  no userId
              // some orders may not have a user already created
              // the process should create the user at runtime
              let emailsFromOrdersWithNoUserId = _.filter(ordersWithDiscount, order => !order.userId && order.email);

              emailsFromOrdersWithNoUserId = emailsFromOrdersWithNoUserId.map(order => order.email);

              // get a duplicated-free list
              emailsFromOrdersWithNoUserId = _.uniq(emailsFromOrdersWithNoUserId);

              if(emailsFromOrdersWithNoUserId && emailsFromOrdersWithNoUserId.length > 0){
                logger.info(`There are ${emailsFromOrdersWithNoUserId.length} untracked users to reward`);
              }

              // create all users before the main execution
              Promise.all(emailsFromOrdersWithNoUserId.map(this.createUserWhenNotExists))
                .then(() => {

                  // deal with non blocked orders
                  const straightOrderProcess = Promise.all(ordersWithDiscount.filter(order => !order.blocked).map(this.startPostProcess))
                    .then(() => {
                      return this.retriveActSave('batch-discount-started-post-process',getBatchDiscountCodeAndAssignUserId,'batch-discount-assigned-rewards','err-batch-discount-rewards-not-assigned');
                    })
                    .then(() =>{
                      return this.retriveActSave('batch-discount-assigned-rewards',sendEmail,'process-complete','err-batch-discount-mail-not-sent');
                    });

                  // deal with blocked orders
                  const blockedOrderProcess = Promise.all(ordersWithDiscount.filter(order => order.blocked).map(this.handleBlockedOrders));

                  // main execution
                  // fire the execution of blocked and non blocked orders
                  Promise.all([straightOrderProcess, blockedOrderProcess])
                    .then(()=>{
                      resolve({success:true});
                    })
                    .catch((err)=>{
                      logger.error(err);
                      resolve({
                        success:false,
                        err:err
                      });
                    });
                });
            })
            .catch(reject);
        });
    });
  }

  handleBlockedOrders(order){

    return new Promise((resolve, reject) => {

      if (!order) return resolve();

      let processObject = {
        orderId:order.orderType === 'order' ? order.orderId : null,
        rewardId:order.rewardId,
        processStatus: (order.processStatus) ? order.processStatus : order.rewardType === 'discount' ? 'discount-blocked-reward' : 'batch-discount-blocked-reward',
        processId: util.generateRandomKey(),
        externalOrderId: order.orderType === 'external-order' ? order.orderId : null,
        sharedUrlId: order.sharedUrlId,
        targetUserId: order.userId,
        targetEmail: order.email,
        targetUserName: order.userName
      };

      processPostConversionRewardService.create(processObject)
        .then((createdObject)=>{
          processPostConversionRewardService.create({...createdObject, _id: undefined, processStatus: 'process-complete'});
          resolve();
        }).catch((err)=>{
          reject(err);
        });
    });
  }

  createUserWhenNotExists(email){

    return new Promise((resolve, reject) => {

      logger.info(`Creating an user for the email: ${email}`);

      userService.getUserByEmail(email, (err, userByEmail) => {

        // is there an error?
        if(err){
          reject(err);
        }else if(!userByEmail){

          let userNameBasedOnEmail = email.substring(0, email.lastIndexOf('@'));

          // create user
          userService.createUser(
            userNameBasedOnEmail, 'UNREGISTERED', email, util.generateRandomKey(), 'user',  {}, false,
            (err) => {

              // is there an error
              if(err){
                reject(err);
              }

              logger.info(`A new user was created for the email: ${email}`);
              resolve();
            });

        }else{
          logger.info(`User already exists for the email: ${email}`);
          resolve();
        }
      });

    });
  }

  startPostProcess(order){
    return new Promise((resolve, reject) => {
      if (!order) return resolve();

      logger.info(`----> Processing order: ${order.orderId}`);

      let processObject = {
        orderId:order.orderType === 'order' ? order.orderId : null,
        rewardId:order.rewardId,
        processStatus: order.rewardType === 'discount' ? 'discount-started-post-process' :  'batch-discount-started-post-process',
        processId: util.generateRandomKey(),
        externalOrderId: order.orderType === 'external-order' ? order.orderId : null,
        sharedUrlId: order.sharedUrlId,
        type: order.postRewardType,
        targetUserId: order.userId,
        targetEmail: order.email,
        targetUserName: order.userName
      };

      if(processObject.type === 'FRIEND'){

        // has a target user id?
        if(processObject.targetUserId){

          // for FRIEND post reward we cannot send the reward if it is the same person
          if(processObject.targetUserId != order.sharerUserId){

            // create row
            processPostConversionRewardService.create(processObject)
              .then(()=>{
                logger.info(`----> Order : ${order.orderId}, was started.`);
                resolve();
              }).catch((err)=>{
                reject(err);
              });

          }else{

            handleBuyerIsSharerOrders(order)
              .then(resolve)
              .catch((err)=>{
                reject(err);
              });
          }

        }else{

          // no target user ID was found, try to get user by email

          // master email validation
          // must not continue with no email
          if(!processObject.targetEmail){

            logger.info(`----> Order : ${order.orderId}, doesn't have an email associated to it.`);

            handleUntargetUserOrders(order)
              .then(resolve)
              .catch((err)=>{
                reject(err);
              });

            return;
          }

          logger.info(`----> Order : ${order.orderId} doesn't have an user associated to it, retrieving user by email.`);

          // try to get user by email
          userService.getUserByEmail(processObject.targetEmail, (err, userByEmail) => {

            // is there an error?
            if(err){
              reject(err);
            }else if(userByEmail){

              // assign user infos
              processObject.targetUserId = userByEmail._id;
              processObject.targetUserName = userByEmail.firstName;

              // for FRIEND post reward we cannot send the reward if it is the same person
              if(processObject.targetUserId != order.sharerUserId){

                // create row
                processPostConversionRewardService.create(processObject)
                  .then(()=>{
                    logger.info(`----> Order : ${order.orderId}, was started.`);
                    resolve();
                  }).catch((err)=>{
                    reject(err);
                  });

              }else{

                handleBuyerIsSharerOrders(order)
                  .then(resolve)
                  .catch((err)=>{
                    reject(err);
                  });
              }

            }else{

              logger.error(`----> Order : ${order.orderId}, there's no user for the target email.`);
              handleUntargetUserOrders(order)
                .then(resolve)
                .catch((err)=>{
                  reject(err);
                });
            }
          });
        }

      }else{

        // for SHARER post reward we cannot send the reward if it is the same person
        if(processObject.targetUserId != order.buyerUserId){

          // create row
          processPostConversionRewardService.create(processObject)
            .then(() => {

              logger.info(`----> Order : ${order.orderId}, was started.`);
              resolve();
            })
            .catch((err)=>{
              reject(err);
            });

        }else{

          handleBuyerIsSharerOrders(order)
            .then(resolve)
            .catch((err)=>{
              reject(err);
            });
        }

      }

    });
  }

  mapOrders(orders, type){

    return new Promise((resolve, reject) => {

      /**
       * 1 - BLOCK ORDERS BY LIMIT OF REWARDS PER USER
       */
      const filteredArray = orders.filter(order => order.rewardType == type);
      const sortedArray = _.sortBy(filteredArray, ['email','rewardId'],['asc','asc']);

      let index = 0;
      let previousEmail = null;
      let previousRewardId = null;

      for(let order of sortedArray){
        if(order.email === previousEmail && order.rewardId === previousRewardId){
          index ++;
          order.earnedRewardsPerUser += parseInt(index);
        }else{
          index = 0;
        }

        // handle block
        order.blocked = order.postRewardPerUser && order.earnedRewardsPerUser >= order.postRewardPerUser;

        previousEmail = order.email;
        previousRewardId = order.rewardId;
      }

      /**
       * 2 - BLOCK ORDERS THAT CAME FROM A VOUCHER PAGE
       */
      let noBlockedOrderIds = sortedArray.filter(o => !o.blocked).map(o => o.orderId);

      // get all shared url access related to the orders
      orderService.getOrdersSharedUrlAccess(noBlockedOrderIds)
        .then((suas) => {

          // iterate over all shared url access
          for(let sua of suas){
            let order = sortedArray.find(o => o.orderId == sua.order_id);

            if(order){
              if(sua.meta && sua.meta.placementType == 'voucher-page'){
                order.blocked = true;
                order.processStatus = 'discount-blocked-circular-post-reward';
              }
            }
          }

          resolve(sortedArray);
        })
        .catch(reject);
    });
  }
}

const handleUntargetUserOrders = (order) => {

  return new Promise((resolve, reject) => {

    if (!order) return resolve();

    let processObject = {
      orderId:order.orderType === 'order' ? order.orderId : null,
      rewardId:order.rewardId,
      processStatus: 'missing-user-target-reward',
      processId: util.generateRandomKey(),
      externalOrderId: order.orderType === 'external-order' ? order.orderId : null,
      sharedUrlId: (order.sharedUrlId) ? order.sharedUrlId : null,
      targetUserId: (order.userId) ? order.userId : null,
      targetEmail: (order.email) ? order.email : null,
      targetUserName: (order.userName) ? order.userName : null
    };

    processPostConversionRewardService.create(processObject)
      .then((createdObject)=>{
        processPostConversionRewardService.create({...createdObject, _id: undefined, processStatus: 'process-complete'});
        resolve();
      }).catch((err)=>{
        reject(err);
      });
  });
};

const handleBuyerIsSharerOrders = (order) => {

  return new Promise((resolve, reject) => {

    if (!order) return resolve();

    let processObject = {
      orderId:order.orderType === 'order' ? order.orderId : null,
      rewardId:order.rewardId,
      processStatus: 'target-user-same-sharer-reward',
      processId: util.generateRandomKey(),
      externalOrderId: order.orderType === 'external-order' ? order.orderId : null,
      sharedUrlId: order.sharedUrlId,
      targetUserId: order.userId,
      targetEmail: order.email,
      targetUserName: order.userName
    };

    processPostConversionRewardService.create(processObject)
      .then((createdObject)=>{
        processPostConversionRewardService.create({...createdObject, _id: undefined, processStatus: 'process-complete'});
        resolve();
      }).catch((err)=>{
        reject(err);
      });
  });
};

module.exports = PostConversionRewardService;
