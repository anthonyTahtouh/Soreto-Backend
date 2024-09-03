var dbError = require('../common/dbError');
var AbstractPromiseService = require('./AbstractPromiseService');
var db = require('../db_pg');
var _ = require('lodash');
var utilities = require('../common/utility');

class AssocAffiliateClientService extends AbstractPromiseService {

  constructor() {
    super('assoc_affiliate_merchant_client_js');
  }

  delete(id) {
    return new Promise((resolve,reject)=>{
      db('assoc_affiliate_merchant_client_js')
        .returning('*')
        .where({
          _id: id
        })
        .del()
        .then( () => {
          resolve({success:'true'});
        })
        .catch( (err) => {
          reject(dbError(err, `Error to call 'delete' data from assoc_affiliate_merchant_client_js`));
        });
    });
  }

  updateAssocAffiliateMerchantClient(clientId, payload, cb) {
    db('assoc_affiliate_merchant_client_js')
      .returning('*')
      .where({
        clientId: clientId
      })
      .update(utilities.prepareJson(payload))
      .then(function (rows) {
        return _.isEmpty(rows) ? cb() : cb(null, rows[0]);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Client'));
      });
  }
}

const assocAffiliateClientService =  new AssocAffiliateClientService();

module.exports = assocAffiliateClientService;
