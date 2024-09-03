var _ = require('lodash');
var db = require('../db_pg');
var dbError = require('../common/dbError');

module.exports = {
  // Get role object by name
  getRoleByName: function(roleName, cb) {
    db('role_js')
      .returning('*')
      .where({
        name: roleName
      })
      .first()
      .then(function (row) {
        return _.isEmpty(row) ? cb() : cb(null, row);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Role'));
      });
  },
  // Get role by ID
  getRoleById: function (roleId, cb) {
    db('role_js')
      .returning('*')
      .where({
        _id: roleId
      })
      .first()
      .then(function (row) {
        return _.isEmpty(row) ? cb() : cb(null, row);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Role'));
      });
  },
  getRoles: function (filter, cb) {
    db('role_js')
      .returning('*')
      .where(filter)
      .then(function (row) {
        return _.isEmpty(row) ? cb(null, []) : cb(null, row);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Role'));
      });
  },
  getRolesByIds: function (ids, cb) {
    db('role_js')
      .returning('*')
      .whereIn('_id', ids)
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null, []) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Role'));
      });
  }
};
