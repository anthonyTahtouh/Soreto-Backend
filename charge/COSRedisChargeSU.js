var db = require('./../db_pg');
var moment = require('moment');

const logger = require('./../common/winstonLogging');

const securityService = require('./../services/security');

const searchClientOrder = (client_id, startDate, endDate) =>{
  return db('reverb.shared_url')
    .innerJoin('user', 'user_id', 'user._id')
    .select(['shared_url.created_at', 'user.email'])
    .where({'shared_url.client_id' : client_id})
    .andWhere('shared_url.created_at', '>=', startDate)
    .andWhere('shared_url.created_at', '<', endDate)
    .then(function (rows) {
      if(!rows || rows.length == 0){
        return;
      }
      return rows;
    })
    .catch(function (err) {
      console.log('createErr',err);
    });
};

const charge_log = async (message) => {
  logger.info(`[REDIS CHARGE] ${message}`);
};

(async () => {

  try {

    const clientId = '5dee829ce2b5bc4a8ae86087';
    const daysRangeBack = 180;
    const daysBunchIndex = 2;
    const sixMonthsInDays = 182;

    charge_log(`Initializing Charger process Client Id = ${clientId}, Days range back = ${daysRangeBack} and bunch days = ${daysBunchIndex}`);
    charge_log(``);

    charge_log(`Initializing Start searching`);

    let dateNow = moment();
    let dateIndexStart = moment().startOf('day').add(-daysRangeBack, 'days');
    let dateIndexEnd = moment().startOf('day').add(-daysRangeBack, 'days').add(daysBunchIndex, 'days');

    do {

      let startProcess = moment();
      charge_log(`--- Processing range period from ${dateIndexStart} to ${dateIndexEnd}`);

      // Retrieve database values
      let userList = await searchClientOrder(clientId, dateIndexStart, dateIndexEnd);
      charge_log(`--- Found ${(userList) ? userList.length : 0 } values to be processed - time ${moment().diff(startProcess, 'seconds')} seconds and ${moment().diff(startProcess, 'millisencods')} millisencods`);

      // Push to Redis cache
      if(userList && userList.length > 0){
        charge_log(`----- Start pushing to Redis ${userList.length} values`);
        let startRedisProcess = moment();
        for (let user of userList) {
          if(user && user.email){

            let orderAtInDays = moment().diff(moment(user.created_at), 'days');
            let diffDays = (sixMonthsInDays - orderAtInDays) > 0 ? (sixMonthsInDays - orderAtInDays) : 0;
            //charge_log(`----- Creating row ${user.email} at ${user.created_at}, ttl in days = ${diffDays}`);
            await securityService.orderFreshUser.setOrderFreshUserBatch(clientId, user.email, diffDays);
          }
        }
        charge_log(`----- Finished Redis ${moment().diff(startRedisProcess, 'seconds')} seconds and ${moment().diff(startRedisProcess, 'millisencods')} millisencods`);
      }


      dateIndexStart = dateIndexStart.add(daysBunchIndex, 'days');
      dateIndexEnd = dateIndexEnd.add(daysBunchIndex, 'days');

      charge_log(`--- Range total elapsed time: ${moment().diff(startProcess, 'seconds')} seconds and ${moment().diff(startProcess, 'millisencods')} millisencods.`);
      charge_log(``);
    }while (dateIndexStart < dateNow);

    charge_log(`Closing the process COS user Loader`);

  } catch (error) {
    console.error(error);
    logger.error(`[ERROR] ${error}`);
  }finally {
    charge_log('Process terminated (exit)');
    process.exit(0);
  }

})();