var db = require('../db_pg');
var moment = require('moment');

const logger = require('../common/winstonLogging');

const securityService = require('../services/security');

const searchSharedUrl = (client_id, startDate, endDate) =>{
  return db('reverb.shared_url_js')
    .innerJoin('user', 'userId', 'user._id')
    .select(['shared_url_js.createdAt', 'shared_url_js.clientId', 'shared_url_js.campaignVersionId', 'user.email'])
    .where({'shared_url_js.clientId' : client_id})
    .andWhere('shared_url_js.createdAt', '>=', startDate)
    .andWhere('shared_url_js.createdAt', '<', endDate)
    .andWhere('shared_url_js.type', '=', 'SHARED')
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

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return (Math.floor(Math.random() * (max - min)) + min).toString().padStart(6, '0');
}

(async () => {

  try {

    const clientId = '5e4d486db1fc092459674c1a';
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
      let suList = await searchSharedUrl(clientId, dateIndexStart, dateIndexEnd);
      charge_log(`--- Found ${(suList) ? suList.length : 0 } values to be processed - time ${moment().diff(startProcess, 'seconds')} seconds and ${moment().diff(startProcess, 'millisencods')} millisencods`);

      // Push to Redis cache
      if(suList && suList.length > 0){
        charge_log(`----- Start pushing to Redis ${suList.length} values`);
        let startRedisProcess = moment();
        for (let su of suList) {
          if(su && su.email){

            let orderAtInDays = moment().diff(moment(su.created_at), 'days');
            let diffDays = (sixMonthsInDays - orderAtInDays) > 0 ? (sixMonthsInDays - orderAtInDays) : 0;
            //charge_log(`----- Creating row ${user.email} at ${user.created_at}, ttl in days = ${diffDays}`);

            // build session Id
            su.sessionId = getRandomInt(1, 1000000);

            await securityService.shareLimit.setSharedUrlBatch(clientId, su.email, su, diffDays);
          }
        }
        charge_log(`----- Finished Redis ${moment().diff(startRedisProcess, 'seconds')} seconds and ${moment().diff(startRedisProcess, 'millisencods')} millisencods`);
      }


      dateIndexStart = dateIndexStart.add(daysBunchIndex, 'days');
      dateIndexEnd = dateIndexEnd.add(daysBunchIndex, 'days');

      charge_log(`--- Range total elapsed time: ${moment().diff(startProcess, 'seconds')} seconds and ${moment().diff(startProcess, 'millisencods')} millisencods.`);
      charge_log(``);
    }while (dateIndexStart < dateNow);

    charge_log(`Closing the process Weekday user Loader`);

  } catch (error) {
    console.error(error);
    logger.error(`[ERROR] ${error}`);
  }finally {
    charge_log('Process terminated (exit)');
    process.exit(0);
  }

})();