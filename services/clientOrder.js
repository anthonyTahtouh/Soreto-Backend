var _ = require('lodash');
var db = require('../db_pg');
var dbError = require('../common/dbError');

let _tableName = 'client_order';
let _viewName = _tableName + '_js';

module.exports = {

  // create
  create : function (clientOrderObj, cb) {

    let clientOrderDbFormat = _.pick(clientOrderObj, [
      'clientId',
      'orderTotal',
      'buyerEmail',
      'currency',
      'testMode'
    ]);

    clientOrderDbFormat['ip'] = clientOrderObj.ipAddress;
    clientOrderDbFormat['clientOrderId'] = clientOrderObj.orderId;
    clientOrderDbFormat['sharedUrlId'] = !_.isNil(clientOrderObj.cookies) ? clientOrderObj.cookies.sharedUrlId : null;

    // fill meta information
    var meta = {
      lineItems : clientOrderObj.lineItems,
      cookies : clientOrderObj.cookies,
      referer : clientOrderObj.referer,
      userAgent : clientOrderObj.userAgent
    };

    clientOrderDbFormat['meta'] = meta;

    db(_viewName)
      .insert(clientOrderDbFormat)
      .onConflict()
      .ignore()
      .then(() => {
        return cb(null);
      })
      .catch((err) => {
        err.clientOrderObj = clientOrderObj;
        err.clientOrderDbFormat = clientOrderDbFormat;
        return cb(dbError(err, _tableName));
      });
  },

  // get
  get : (orderId, cb) => {

    db(_viewName)
      .returning('*')
      .where({
        client_order_id: orderId
      })
      .then((row) => {
        return cb(null, row);
      });
  }
};
