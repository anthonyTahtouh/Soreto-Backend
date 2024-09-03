const AbstractPromiseService = require('./AbstractPromiseService');

const _ = require('lodash');
const db = require('../db_pg');
const dbError = require('../common/dbError');

class DynamicMenuService extends AbstractPromiseService {

  constructor() {
    super('reverb.dynamic_menu_js');
  }

  userMenus(userRoleIds){

    return db('reverb.dynamic_menu_js')
      .leftJoin('reverb.dynamic_content_role_access_js', '_id', 'reverb.dynamic_content_role_access_js.dynamicMenuId')
      .whereIn('roleId', userRoleIds)
      .andWhere({'reverb.dynamic_content_role_access_js.accessAllowed' : true })
      .then((result) => {
        return _.isEmpty(result) ? 0 : result;
      })
      .catch((err) => {
        return dbError(err, 'reverb.dynamic_menu_js');
      });
  }
}

const dynamicMenuService =  new DynamicMenuService();

module.exports = dynamicMenuService;