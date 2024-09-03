/**
 * This is a shared services and can not implement any other services
 */

var _ = require('lodash');
var db = require('../../db_pg');
var dbError = require('../../common/dbError');
var dbQuery = require('../../common/dbQuery');

module.exports = {

  // Get Order History
  getHistoryPage(historyEntityType, filter, query, cb) {
    const viewName = historyEntityType;
    const countWithoutOffset = new Promise((resolve,reject) => {
      let dbObj = db(viewName);
      const queryForCount = _.omit(query,['$offset','$sort','$limit', '$effectivatedAt_$gte', '$effectivatedAt_$lte']);
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
      let dbObj = db(viewName)
        .select(['order_history_js.*','reverb.user.first_name as userName','reverb.user.last_name as userLastName'])
        .innerJoin('reverb.user', 'userId', 'reverb.user._id')
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
        cb(dbError(err, viewName));
      });
  },
  // Create new order
  createHistory(objectSnapshot, currentUserId, historyOriginType, historyEntityType, cb) {

    db(historyEntityType)
      .returning('*')
      .insert({
        objectId: objectSnapshot._id,
        effectivatedAt: objectSnapshot.updatedAt,
        userId: currentUserId,
        originType: historyOriginType,
        objectSnapshot: JSON.stringify(objectSnapshot)
      })
      .then(function (response) {
        return cb(null, response[0]);
      })
      .catch(function (err) {
        return cb(dbError(err, 'History'));
      });
  }
};
