var _ = require('lodash');
var db = require('../db_pg');
var dbError = require('../common/dbError');

module.exports = {
  getMatchingPerms: function (searchUrl, cb) {
    db('route_permission_js')
      .returning('*')
      .where('route', 'LIKE', searchUrl + '%')
      .orderBy('route', 'desc')
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null, []) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'RoutePermission'));
      });
  },
  getPerms: function (filter, cb) {
    db('route_permission_js')
      .returning('*')
      .where(filter)
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null, []) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'RoutePermission'));
      });
  }
};