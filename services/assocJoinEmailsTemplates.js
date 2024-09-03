var db = require('../db_pg');
var dbError = require('../common/dbError');

var _ = require('lodash');

module.exports = {
  getEmailTemplate: function (filter, cb) {
    db.select('*').from('assoc_join_campaign_versions_email_templates_js')
      .where(filter)
      .then(function (row) {
        return _.isEmpty(row) ? cb(null, null) : cb(null, row);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Template_error'));
      });
  }
};
