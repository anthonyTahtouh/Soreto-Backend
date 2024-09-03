const _ = require('lodash');
const AbstractPromiseService = require('./AbstractPromiseService');
const db = require('../db_pg');
const dbError = require('../common/dbError');
const utilities = require('../common/utility');

class DemoStoresService extends AbstractPromiseService {

  constructor() {
    super('reverb.demo_store_js');
  }

  create(obj) {
    return new Promise((resolve,reject)=>{
      db(this.viewName)
        .returning('*')
        .insert(obj)
        .then(function (response) {
          resolve(response[0]);
        })
        .catch( (err) => {
          reject(dbError(err, `Error to call 'create' into demo_store_js`));
        });
    });
  }

  update(id, payload) {
    return new Promise((resolve, reject) => {
      db(this.viewName)
        .returning('*')
        .where({
          _id: id
        })
        .update(utilities.prepareJson(payload))
        .then( (rows) => {
          return _.isEmpty(rows) ? resolve() : resolve(rows[0]);
        })
        .catch( (err) =>{
          reject(dbError(err, `Error to call 'update' into demo_store_js`));
        });
    });
  }

  getByStoreLink(storeLink) {
    return new Promise((resolve, reject) => {
      db(this.viewName)
        .returning('*')
        .where({
          storeLink: storeLink
        })
        .first()
        .then(function (row) {
          resolve(_.isEmpty(row) ? {} : row);
        })
        .catch(function (err) {
          reject(dbError(err, `Error to call 'getByStoreLink' data from ${this.viewName}`));
        });
    });
  }
}

const demoStoresService =  new DemoStoresService();

module.exports = demoStoresService;