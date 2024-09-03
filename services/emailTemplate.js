const _ = require('lodash');
const AbstractService = require('./AbstractService');
const db = require('../db_pg');
const dbQuery = require('../common/dbQuery');
const dbError = require('../common/dbError');

class EmailTemplateService extends AbstractService {

  constructor() {
    super('email_template_js');
  }

  copyById(id, object, cb) {
    const viewName = this.viewName;

    db(viewName)
      .returning('*')
      .where({
        _id: id
      })
      .first()
      .then( (row) => {
        row = _.omit(row, ['_id','createdAt','updatedAt']);
        _.merge(row,object);

        this.create(_.merge(row,object),(err, object)=>{
          if (err){
            return cb(dbError(err, `Error to call 'get' data from ${this.viewName}`));
          }
          return cb(null,object);

        });
      })
      .catch( (err) => cb(dbError(err, `Error to call 'get' data from ${this.viewName}`))
      );
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

  getByFilter(filter, cb) {
    const viewName = this.viewName;
    var dbObj = db('email_template_js')
      .returning('*')
      .where(filter);

    dbQuery(dbObj, filter)
      .then( (row) => {
        cb(null,  _.isEmpty(row) ? [] : row);
      })
      .catch( (err) => {
        cb(dbError(err, `Error to call 'get' data from ${viewName}`));
      });
  }

  getEmailTemplateById(emailTemplateId, cb) {
    db('agg_email_template_js')
      .returning('*')
      .where({
        _id: emailTemplateId
      })
      .orderBy('createdAt', 'desc')
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null,null) : cb(null, rows[0]);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Email Template'));
      });
  }

  getEmailTemplateByClientId(id, cb) {
    db('agg_email_template_js')
      .returning('*')
      .where({
        clientId: id
      })
      .orderBy('createdAt', 'desc')
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null,null) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Email Template'));
      });
  }

  // Get Page overrided to use agg_email_template_js view
  getPage(filter, query, cb) {
    const countWithoutOffset = new Promise((resolve,reject) => {
      let dbObj = db('agg_email_template_js');

      const queryForCount = _.omit(query,['$offset','$sort','$limit']);
      const dbObjCount = dbObj.count('*').where(filter);

      dbQuery(dbObjCount,queryForCount, ['name', 'type', 'externalTemplateId', 'clientName', 'externalServiceName'])
        .then( (count) => {
          resolve(_.isEmpty(count) ? 0 : count[0]['count'] );
        })
        .catch( (err) => {
          reject(err);
        });
    });

    const queryPage = new Promise((resolve,reject) => {
      let dbObj = db('agg_email_template_js')
        .returning('*')
        .where(filter);
      dbQuery(dbObj, query, ['name', 'type', 'externalTemplateId', 'clientName', 'externalServiceName'])
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
        cb(dbError(err, 'agg_email_template_js'));
      });
  }
}

const emailTemplateService =  new EmailTemplateService();

module.exports = emailTemplateService;