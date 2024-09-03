var AbstractPromiseService = require('./AbstractPromiseService');
var db = require('../db_pg');
var dbError = require('../common/dbError');
var _ = require('lodash');

const constants = require('../config/constants');
const msClient = require('../common/senecaClient');

class AuditLogTagDataService extends AbstractPromiseService {

  constructor() {
    super('reverb.audit_log_tag_data_js');
  }

  create(obj) {
    const viewName = 'reverb.audit_log_tag_data_js';

    return new Promise((resolve,reject)=>{
      db(viewName)
        .returning('*')
        .insert({meta:obj})
        .then(function (response) {

          // send live data
          msClient.act(_.extend(constants.EVENTS.SEND_LIVE_TRACK_DATA,
            {
              data: {
                meta: obj,
                type: 'audit'
              }}
          ));

          resolve(response[0]);
        })
        .catch(function (err) {
          console.log('createErr',err);
          reject(dbError(err, `Error to call 'create' into ${viewName}`));
        });
    });
  }
}

const auditLogTagDataService =  new AuditLogTagDataService();

module.exports = auditLogTagDataService;