var orderStatusEnum = require('../models/constants/orderStatus');
var _ = require('lodash');
var db = require('../db_pg');
const constants = require('../config/constants');
var dbError = require('../common/dbError');
var utilities = require('../common/utility');
var dbQuery = require('../common/dbQuery');
var msClient = require('../common/senecaClient');
var historyService = require('./sharedServices/history');

var getSymbolFromCurrency = require('currency-symbol-map').getSymbolFromCurrency;
var historyEntityTypeEnum = require('../models/constants/historyEntityType');

function areAllLineItemsCancelled(items) {
  return (_.filter(items, function(o) { return o.status !== orderStatusEnum.CANCELLED; })).length === 0 ? true : false;
}

module.exports = {

  // Create new order
  createOrder: function(orderObj, updateMetadata, cb) {

    // build line itens
    orderObj.lineItems = _.map(orderObj.lineItems, function (lineItem) {
      lineItem.status = orderStatusEnum.PENDING;

      // Move extra line item fields into a meta data field
      var lineItemFields = ['name', 'description', 'category', 'sku', 'quantity', 'price', 'status'];
      var meta = _.omit(lineItem, lineItemFields);
      lineItem = _.pick(lineItem, lineItemFields);

      _.extend(lineItem, {meta: meta});
      return lineItem;
    });

    // if the buyer email is not valid, set it as null
    let buyerEmail = (utilities.isValidEmail(orderObj.buyerEmail)) ? orderObj.buyerEmail : null;

    db('order_js')
      .returning('*')
      .insert({
        clientOrderId: orderObj.clientOrderId,
        status: (orderObj.status || orderStatusEnum.PENDING),
        total: orderObj.total ? orderObj.total : null,
        commission: orderObj.commission ? orderObj.commission : null,
        clientId: orderObj.clientId,
        sharerId: orderObj.sharerId,
        buyerId: orderObj.buyerId,
        buyerEmail: buyerEmail,
        lineItems: JSON.stringify(orderObj.lineItems),
        currency: getSymbolFromCurrency(orderObj.currency) ? orderObj.currency : null,
        overrideCampaignVersionId: orderObj.overrideCampaignVersionId,
        testMode: orderObj.testMode,
        meta: JSON.stringify(orderObj.meta),
        sharedUrlAccessId: orderObj.sharedUrlAccessId ? orderObj.sharedUrlAccessId : null
      })
      .then(function (response) {

        // Create history of updated order
        if(!_.isEmpty(response)){

          // notifify marketplace an order has changed
          msClient.act(_.extend(constants.EVENTS.MARKETPLACE.NOTIFY_ORDER, { order: response[0], external: false }));

          historyService.createHistory(response[0], updateMetadata.userId, updateMetadata.origin, historyEntityTypeEnum.ORDER, function(){});
          return cb(null, response[0]);
        }
        else
        {
          return cb();
        }
      })
      .catch(function (err) {
        return cb(dbError(err, 'Order'));
      });
  },
  // Get order
  getOrder : function(filter, cb) {
    db('order_js')
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
  getOrders : function (filter, query, cb) {
    var dbObj = db('order_js')
      .returning('*')
      .where(filter);

    dbQuery(dbObj, query)
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null, []) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Order'));
      });
  },
  getOrdersActivity: function (filter, query, cb) {
    var dbObj = db('agg_order_activity_v2_js')
      .returning('*')
      .where(filter);

    dbQuery(dbObj, query , ['clientOrderId','productTitle'])
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null, []) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Order_activity'));
      });
  },
  getOrdersActivityCount: function (filter, query, cb) {
    var dbObj = db('agg_order_activity_v2_js', ['clientOrderId','productTitle'])
      .count()
      .returning('*')
      .where(filter);

    dbQuery(dbObj, query)
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null, []) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Order_activity_count'));
      });
  },
  getOrdersWithReferer: function (filter, query, cb) {
    var dbObj = db('agg_order_referer_js')
      .returning('*')
      .where(filter);

    dbQuery(dbObj, query)
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null, []) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Order_referer'));
      });
  },
  getPaidAndPendingOrdersWithReferer: function (filter, query, cb) {
    var dbObj = db('agg_order_referer_js')
      .returning('*')
      .where(filter)
      .where(function(){
        this.where('status', 'PAID')
          .orWhere('status', 'PENDING');
      });

    dbQuery(dbObj, query)
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null, []) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Order_referer'));
      });
  },
  // Cancel order
  cancelOrder: function(clientId, clientOrderId, cancelledLineItems, updateMetadata, cb) {
    this.getOrder({
      clientId: clientId,
      clientOrderId: clientOrderId
    }, function(err, order) {
      if (err) {
        return cb(err);
      }

      if (!order) {
        return cb({
          code: 'ERR_ORDER_NOTFOUND',
          message: 'Order not found',
          data: {}
        });
      }

      // If no line items are submitted, cancel entire order
      if(!cancelledLineItems || cancelledLineItems.length === 0) {
        order.status = orderStatusEnum.CANCELLED;
      } else {
        // For each line item, cancel and/or remove quanitities
        _.forEach(cancelledLineItems, function(cancelledLineItem) {
          _.forEach(order.lineItems, function (lineItem) {
            if (lineItem.sku === cancelledLineItem.sku && lineItem.quantity > 0) {
              lineItem.quantity = cancelledLineItem.quantity;

              if (lineItem.quantity === 0) {
                lineItem.status = orderStatusEnum.CANCELLED;
              }
            }
          });
        });

        // If all line items have been cancelled, cancel entire order
        if (areAllLineItemsCancelled(order.lineItems)) {
          order.status = orderStatusEnum.CANCELLED;
        }
      }

      db('order_js')
        .returning('*')
        .where({
          clientId: clientId,
          clientOrderId: clientOrderId
        })
        .update(utilities.prepareJson(_.pick(order, ['status', 'lineItems'])))
        .then(function (rows) {

          // Create history of updated order
          if(!_.isEmpty(rows)){

            // notifify marketplace an order has changed
            msClient.act(_.extend(constants.EVENTS.MARKETPLACE.NOTIFY_ORDER, { order: rows[0], external: false }));

            // create history
            historyService.createHistory(rows[0], updateMetadata.userId, updateMetadata.origin, historyEntityTypeEnum.ORDER, function(){});
            return cb(null, rows[0]);
          }
          else
          {
            return cb();
          }
        })
        .catch(function (err) {
          return cb(dbError(err, 'Order'));
        });
    });
  },

  updateOrder: function (clientId, orderId, payload, updateMetadata,  cb) {
    db('order_js')
      .returning('*')
      .where({
        clientId: clientId,
        _id: orderId
      })
      .update(payload)
      .then(function (rows) {

        // Create history of updated order
        if(!_.isEmpty(rows)){

          // notifify marketplace an order has changed
          msClient.act(_.extend(constants.EVENTS.MARKETPLACE.NOTIFY_ORDER, { order: rows[0], external: false }));

          // create history
          historyService.createHistory(rows[0], updateMetadata.userId ,updateMetadata.origin, historyEntityTypeEnum.ORDER, function(){});
          return cb(null, rows[0]);
        }
        else
        {
          return cb();
        }
      })
      .catch(function (err) {
        return cb(dbError(err, 'Order'));
      });
  },
  getOrdersUserActivity: function (filter, query, cb) {
    var dbObj = db('agg_order_user_activity_v2_js')
      .returning('*')
      .where(filter);

    dbQuery(dbObj, query)
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null, []) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Order_order_user_activity'));
      });
  },
  getOrdersUserActivityCount: function (filter, query, cb) {
    var dbObj = db('agg_order_user_activity_v2_js')
      .count()
      .returning('*')
      .where(filter);

    dbQuery(dbObj, query)
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null, []) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Order_order_user_activity'));
      });
  },

  getPaidOrdersWithOustandingRewards: function (orderIds) {
    return new Promise((resolve,reject)=>{

      let select = `
        SELECT * FROM reverb.paid_orders_with_oustanding_rewards_js as orders
        where 
        (
          ("orderType"  = 'order' AND "orderId" not in (select "orderId" from reverb.process_post_conversion_reward_js where "orderId" is not null))
          OR
          ("orderType" = 'external-order' and "orderId" not in (select "externalOrderId" from reverb.process_post_conversion_reward_js where "externalOrderId" is not null))
        )
      `;

      if(orderIds && orderIds.length > 0){
        select += db.raw('AND "orderId" IN(?)', orderIds).toString();
      }

      db.raw(select).then((process)=>{
        resolve(process.rows);
      }).catch((err)=>{
        reject(dbError(err, `Error to call 'get' data from process_post_conversion_reward_js`));
      });
    });
  },

  getPage(filter, query, cb) {
    const viewName = 'agg_orders_js';
    const countWithoutOffset = new Promise((resolve,reject) => {
      let dbObj = db(viewName);

      const queryForCount = _.omit(query,['$offset','$sort','$limit']);
      const dbObjCount = dbObj.count('*').where(filter);

      dbQuery(dbObjCount,queryForCount,['clientName','status','clientOrderId','buyerEmail','sharerId','_id','total::money','commission::money','subtotal::money','currency'])
        .then( (count) => {
          resolve(_.isEmpty(count) ? 0 : count[0]['count'] );
        })
        .catch( (err) => {
          reject(err);
        });
    });

    const queryPage = new Promise((resolve,reject) => {
      let dbObj = db(viewName)
        .returning('*')
        .where(filter);
      dbQuery(dbObj, query, ['clientName','status','clientOrderId','buyerEmail','sharerId','_id','total::money','commission::money','subtotal::money','currency'])
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

  getJoinedPage(filter, query, cb) {
    const viewName = 'agg_orders_joined_js';
    const countWithoutOffset = new Promise((resolve,reject) => {
      let dbObj = db(viewName);

      const queryForCount = _.omit(query,['$offset','$sort','$limit']);
      const dbObjCount = dbObj.count('*').where(filter);

      dbQuery(dbObjCount,queryForCount,['clientName','status','clientOrderId','buyerEmail','sharerId','_id','total::money','commission::money','subtotal::money','currency'])
        .then( (count) => {
          resolve(_.isEmpty(count) ? 0 : count[0]['count'] );
        })
        .catch( (err) => {
          reject(err);
        });
    });

    const queryPage = new Promise((resolve,reject) => {
      let dbObj = db(viewName)
        .returning('*')
        .where(filter);
      dbQuery(dbObj, query, ['clientName','status','clientOrderId','buyerEmail','sharerId','_id','total::money','commission::money','subtotal::money','currency'])
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

  getAggOrderByCampaignVersion: (campaignVersionId, updatedAt, pagination) => {

    let $limit = 100;
    let $offset = 0;

    if(pagination){
      $limit = pagination.pageSize || $limit;
      $offset = pagination.pageNumber ? ($limit * (pagination.pageNumber - 1)) : $offset;
    }

    // main promisse
    return new Promise((resolve, reject) => {

      // base select
      let select = db('reverb.agg_order_campaign_version_js');

      select.where({campaignVersionId: campaignVersionId});

      if(updatedAt){
        select.andWhere('updatedAt', '>=', updatedAt);
      }

      let selectCount = select.clone().count('*');
      let selectPage = dbQuery(select, { $offset, $limit });

      Promise.all([selectPage, selectCount])
        .then((result) => {
          resolve({
            page: result[0],
            count: result[1]
          });
        })
        .catch((error) => {
          reject(error);
        });
    });
  },

  getOrdersSharedUrlAccess : (orderIds) => {

    if(!orderIds || orderIds.length == 0){
      return Promise.resolve([]);
    }

    let select = `
      SELECT
        coalesce("order"._id, external_order._id) order_id,
        sua.*
      FROM
        reverb.shared_url_access sua
        LEFT JOIN
        reverb.order "order"
        on
        "order".shared_url_access_id = sua._id
        LEFT JOIN
        reverb.external_order external_order
        on
        external_order.shared_url_access_id = sua._id
      WHERE
        "order"._id in (${orderIds.map(o => `'${o}'`).join(',')})
        or
        external_order._id in (${orderIds.map(o => `'${o}'`).join(',')})
    `;

    return new Promise((resolve, reject) => {

      db.raw(select)
        .then((suas)=>{
          resolve(suas.rows);
        }).catch((err)=>{
          reject(dbError(err, `Error to call 'get' data from shared_url_access`));
        });
    });
  },
  getAggOrdersBySharedUrlId : (sharedUrlId) => {

    return db('reverb.agg_order_campaign_version_js').where({ sharedUrlId });
  }
};
