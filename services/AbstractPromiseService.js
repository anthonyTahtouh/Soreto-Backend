var db = require('../db_pg');
var dbError = require('../common/dbError');
var dbQuery = require('../common/dbQuery');
var utilities = require('../common/utility');

var _ = require('lodash');


class AbstractPromiseService {

  constructor(_viewName){
    this.viewName = _viewName;
  }

  getById(id) {
    const viewName = this.viewName;
    return new Promise((resolve,reject)=>{
      db(viewName)
        .returning('*')
        .where({
          _id: id
        })
        .first()
        .then( (row) => {
          resolve(_.isEmpty(row) ? {} : row);
        })
        .catch( (err) => {
          reject(dbError(err, `Error to call 'get' data from ${viewName}`));
        });
    });
  }

  get(filter,query) {
    const viewName = this.viewName;
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

  create(obj) {
    const viewName = this.viewName;
    return new Promise((resolve,reject)=>{
      db(viewName)
        .returning('*')
        .insert(obj)
        .then(function (response) {
          resolve(response[0]);
        })
        .catch(function (err) {
          console.log('createErr',err);
          reject(dbError(err, `Error to call 'create' into ${viewName}`));
        });
    });
  }

  createBulk(obj) {
    const viewName = this.viewName;
    return new Promise((resolve,reject)=>{

      db.transaction((tr) => {
        db(viewName)
          .transacting(tr)
          .returning('*')
          .insert(obj)
          .then(function (response) {

            tr.commit();
            resolve(response);
          })
          .catch(function (err) {

            tr.rollback();
            console.log('createErr',err);
            reject(dbError(err, `Error to call 'create' into ${viewName}`));
          });
      });

    });
  }

  update(id, payload) {
    const viewName = this.viewName;
    return new Promise((resolve,reject)=>{
      db(viewName)
        .returning('*')
        .where({
          _id: id
        })
        .update(utilities.prepareJson(payload))
        .then( (rows) => {
          resolve( _.isEmpty(rows) ? {} : rows[0]);
        })
        .catch( (err) =>{
          reject(dbError(err, `Error to call 'update' into ${viewName}`));
        });
    });
  }

  getPage(filter, query, searchBy = null) {
    const viewName = this.viewName;
    const countWithoutOffset = new Promise((resolve,reject) => {
      let dbObj = db(viewName);

      const queryForCount = _.omit(query,['$offset','$sort','$limit']);
      const dbObjCount = dbObj.count('*').where(filter);

      dbQuery(dbObjCount,queryForCount, searchBy)
        .then( (count) => {
          resolve(_.isEmpty(count) ? 0 : count[0]['count'] );
        })
        .catch( (err) => {
          reject(err);
        });
    });

    const queryPage = new Promise((resolve,reject) => {
      let dbObj = db(viewName)
        .returning('*')
        .where(filter);
      dbQuery(dbObj, query, searchBy)
        .then( (rows) => {
          resolve(_.isEmpty(rows) ? [] : rows );
        })
        .catch((err) => {
          reject(err);
        });
    });
    return new Promise((resolve,reject)=>{
      Promise.all([queryPage, countWithoutOffset])
        .then((values) => {
          resolve({
            page:values[0],
            totalCount:values[1]
          });
        }).catch((err) => {
          reject(dbError(err,viewName));
        });
    });
  }

  delete(id) {
    const viewName = this.viewName;
    return new Promise((resolve,reject)=>{
      db(viewName)
        .delete()
        .where({
          _id: id
        })
        .then(resolve)
        .catch( (err) =>{
          reject(dbError(err, `Error to call 'delete' into ${viewName}`));
        });
    });
  }
}

module.exports = AbstractPromiseService;