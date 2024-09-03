const AbstractPromiseService = require('./AbstractPromiseService');

const _ = require('lodash');
const db = require('../db_pg');
const dbError = require('../common/dbError');

class DynamicPageService extends AbstractPromiseService {

  constructor() {
    super('reverb.dynamic_page_js');
  }

  getByMenuIdAndRoles(dynamicMenuId, userRoleIds) {
    return db('reverb.dynamic_page_js')
      .leftJoin('reverb.dynamic_menu_js', 'reverb.dynamic_menu_js._id', 'reverb.dynamic_page_js.dynamicMenuId')
      .leftJoin('reverb.dynamic_content_role_access_js', 'reverb.dynamic_menu_js._id', 'reverb.dynamic_content_role_access_js.dynamicMenuId')
      .whereIn('reverb.dynamic_content_role_access_js.roleId', userRoleIds)
      .andWhere(
        {
          'reverb.dynamic_page_js.dynamicMenuId' : dynamicMenuId,
          'reverb.dynamic_content_role_access_js.accessAllowed' : true
        })
      .then((result) => {
        return _.isEmpty(result) ? 0 : result;
      })
      .catch((err) => {
        return dbError(err, 'reverb.dynamic_menu_js');
      });
  }
}

const dynamicPageService =  new DynamicPageService();

module.exports = dynamicPageService;