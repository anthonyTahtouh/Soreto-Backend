const AbstractService = require('./AbstractService');
var db = require('../db_pg');
var dbError = require('../common/dbError');
var dbQuery = require('../common/dbQuery');
var utilities = require('../common/utility');

var _ = require('lodash');
class CodeBlockService extends AbstractService {

  constructor(){
    super('code_block_js');
  }

  getActiveCodeBlock(displayBlockId, cb) {
    db('code_block_js')
      .returning('*')
      .where({
        displayBlockId: displayBlockId,
        active:true
      })
      .orderBy('createdAt', 'desc')
      .first()
      .then(function (row) {
        return _.isEmpty(row) ? cb(null,null) : cb(null, row);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Code Block'));
      });
  }

  // Get Page overrided to use agg_codeblock_js view
  getPage(filter, query, cb) {
    const countWithoutOffset = new Promise((resolve,reject) => {
      let dbObj = db('agg_codeblock_js');

      const queryForCount = _.omit(query,['$offset','$sort','$limit']);
      const dbObjCount = dbObj.count('*').where(filter);

      dbQuery(dbObjCount,queryForCount,['name','campaignName','clientName','displayBlockName'])
        .then( (count) => {
          resolve(_.isEmpty(count) ? 0 : count[0]['count'] );
        })
        .catch( (err) => {
          reject(err);
        });
    });

    const queryPage = new Promise((resolve,reject) => {
      let dbObj = db('agg_codeblock_js')
        .returning('*')
        .where(filter);
      dbQuery(dbObj, query, ['name','campaignName','clientName','displayBlockName'])
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
        cb(dbError(err, 'agg_codeblock_js'));
      });
  }

  savePreviewImageUrl(codeBlockId, imageUrl) {
    return new Promise((resolve, reject) => {
      var payload = { previewDesktopThumbnailUrl: imageUrl };
      db('code_block_js')
        .returning('*')
        .where({
          _id: codeBlockId
        })
        .update(utilities.prepareJson(payload))
        .then(() => resolve())
        .catch( (err) =>{
          console.log(dbError(err, `Error to call 'update' into code_block_js`));
          reject(err);
        });
    });
  }
}

module.exports = CodeBlockService;