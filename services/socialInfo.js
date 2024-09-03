var _ = require('lodash');
var db = require('../db_pg');
var dbError = require('../common/dbError');

module.exports = {
  getInfo: function (userId, socialPlatform, cb) {
    db('social_info_js')
      .returning('*')
      .where({
        userId: userId,
        socialPlatform: socialPlatform.toUpperCase()
      })
      .first()
      .then(function (row) {
        return _.isEmpty(row) ? cb() : cb(null, row);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Social_info'));
      });
  },
  updateInfo: function (userId, socialPlatform, firstName, lastName, birthday, email, location, gender, meta, cb) {
    db.raw('INSERT INTO reverb.social_info_js AS social_info ("userId", "socialPlatform", "firstName", "lastName", birthday, email, location, gender, meta) VALUES(?, ?, ?, ?, ?, ?, ? , ?, ?) \
      ON CONFLICT ("userId", "socialPlatform") DO UPDATE SET ("firstName", "lastName", birthday, email, location, gender, meta) = (EXCLUDED."firstName", EXCLUDED."lastName", EXCLUDED.birthday, EXCLUDED.email, EXCLUDED.location, EXCLUDED.gender, EXCLUDED.meta) \
      WHERE social_info."userId" = EXCLUDED."userId" AND social_info."socialPlatform" = EXCLUDED."socialPlatform" RETURNING *', [userId, socialPlatform.toUpperCase(), firstName, lastName, birthday, email, location, gender, JSON.stringify(meta)])
      .then(function (response) {
        return cb(null, response.rows[0]);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Social_info'));
      });
  }
};