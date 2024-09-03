const AbstractPromiseService = require('./AbstractPromiseService');
const db = require ('../db_pg');
const dbError = require('../common/dbError');

class ProcessPostConversionRewardService extends AbstractPromiseService {

  constructor() {
    super('reverb.process_post_conversion_reward_js');
  }

  getProcessWithoutNextStatusWithEmail(withStatus,notWithStatus) {
    const viewName = 'agg_process_post_conversion_reward_user_email_js';
    return new Promise((resolve,reject)=>{
      db.raw(`
      SELECT * FROM reverb.${viewName} as postConRew
        where postConRew."processStatus" = '${withStatus}'
        and not exists (select aux."processId" from reverb.${viewName} aux where aux."processStatus" = '${notWithStatus}' and aux."processId" = postConRew."processId" )
      `).then((process)=>{
        resolve(process.rows);
      }).catch((err)=>{
        console.log('errr',err);
        reject(dbError(err, `Error to call 'get' data from ${viewName}`));
      });
    });
  }
}

const processPostConversionRewardService = new ProcessPostConversionRewardService();

module.exports = processPostConversionRewardService;