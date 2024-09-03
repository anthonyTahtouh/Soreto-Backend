var db = require('../db_pg');
var dbError = require('../common/dbError');
var _ = require('lodash');
var utilities = require('../common/utility');
const AbstractPromiseService = require('./AbstractPromiseService');
class AffiliateService extends AbstractPromiseService {

  constructor() {
    super('reverb.affiliate_js');
  }

  getAffiliates(filter , cb){
    db('affiliate_js')
      .returning('*')
      .where(filter)
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null, []) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'affiliate_js_get'));
      });
  }

  getAffiliateById(affiliateId , cb){
    db('affiliate_js')
      .returning('*')
      .where({_id: affiliateId})
      .first()
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null, []) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'affiliate_js_get'));
      });
  }

  getAffiliateByName(name){
    return db('affiliate_js')
      .returning('*')
      .where({ name })
      .first();
  }

  getAffiliateMerchantClientAssociation(filter , cb){
    db('assoc_affiliate_merchant_client_js')
      .returning('*')
      .where(filter)
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null, []) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'assoc_affiliate_merchant_client_get'));
      });
  }
  getAffiliateMerchantClientAssociationByClientId(clientId , cb){
    db('assoc_affiliate_merchant_client_js')
      .returning('*')
      .where({clientId : clientId})
      .first()
      .then(function (row) {
        return _.isEmpty(row) ? cb(null, []) : cb(null, row);
      })
      .catch(function (err) {
        return cb(dbError(err, 'assoc_affiliate_merchant_client_get'));
      });
  }
  createAffiliateMerchantClientAssociation(payload , cb){

    if (utilities.checkProtectedKeys(payload)) {
      return cb({
        code: 'ERR_CLIENT_PROTECTED',
        message: 'Not authorised to update protected fields.',
        data: {}
      });
    }

    db('assoc_affiliate_merchant_client_js')
      .returning('*')
      .insert(payload)
      .then(function (response) {
        return cb(null, response[0]);
      })
      .catch(function (err) {
        return cb(dbError(err, 'assoc_affiliate_merchant_client_create'));
      });
  }
}

const affiliateService =  new AffiliateService();

module.exports = affiliateService;