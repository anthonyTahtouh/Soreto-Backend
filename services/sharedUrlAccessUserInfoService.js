// var db = require('../db_pg');
// var dbError = require('../common/dbError');
// var _ = require('lodash');
//var utilities = require('../common/utility');
const AbstractPromiseService = require('./AbstractPromiseService');
class SharedUrlAccessUserInfoService extends AbstractPromiseService {

  constructor() {
    super('reverb.shared_url_access_user_info_js');
  }
}

const sharedUrlAccessUserInfoService =  new SharedUrlAccessUserInfoService();

module.exports = sharedUrlAccessUserInfoService;