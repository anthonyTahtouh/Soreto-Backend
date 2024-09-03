var _ = require('lodash');
var db = require('../db_pg');
var dbError = require('../common/dbError');

module.exports = {
  createExternalRevenue: function(revenueObj, cb) {

    db('external_revenue_js')
      .returning('*')
      .insert({
        status:revenueObj.status,
        total:revenueObj.total,
        currency:revenueObj.currency,
        meta:revenueObj.meta,
        type:revenueObj.type,
        reference:revenueObj.reference,
        sourceId:revenueObj.sourceId
      })
      .then(function (response) {
        return cb(null, response[0]);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Order'));
      });
  },

  upsertExternalRevenue: function(revenueObj, cb) {
    var rawInsertFiller = [
      revenueObj.status ? `'${revenueObj.status}'`:'DEFAULT' ,
      revenueObj.total ? `'${revenueObj.total}'` :'DEFAULT',
      revenueObj.currency ? `'${revenueObj.currency}'`:'DEFAULT',
      revenueObj.meta ? `'${JSON.stringify(revenueObj.meta)}'`:'DEFAULT',
      revenueObj.type ? `'${revenueObj.type}'`:'DEFAULT',
      revenueObj.reference ? `'${revenueObj.reference}'`:'DEFAULT',
      revenueObj.sourceId ? `'${revenueObj.sourceId}'`:'DEFAULT',
      revenueObj.commission ? `'${revenueObj.commission}'`:'DEFAULT'
    ].toString();

    db.raw('INSERT INTO reverb.external_revenue_js as external_revenue (status,total,currency,meta,type,reference,"sourceId",commission) VALUES('+rawInsertFiller+')\
    ON CONFLICT (reference, "sourceId") DO UPDATE SET (status,meta) = (EXCLUDED.status,EXCLUDED.meta) \
    WHERE external_revenue."sourceId" = EXCLUDED."sourceId" AND external_revenue.reference = EXCLUDED.reference RETURNING *')
      .then(function (response) {
        return cb(null, response[0]);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Order'));
      });
  },

  getExternalRevenue : function(filter, cb) {
    db('external_revenue_js')
      .returning('*')
      .where(filter)
      .first()
      .then(function (row) {
        return _.isEmpty(row) ? cb() : cb(null, row);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Order'));
      });
  },
};
