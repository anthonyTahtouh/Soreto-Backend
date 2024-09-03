const db = require('../db_pg');
const dbError = require('../common/dbError');
const dbQuery = require('../common/dbQuery');

const _ = require('lodash');

const AbstractPromiseService = require('./AbstractPromiseService');

class KeyEmailTemplateTypeService extends AbstractPromiseService {

  constructor() {
    super('reverb.key_email_template_type_js');
  }

  getAgg(filter,query) {
    const viewName = 'agg_key_email_template_type_js';
    return new Promise((resolve,reject)=>{
      var dbObj = db(viewName)
        .returning('*')
        .where(filter);
      dbQuery(dbObj, query)
        .then( (row) => {
          resolve(_.isEmpty(row) ? [] : row);
        })
        .catch( (err) => {
          reject(dbError(err, `Error to call 'get' data from ${viewName}`));
        });
    });
  }

}


const keyEmailTemplateTypeService =  new KeyEmailTemplateTypeService();

module.exports = keyEmailTemplateTypeService;