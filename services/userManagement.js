const _ = require('lodash');
const AbstractPromiseService = require('./AbstractPromiseService');
const db = require('../db_pg');
const dbError = require('../common/dbError');
const dbQuery = require('../common/dbQuery');
const roleService = require('./role');
const clientService = require('./client');

class UserManagementService extends AbstractPromiseService {

  constructor() {
    super('agg_user_management_js');
  }

  getPage(filter, query) {
    const viewName = this.viewName;

    let rolesFilterRaw = '1=1';

    if (filter.roles && filter.roles.length > 0) {
      const rolesFilter = filter.roles.map(f => `"${f}"`);
      rolesFilterRaw = `"roles" && '{${rolesFilter}}'::text[]`;
    }
    const countWithoutOffset = new Promise((resolve,reject) => {
      let dbObj = db(viewName);
      const queryForCount = _.omit(query,['$offset','$sort','$limit']);
      const dbObjCount = dbObj.count('*')
        .whereRaw(rolesFilterRaw);

      dbQuery(dbObjCount,queryForCount, ['firstName', 'lastName' , 'email', 'clientName'])
        .then( (count) => {
          resolve(_.isEmpty(count) ? 0 : count[0]['count'] );
        })
        .catch( (err) => {
          reject(err);
        });
    });

    const queryPage = new Promise((resolve,reject) => {
      const dbObj = db(viewName)
        .returning('*')
        .whereRaw(rolesFilterRaw);
      dbQuery(dbObj, query, ['firstName', 'lastName', 'email', 'clientName'])
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

  update(id, data) {
    const viewName = 'user_js';

    return new Promise ((resolve, reject) => {
      roleService.getRoleByName('sales', (err, role) => {

        const hasSalesRole = role ? data.roles.includes(role._id) : false;

        clientService.getClientWithAssociatedResponsible(id)
          .then(clients => {

            if (clients && clients.length > 0 && !hasSalesRole) {
              const clientNames = clients.map(client => client.name).join(', ');
              const message = `The Sales role cannot be detached, this client is responsible for client(s) ${clientNames}. Remove all the responsibility before remove the role.`;
              const error = { code: 'ERR_USER_RESPONSIBLE',message: message,data: {},statusCode: 400 };
              reject(error);
            }else {
              db(viewName)
                .returning('*')
                .where({
                  _id: id
                })
                .update(formatData(data))
                .then( (rows) => {
                  resolve( _.isEmpty(rows) ? {} : _.omit(rows[0], 'password'));
                })
                .catch( (err) =>{
                  reject(dbError(err, `Error to call 'update' into ${viewName}`));
                });
            }
          });
      });
    });
  }

  create(data) {
    const viewName = 'user_js';
    return new Promise((resolve,reject)=>{
      db(viewName)
        .returning('*')
        .insert(formatData(data))
        .then(function (response) {
          resolve(_.omit(response[0], 'password'));
        })
        .catch(function (err) {
          reject(dbError(err, `Error to call 'create' into ${viewName}`));
        });
    });
  }

  getResponsibles() {
    const viewName = this.viewName;
    return new Promise((resolve,reject)=>{
      db(viewName)
        .returning(['"firstName"', '"lastName"'])
        .whereRaw(`"salesResponsible" is not null` )
        .then(response => {
          resolve(response);
        })
        .catch(err => {
          reject(dbError(err, `Error to call 'create' into ${viewName}`));
        });
    });
  }

  getUsersToRemoval(filter) {
    try {
      return db('agg_user_removal_js') .returning('*') .where(filter);
    }
    catch (error) {
      throw dbError(error,Error);
    }
  }
}

const formatData = (data) => {
  const payload = {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email ? data.email.toLowerCase() : null,
    verifiedEmail: data.verifiedEmail,
    password: data.newPassword ? db.raw('crypt(\'' + data.newPassword + '\', gen_salt(\'bf\', 8))') : null,
    roles: JSON.stringify(data.roles),
    clientId: data.clientId ? data.clientId : null,
    meta: data.meta ? JSON.stringify(data.meta) : null
  };
  if(payload.password === null) {
    delete payload.password;
  }
  return payload;
};

const userManagementService =  new UserManagementService();

module.exports = userManagementService;