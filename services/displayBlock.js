var db = require('../db_pg');
var dbError = require('../common/dbError');
var _ = require('lodash');
var dbQuery = require('../common/dbQuery');

var AbstractService = require('./AbstractService');

class DisplayBlockService extends AbstractService {

  constructor(){
    super('display_block_js');
  }


  getActiveDisplayBlockByType(campaignVersionId, type, cb) {
    db(this.viewName)
      .returning('*')
      .where({
        campaignVersionId: campaignVersionId,
        type:type,
        active:true
      })
      .orWhere(
        {
          universalFallback: true,
          type:type,
          active:true
        } // list fall backs
      )
      .orderByRaw('"universalFallback" DESC, "createdAt" DESC ') //order so fallback always come last.
      .first() // only pick the first;
      .then(function (row) {
        return _.isEmpty(row) ? cb(null,null) : cb(null, row);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Display Block'));
      });
  }


  getAllDisplayBlocks(campaignVersionId, cb) {
    db(this.viewName)
      .returning('*')
      .where({
        campaignVersionId: campaignVersionId
      })
      .orderBy('createdAt', 'desc')
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null,null) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Display Block'));
      });
  }

  // Get Page overrided to use agg_displayBlock_js view
  getPage(filter, query, cb) {
    const countWithoutOffset = new Promise((resolve,reject) => {
      let dbObj = db('agg_displayblock_js');

      const queryForCount = _.omit(query,['$offset','$sort','$limit']);
      const dbObjCount = dbObj.count('*').where(filter);

      dbQuery(dbObjCount,queryForCount,['name','campaignName','clientName','type'])
        .then( (count) => {
          resolve(_.isEmpty(count) ? 0 : count[0]['count'] );
        })
        .catch( (err) => {
          reject(err);
        });
    });

    const queryPage = new Promise((resolve,reject) => {
      let dbObj = db('agg_displayblock_js')
        .returning('*')
        .where(filter);
      dbQuery(dbObj, query, ['name','campaignName','clientName','type'])
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
        cb(dbError(err, 'agg_displayblock_js'));
      });
  }
}

module.exports = DisplayBlockService;
