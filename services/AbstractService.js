var db = require('../db_pg');
var dbError = require('../common/dbError');
var dbQuery = require('../common/dbQuery');
var utilities = require('../common/utility');

var _ = require('lodash');

class AbstractService {

  constructor(_viewName){
    this.viewName = _viewName;
  }

  get(id,cb) {
    db(this.viewName)
      .returning('*')
      .where({
        _id: id
      })
      .first()
      .then( (row) => {
        return _.isEmpty(row) ? cb(null,{}) : cb(null, row);
      })
      .catch( (err) => cb(dbError(err, `Error to call 'get' data from ${this.viewName}`))
      );
  }

  getAsync(filter) {
    return db(this.viewName)
      .returning('*')
      .where(filter);
  }

  create(obj, cb) {
    db(this.viewName)
      .returning('*')
      .insert(obj)
      .then(function (response) {
        return cb(null,response[0]);
      })
      .catch( (err) => {
        return cb(dbError(err, `Error to call 'create' into ${this.viewName}`));
      });
  }

  createAsync(obj) {
    return new Promise((res, rej) => {
      db(this.viewName)
        .returning('*')
        .insert(obj)
        .then(function (response) {
          res(response[0]);
        })
        .catch(rej);
    });
  }

  update(id, payload, cb) {

    db(this.viewName)
      .returning('*')
      .where({
        _id: id
      })
      .update(utilities.prepareJson(payload))
      .then( (rows) => {
        return _.isEmpty(rows) ? cb() : cb(null, rows[0]);
      })
      .catch( (err) =>{
        return cb(dbError(err, `Error to call 'update' into ${this.viewName}`));
      });
  }

  getPage(filter, query, cb) {
    const countWithoutOffset = new Promise((resolve,reject) => {
      let dbObj = db(this.viewName);

      const queryForCount = _.omit(query,['$offset','$sort','$limit']);
      const dbObjCount = dbObj.count('*').where(filter);

      dbQuery(dbObjCount,queryForCount,null)
        .then( (count) => {
          resolve(_.isEmpty(count) ? 0 : count[0]['count'] );
        })
        .catch( (err) => {
          reject(err);
        });
    });

    const queryPage = new Promise((resolve,reject) => {
      let dbObj = db(this.viewName)
        .returning('*')
        .where(filter);
      dbQuery(dbObj, query, null)
        .then( (rows) => {
          resolve(_.isEmpty(rows) ? [] : rows );
        })
        .catch((err) => {
          reject(err);
        });
    });

    Promise.all([queryPage, countWithoutOffset])
      .then((values) => {
        cb(null,{
          page:values[0],
          totalCount:values[1]
        });
      }).catch((err) => {
        cb(dbError(err, this.viewName));
      });
  }
}

module.exports = AbstractService;
