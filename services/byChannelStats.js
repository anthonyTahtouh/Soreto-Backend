const _ = require('lodash');
const AbstractPromiseService = require('./AbstractPromiseService');
const db = require('../db_pg');
const dbError = require('../common/dbError');

class ByChannelService extends AbstractPromiseService {

  constructor() {
    super('total_client_stats_by_period_js');
  }

  getClientStatsPerChannelByPeriod(startDate, endDate, id) {

    const viewName = 'client_stats_per_channel_by_period_js';
    return new Promise((resolve, reject) => {
      db.select('*').from(db.raw(`${viewName}(?,?,?)`,[startDate, endDate, id]))
        .then( (rows) => {
          return _.isEmpty(rows) ? resolve() : resolve({
            page:rows,
            totalCount:rows.length
          });
        })
        .catch( (err) =>{
          reject(dbError(err, `Error to call  into ${viewName}`));
        });
    });
  }

  getTotalClientStatsByPeriod(startDate, endDate, id) {

    return new Promise((resolve, reject) => {
      db.select('*').from(db.raw(`${this.viewName}(?,?,?)`,[startDate, endDate, id]))
        .then( (rows) => {
          return _.isEmpty(rows) ? resolve() : resolve({
            page:rows,
            totalCount:rows.length
          });
        })
        .catch( (err) =>{
          reject(dbError(err, `Error to call  into ${this.viewName}`));
        });
    });
  }
}

const byChannelService =  new ByChannelService();

module.exports = byChannelService;