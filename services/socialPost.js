var _ = require('lodash');
var db = require('../db_pg');
var dbError = require('../common/dbError');
var dbQuery = require('../common/dbQuery');

module.exports = {
  // Save social post
  savePost: function (userId, socialPlatform, postId, imageId, fileId, sharedUrlId, message, cb) {
    if (!userId || !socialPlatform) {
      return cb({
        code: 'ERR_SPOST_PARAMS',
        message: 'Must provide a userId and socialPlatform value to save post data.',
        data: {}
      });
    }

    db('social_post_js')
      .returning('*')
      .insert({
        userId: userId,
        socialPlatform: socialPlatform.toUpperCase(),
        postId: postId,
        imageId: imageId,
        fileId: fileId,
        sharedUrlId: sharedUrlId,
        message: message
      })
      .then(function (response) {
        return cb(null, response[0]);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Social_post'));
      });
  },
  // Get social posts
  getPosts: function (filter, query, cb) {
    var dbObj = db('social_post_js')
      .returning('*')
      .where(filter);

    dbQuery(dbObj, query)
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null, []) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Social_post'));
      });
  }
};