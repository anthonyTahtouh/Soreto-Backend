var _ = require('lodash');

var db = require('../db_pg');
var dbError = require('../common/dbError');
var dbQuery = require('../common/dbQuery');
var knex = require('knex')({
  client: 'pg'
});

// view name on database
var viewName = 'reverb.agg_campaign_version_stats_daily_js';

module.exports = {

  getAggClientStats: function (filter, query, cb) {

    // main select
    this.select = `

    MAX("clientName") AS "clientName",
	  "clientId",
	  BOOL_OR("externalMerchantHolderConfigured") AS "externalMerchantHolderConfigured",
    MAX("externalMerchantHolderConnectedAt") AS "externalMerchantHolderConnectedAt",
    MAX("externalMerchantHolderDisconnectedAt") AS "externalMerchantHolderDisconnectedAt",
    BOOL_OR("externalMerchantHolderConnected") AS "externalMerchantHolderConnected",
    
	  SUM("countSoretoSales") AS "countSoretoSales",
	  SUM("countSoretoSalesPending") AS "countSoretoSalesPending",
	  SUM("countSoretoSalesPaid") AS "countSoretoSalesPaid",
	  SUM("countSoretoSalesDeclined") AS "countSoretoSalesDeclined",
	  SUM("totalValueSoretoSales") AS "totalValueSoretoSales",
	  SUM("totalValueSoretoSalesPending") AS "totalValueSoretoSalesPending",
	  SUM("totalValueSoretoSalesPaid") AS "totalValueSoretoSalesPaid",
	  SUM("totalValueSoretoSalesDeclined") AS "totalValueSoretoSalesDeclined",
	  SUM("totalValueSoretoCommission") AS "totalValueSoretoCommission",
	  SUM("totalValueSoretoCommissionPending") AS "totalValueSoretoCommissionPending",
	  SUM("totalValueSoretoCommissionPaid") AS "totalValueSoretoCommissionPaid",
	  SUM("totalValueSoretoCommissionDeclined") AS "totalValueSoretoCommissionDeclined",
	  
	  SUM("countSoretoSalesExternal") AS "countSoretoSalesExternal",
	  SUM("countSoretoSalesPendingExternal") AS "countSoretoSalesPendingExternal",
	  SUM("countSoretoSalesPaidExternal") AS "countSoretoSalesPaidExternal",
	  SUM("countSoretoSalesDeclinedExternal") AS "countSoretoSalesDeclinedExternal",
	  SUM("totalValueSoretoSalesExternal") AS "totalValueSoretoSalesExternal",
	  SUM("totalValueSoretoSalesPendingExternal") AS "totalValueSoretoSalesPendingExternal",
	  SUM("totalValueSoretoSalesPaidExternal") AS "totalValueSoretoSalesPaidExternal",
	  SUM("totalValueSoretoSalesDeclinedExternal") AS "totalValueSoretoSalesDeclinedExternal",
	  SUM("totalValueSoretoCommissionExternal") AS "totalValueSoretoCommissionExternal",
	  SUM("totalValueSoretoCommissionPendingExternal") AS "totalValueSoretoCommissionPendingExternal",
	  SUM("totalValueSoretoCommissionPaidExternal") AS "totalValueSoretoCommissionPaidExternal",
	  SUM("totalValueSoretoCommissionDeclinedExternal") AS "totalValueSoretoCommissionDeclinedExternal",
    
    SUM("countSoretoSalesJoined") AS "countSoretoSalesJoined",
	  SUM("countSoretoSalesPendingJoined") AS "countSoretoSalesPendingJoined",
	  SUM("countSoretoSalesPaidJoined") AS "countSoretoSalesPaidJoined",
	  SUM("countSoretoSalesDeclinedJoined") AS "countSoretoSalesDeclinedJoined",
	  SUM("totalValueSoretoSalesJoined") AS "totalValueSoretoSalesJoined",
	  SUM("totalValueSoretoSalesPendingJoined") AS "totalValueSoretoSalesPendingJoined",
	  SUM("totalValueSoretoSalesPaidJoined") AS "totalValueSoretoSalesPaidJoined",
	  SUM("totalValueSoretoSalesDeclinedJoined") AS "totalValueSoretoSalesDeclinedJoined",
	  SUM("totalValueSoretoCommissionJoined") AS "totalValueSoretoCommissionJoined",
	  SUM("totalValueSoretoCommissionPendingJoined") AS "totalValueSoretoCommissionPendingJoined",
	  SUM("totalValueSoretoCommissionPaidJoined") AS "totalValueSoretoCommissionPaidJoined",
    SUM("totalValueSoretoCommissionDeclinedJoined") AS "totalValueSoretoCommissionDeclinedJoined",
    
    SUM("countSales") AS "countSales",
	  SUM("countSalesPending") AS "countSalesPending",
	  SUM("countSalesPaid") AS "countSalesPaid",
	  SUM("countSalesDeclined") AS "countSalesDeclined",
	  SUM("totalValueSales") AS "totalValueSales",
	  SUM("totalValueSalesPending") AS "totalValueSalesPending",
	  SUM("totalValueSalesPaid") AS "totalValueSalesPaid",
	  SUM("totalValueSalesDeclined") AS "totalValueSalesDeclined",
	  SUM("totalValueCommission") AS "totalValueCommission",
	  SUM("totalValueCommissionPending") AS "totalValueCommissionPending",
	  SUM("totalValueCommissionPaid") AS "totalValueCommissionPaid",
	  SUM("totalValueCommissionDeclined") AS "totalValueCommissionDeclined",
	  
	  SUM("shares") AS "shares",	  
    SUM(COALESCE("clicks", 0)) AS "clicks",
    SUM(COALESCE("clicksSoreto", 0)) AS "clicksSoreto",
    SUM(COALESCE("clicksTrackedExternal", 0)) AS "clicksTrackedExternal",	 
    SUM(COALESCE("clicksUntrackedExternal", 0)) AS "clicksUntrackedExternal", 
    SUM(COALESCE("clicksJoined", 0)) AS "clicksJoined",
    SUM(COALESCE("clicksJoinedUntracked", 0)) AS "clicksJoinedUntracked",
	  SUM(COALESCE("clientSales", 0)) AS "clientSales",
	  SUM(COALESCE("offerClicks", 0)) AS "offerClicks",
	  SUM(COALESCE("soretoTraffic", 0)) AS "soretoTraffic",
    BOOL_OR("clientActive") AS "clientActive"

    `;

    this.search = new Set();

    this.search.add('clientName');
    this.groupByRaw = `"clientId"`;

    // group by day?
    if(query.daily && query.daily === 'true') {

      this.select += `,
        date
      `;

      this.groupByRaw += `,
      date
      `;
    }
    // group by campaing level?
    if(query.showCampaignLevel && query.showCampaignLevel === 'true') {

      this.select += `,
        max("campaignName") as "campaignName",
        "campaignId"
      `;

      this.groupByRaw += `,
        "campaignId"
      `;

      this.search.add('campaignName');
    }

    // group by campaing version level?
    if(query.showCampaignVersionLevel && query.showCampaignVersionLevel === 'true') {

      this.select += `,
        max("campaignVersionName") as "campaignVersionName",
        "campaignVersionId"
      `;
      this.groupByRaw += `,
        "campaignVersionId"
      `;

      this.search.add('campaignVersionName');
    }

    // create filter to an affiliate network partner
    let rawGroup = '';
    if(query.affiliateId){
      if(query.affiliateId == '-1'){
        rawGroup = `"clientId" not in (select "clientId" from "reverb"."assoc_affiliate_merchant_client_js" where "clientId" = "clientId") `;
      }else{
        rawGroup = `"clientId" in (select "clientId" from "reverb"."assoc_affiliate_merchant_client_js" where "clientId" = "clientId" and "affiliateId" = '${query.affiliateId}') `;
      }
    }

    // convert a "set" into an array
    this.search = Array.from(this.search);

    // build the base query object
    this.dbObj = db(viewName)
      .returning('*')
      .where(filter)
      .andWhereRaw(rawGroup)
      .groupByRaw(this.groupByRaw)
      .select(
        knex.raw(this.select)
      );

    // query the result count
    const countWithoutOffset = new Promise((resolve,reject) => {

      const queryForCount = _.omit(query,['$offset','$sort','$limit']);

      dbQuery(this.dbObj, queryForCount, this.search, true)
        .then(function (rows) {
          resolve(_.isEmpty(rows) ? 0 : rows[0].count );
        })
        .catch(function (err) {
          reject(err);
        });
    });

    // query the result page
    const queryPage = new Promise((resolve,reject) => {

      dbQuery(this.dbObj, query, this.search)
        .then(function (rows) {
          resolve(_.isEmpty(rows) ? [] : rows );
        })
        .catch(function (err) {
          reject(err);
        });
    });

    // call the promisses
    Promise.all([queryPage, countWithoutOffset])
      .then(function(values){

        cb(null,{
          page:values[0],
          totalCount:values[1]
        });
      }).catch((err) => {
        cb(dbError(err, viewName));
      });
  },
};
