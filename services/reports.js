var _ = require('lodash');
var db = require('../db_pg');
var dbError = require('../common/dbError');
var dbQuery = require('../common/dbQuery');
const parseBoolean = require('../common/utility').parseBoolean;
const _elasticsearchQueryComposer = require('../common/elasticseachStatsQueryComposer');
const _elasticsearchGenericQueryComposer = require('../common/elasticsearchGenericQueryComposer');
const clientStatsService = require('./clientStatsService');
const userAccess = require('../services/userAccess');

module.exports = {

  /**
   * POSTGRES
   */
  postgres : {

    getRemainingDiscountCodesByClient(filter,query) {
      return new Promise((resolve,reject)=>{
        var dbObj = db('agg_reward_discount_code_remaining_valid_js')
          .returning('*')
          .where(filter);

        dbQuery(dbObj, query,['client','rewardName','rewardId'])
          .then( (row) => {
            resolve(_.isEmpty(row) ? [] : row);
          })
          .catch( (err) => {
            reject(dbError(err, 'Error to call "get" data from agg_reward_discount_code_remaining_valid_js'));
          });
      });
    },


    getRemainingDiscountCodesByClientBasic(filter, query,cb) {
      const data = new Promise((resolve, reject) => {
        let dbObj = db('agg_remaining_rewards_codes_basic_js')
          .returning('*')
          .where(filter);

        dbQuery(dbObj, query, ['clientName', 'rewardName', 'clientActive', 'rewardId'])
          .then((row) => {
            resolve(_.isEmpty(row) ? [] : row);
          })
          .catch((err) => {
            reject(dbError(err, 'Error to call "get" data from agg_remaining_rewards_codes_basic_js'));
          });
      });


      const countWithoutOffset = new Promise(function(resolve, reject) {
        let dbObj = db('agg_remaining_rewards_codes_basic_js');

        const queryForCount = _.omit(query, ['$offset', '$sort', '$limit']);
        const dbObjCount = dbObj.count('*').where(filter);

        dbQuery(dbObjCount, queryForCount, ['clientName', 'rewardName', 'clientActive'])
          .then(function(count) {
            resolve(_.isEmpty(count) ? 0 : count[0]['count']);
          })
          .catch(function(err) {
            reject(err);
          });
      });


      Promise.all([data, countWithoutOffset])
        .then(function(values){
          cb(null,{
            page:values[0],
            totalCount:values[1]
          });
        }).catch(function(err) {
          cb(dbError(err, 'agg_remaining_rewards_codes_basic_js'));
        });
    },

    getLiveClients: function(filter, query, cb) {
      const countWithoutOffset = new Promise(function(resolve, reject) {
        let dbObj = db('agg_live_clients_js');

        const queryForCount = _.omit(query, ['$offset', '$sort', '$limit']);
        const dbObjCount = dbObj.count('*').where(filter);

        dbQuery(dbObjCount, queryForCount, ['name'])
          .then(function (count) {
            resolve(_.isEmpty(count) ? 0 : count[0]['count']);
          })
          .catch(function (err) {
            reject(err);
          });
      });
      const queryPage = new Promise(function (resolve, reject) {
        let dbObj = db('agg_live_clients_js')
          .returning('*')
          .where(filter);
        dbQuery(dbObj, query, ['name'])
          .then(function (rows) {

            const newArr = _.map(rows, row => {
              row.pixelLineItems = JSON.parse(row.pixelLineItems);
              const pixelLineItemsPriceSum = _.reduce(row.pixelLineItems, (acc, curr) => acc + parseFloat(curr.price), 0);
              row.pixelOrderTotal = row.pixelOrderTotal || pixelLineItemsPriceSum;
              row.lightboxHit = Boolean(row.placementEmail) && Boolean(row.placementFirstName) && row.placementEmail !== 'undefined' && row.placementFirstName !== 'undefined';
              row.trackingHit = Boolean(row.pixelOrderId) && Boolean(row.pixelOrderTotal) && row.pixelOrderId !== 'undefined';

              return row;
            });

            resolve(_.isEmpty(newArr) ? [] : newArr);
          })
          .catch(function (err) {
            reject(err);
          });
      });

      Promise.all([queryPage, countWithoutOffset])
        .then(function (values) {
          cb(null, {
            page: values[0],
            totalCount: values[1]
          });
        }).catch(function (err) {
          cb(dbError(err, 'agg_live_clients_js'));
        });
    },

    getBreakage(filter, startDate, endDate, clientIds) {
      try {
        const builder = db('agg_breakage_reward_js')
          .where(filter)
          .andWhere('month', '>=', startDate)
          .andWhere('month', '<=', endDate);

        if (clientIds) {
          builder.whereIn('clientId', clientIds ? clientIds : '');
        }

        return builder.returning('*');
      }
      catch (error) {
        throw dbError(error,Error);
      }
    }
  },

  /**
   * ELASTICSEARCH
   */
  elasticsearch : {
    getLiveStats(groupLevels, sortField, startDate, endDate, page, size, filters, extraFields, apiVersion, showInactiveDays = true, exception, customParams = {}) {

      let query = _elasticsearchQueryComposer.queries.stats.name;
      return _elasticsearchQueryComposer
        .which(query)
        .ignoreZeroResult(!parseBoolean(showInactiveDays))
        .apiVersion(apiVersion)
        .start()
        .filters(filters)
        .groupLevels(groupLevels)
        .fields(null, extraFields, exception)
        .customParams(customParams)
        .sort(sortField)
        .limits(startDate, endDate, page, size)
        .debug()
        .go()
        .then((result) => {
          return result;
        }).catch((err) => {
          throw err;
        });
    },

    getLiveStatsByChannel(startDate, endDate, filters, apiVersion) {

      let query = _elasticsearchQueryComposer.queries.byChannel.name;

      return _elasticsearchQueryComposer
        .which(query)
        .apiVersion(apiVersion)
        .start()
        .filters(filters)
        .groupLevels(['socialPostSocialPlatform'])
        .limits(startDate, endDate)
        .debug()
        .go()
        .then((result) => {
          return result;
        }).catch((err) => {
          throw err;
        });
    },

    genericSearch(startDate, endDate, pattern, freeString, query, sort, page, size) {

      return _elasticsearchGenericQueryComposer
        .query(query)
        .freeString(freeString)
        .start()
        .indexPattern(pattern)
        .sort(sort)
        .limits(startDate, endDate, page, size)
        .go()
        .then((result) => {
          return _.get(result, 'body.hits');
        }).catch((err) => {
          throw err;
        });
    }
  },

  xlsx: {

    populateWorkbookFromLiveStats(workbook, liveStats, shouldShowColumn, currency) {

      const worksheet = workbook.addWorksheet('Sheet1');

      worksheet.columns = this.getWorksheetColumns(shouldShowColumn, currency);

      // Format and calculate all client stats and their totals based on the liveStats JSON array
      let { totals, parsedLiveStats } = clientStatsService.parseLiveStats(liveStats, currency);

      worksheet.addRows(parsedLiveStats);

      worksheet.addRow(this.getTotalsRow(worksheet, totals));

      this.setColumnsFormats(worksheet, shouldShowColumn, currency);

      this.setStyle(worksheet);

      return workbook;
    },

    populateWorkbookFromLiveStatsSummaryPage(workbook, liveStats, shouldShowColumn, currency) {

      const worksheet = workbook.addWorksheet('Sheet1');


      worksheet.columns = this.getWorksheetColumnsSummaryPage(shouldShowColumn, currency);

      // Format and calculate all client stats and their totals based on the liveStats JSON array
      let { totals, parsedLiveStats } = clientStatsService.parseLiveStats(liveStats, currency);

      worksheet.addRows(parsedLiveStats);

      const reapeatedIsOn = shouldShowColumn.showRepeated;
      worksheet.addRow(this.getTotalsRowSummaryPage(worksheet, totals, reapeatedIsOn));

      this.setColumnsFormats(worksheet, shouldShowColumn, currency);

      this.setStyle(worksheet);

      return workbook;
    },

    // Create columns and their headers
    getWorksheetColumns(shouldShowColumn, currency) {

      let worksheetColumns = [];

      if (shouldShowColumn.eventDateTerm) {
        worksheetColumns.push({header: 'Date', key: 'eventDateTerm', width: 20});
      }

      // Client is in the middle of the optional columns!
      worksheetColumns.push({header: 'Client', key: 'clientName', width: 25 });

      if(shouldShowColumn.clientLaunchDiffDays){
        worksheetColumns.push({header: 'Validity', key: 'clientLaunchDiffDays', width: 20});
      }

      if(shouldShowColumn.clientIndustry){
        worksheetColumns.push({header: 'Industry', key: 'clientIndustry', width: 20});
      }

      if (shouldShowColumn.clientResponsibleName) {
        worksheetColumns.push({header: 'Responsible', key: 'clientResponsibleName', width: 20});
      }

      if (shouldShowColumn.utmCampaign) {
        worksheetColumns.push({header: 'Utm Campaign', key: 'utmCampaign', width: 20});
      }

      if (shouldShowColumn.clientCountry) {
        worksheetColumns.push({header: 'Client Country', key: 'clientCountry', width: 20});
      }

      if (shouldShowColumn.campaignCountryName) {
        worksheetColumns.push({header: 'Campaign Country', key: 'campaignCountryName', width: 20});
      }

      if (shouldShowColumn.campaignName) {
        worksheetColumns.push({header: 'Campaign', key: 'campaignName', width: 20});
      }

      if (shouldShowColumn.campaignVersionName) {
        worksheetColumns.push({header: 'Version', key: 'campaignVersionName', width: 20});
      }

      if (shouldShowColumn.campaignVersionAlias) {
        worksheetColumns.push({header: 'Alias', key: 'campaignVersionAlias', width: 20});
      }

      if(shouldShowColumn.campaignVersionSourceTagGroup) {
        worksheetColumns.push({header: 'Source Tag', key: 'campaignVersionSourceTagGroup', width: 20});
      }

      if (shouldShowColumn.socialPostSocialPlatform) {
        worksheetColumns.push({header: 'Social Platform', key: 'socialPostSocialPlatform', width: 20});
      }

      /**
       *
       *  DEVICES
       *
       */

      if (shouldShowColumn.showDeviceType) {
        if(shouldShowColumn.deviceGroupPerspective == 'sharer'){
          worksheetColumns.push({header: 'Device Type', key: 'sharePlaceDeviceType', width: 20});
        }else{
          worksheetColumns.push({header: 'Device Type', key: 'deviceType', width: 20});
        }
      }

      if (shouldShowColumn.showDeviceOS) {
        if(shouldShowColumn.deviceGroupPerspective == 'sharer'){
          worksheetColumns.push({header: 'Device OS', key: 'sharePlaceDeviceOS', width: 20});
        }else {
          worksheetColumns.push({header: 'Device OS', key: 'deviceOS', width: 20});
        }
      }

      if (shouldShowColumn.showDeviceBrowser) {
        if(shouldShowColumn.deviceGroupPerspective == 'sharer'){
          worksheetColumns.push({header: 'Device Browser', key: 'sharePlaceDeviceBrowser', width: 20});
        }else {
          worksheetColumns.push({header: 'Device Browser', key: 'deviceBrowser', width: 20});
        }
      }

      if (!shouldShowColumn.socialPostSocialPlatform) {
        worksheetColumns.push({header: 'Lightbox Views', key: 'clientSales', width: 18});

        if(shouldShowColumn.showDeviceRate){
          worksheetColumns.push({header: 'Device Views %', key: 'deviceRateLightboxViews', width: 10});
        }
      }

      worksheetColumns.push({header: 'Shares', key: 'shares', width: 10});

      if(shouldShowColumn.showDeviceRate){
        worksheetColumns.push({header: 'Device Shares %', key: 'deviceRateShares', width: 10});
      }

      if (!shouldShowColumn.socialPostSocialPlatform) {
        worksheetColumns.push({header: 'Share Rate', key: 'shareRate', width: 15});
      }

      let currencySign = this.getCurrencySign(currency);

      worksheetColumns.push(
        {header: 'Ref Clicks', key: 'refClicks', width: 12},
        {header: 'Reach Multiple', key: 'reachMultiple', width: 18},
        {header: 'Int.', key: 'interstitialClicks', width: 8}
      );

      if(shouldShowColumn.showDeviceRate){
        worksheetColumns.push({header: 'Device Int. %', key: 'deviceRateInterstitialClick', width: 10});
      }

      worksheetColumns.push(
        {header: 'Soreto Sales', key: 'soretoSales', width: 16},
        {header: 'Conv. Rate', key: 'conversionRate', width: 14},
        {header: 'Revenue', key: currency === 'OriginalValue' ? `totalValueSales` : `totalValueSales_${currency}`, width: 15},
        {header: 'Pend #', key: 'pendingSalesCount', width: 10},
        {header: 'Conf #', key: 'paidSalesCount', width: 10},
        {header: 'Decl #', key: 'declinedSalesCount', width: 10}
      );

      if (currency === 'OriginalValue') {
        worksheetColumns.push(
          {header: `Com.`, key: `salesCommission`, width: 15},
          {header: `Com. Pen.`, key:  `pendingSalesCommission`, width: 16},
          {header: `Com. Paid`, key:  `paidSalesCommission`, width: 16},
          {header: `Com. Decl.`, key:  `declinedSalesCommission`, width: 16},
        );
      } else {
        worksheetColumns.push(
          {header: `Com. ${currencySign}`, key: `salesCommission_${currency}`, width: 15},
          {header: `Com. Pen. ${currencySign}`, key:  `pendingSalesCommission_${currency}`, width: 16},
          {header: `Com. Paid ${currencySign}`, key:  `paidSalesCommission_${currency}`, width: 16},
          {header: `Com. Decl. ${currencySign}`, key:  `declinedSalesCommission_${currency}`, width: 16},
        );
      }

      // Insert a hidden column in the worksheet with the clientCountryCurrencyCode to
      // be used later when formating the values
      if (currency === 'ClientCountryCurrency') {
        worksheetColumns.push({ key: 'clientCountryCurrencyCode', hidden: true });
      }

      return worksheetColumns;
    },

    getWorksheetColumnsSummaryPage(shouldShowColumn, currency) {

      let worksheetColumns = [];

      if (shouldShowColumn.eventDateTerm) {
        worksheetColumns.push({header: 'Date', key: 'eventDateTerm', width: 20});
      }

      // Client is in the middle of the optional columns!
      worksheetColumns.push({header: 'Client', key: 'clientName', width: 25 });

      if (!shouldShowColumn.socialPostSocialPlatform) {
        worksheetColumns.push({header: 'Lightbox Views', key: 'clientSales', width: 18});
      }

      if (shouldShowColumn.clientResponsibleName) {
        worksheetColumns.push({header: 'Responsible', key: 'clientResponsibleName', width: 20});
      }

      if (shouldShowColumn.clientCountry) {
        worksheetColumns.push({header: 'Client Country', key: 'clientCountry', width: 20});
      }

      if (shouldShowColumn.campaignCountryName) {
        worksheetColumns.push({header: 'Campaign Country', key: 'campaignCountryName', width: 20});
      }

      if (shouldShowColumn.campaignName) {
        worksheetColumns.push({header: 'Campaign', key: 'campaignName', width: 20});
      }

      if (shouldShowColumn.campaignVersionName) {
        worksheetColumns.push({header: 'Version', key: 'campaignVersionName', width: 20});
      }

      if (shouldShowColumn.campaignVersionAlias) {
        worksheetColumns.push({header: 'Alias', key: 'campaignVersionAlias', width: 20});
      }

      if(shouldShowColumn.campaignVersionSourceTagGroup) {
        worksheetColumns.push({header: 'Source Tag', key: 'campaignVersionSourceTagGroup', width: 20});
      }

      if (shouldShowColumn.socialPostSocialPlatform) {
        worksheetColumns.push({header: 'Social Platform', key: 'socialPostSocialPlatform', width: 20});
      }

      worksheetColumns.push({header: 'Shares', key: 'shares', width: 10});

      if (!shouldShowColumn.socialPostSocialPlatform) {
        worksheetColumns.push({header: 'Share Rate', key: 'shareRate', width: 15});
      }

      let currencySign = this.getCurrencySign(currency);


      worksheetColumns.push(
        {header: 'Ref Clicks', key: 'refClicks', width: 12},
        {header: 'CTR', key: 'reachMultiple', width: 12},
        {header: 'Soreto Sales', key: 'soretoSales', width: 16},
        {header: 'Conv. Rate', key: 'conversionRate', width: 14},
      );

      if (shouldShowColumn.showRepeated) {
        worksheetColumns.push({header: 'Repeated Sales', key: 'countSoretoSales_Repeated', width: 20});
        worksheetColumns.push({header: 'Repeated Sales_%', key: 'countSoretoSales_Repeated_Proportion', width: 20});
        worksheetColumns.push({header: 'New Sales', key: 'countSoretoSales_New', width: 20});
        worksheetColumns.push({header: 'New Sales %', key: 'countSoretoSales_New_Proportion', width: 20});
      }

      worksheetColumns.push({header: 'Revenue', key: currency === 'OriginalValue' ? `totalValueSales` : `totalValueSales_${currency}`, width: 15});

      if (!shouldShowColumn.showRepeated) {
        worksheetColumns.push({header: 'AOV', key: 'aov', width: 15});
      }

      if (shouldShowColumn.showRepeated) {
        worksheetColumns.push({header: 'New Revenue', key: currency === 'OriginalValue' ? `totalValueSales_New` : `totalValueSales_New_${currency}`, width: 20});
        worksheetColumns.push({header: 'Repeated Revenue', key: currency === 'OriginalValue' ? `totalValueSales_Repeated` : `totalValueSales_Repeated_${currency}`, width: 20});
      }

      if (currency === 'OriginalValue') {
        worksheetColumns.push(
          {header: `Com.`, key: `salesCommission`, width: 15},
        );
      } else {
        worksheetColumns.push(
          {header: `Com. ${currencySign}`, key: `salesCommission_${currency}`, width: 15},
        );
      }

      if (shouldShowColumn.showRepeated) {
        worksheetColumns.push({header: `New Com. ${currencySign}`, key: currency === 'OriginalValue' ? `salesCommission_New` : `salesCommission_New_${currency}`, width: 20});
        worksheetColumns.push({header: `Repeated Com. ${currencySign}`, key: currency === 'OriginalValue' ? `salesCommission_Repeated` : `salesCommission_Repeated_${currency}`, width: 20});
      }

      if (!shouldShowColumn.showRepeated) {
        worksheetColumns.push({header: 'ROI', key: 'roi', width: 15});
      }

      // Insert a hidden column in the worksheet with the clientCountryCurrencyCode to
      // be used later when formating the values
      if (currency === 'ClientCountryCurrency') {
        worksheetColumns.push({ key: 'clientCountryCurrencyCode', hidden: true });
      }

      return worksheetColumns;
    },

    getTotalsRow(worksheet, totals) {
      let totalsRow = [];
      totalsRow.push('Totals:');
      const firstColumnWithTotal = worksheet._keys.socialPostSocialPlatform ? 'shares' : 'clientSales';

      // Leaves empty all 'Totals:' row cells without value
      // This way there's no need to do 'if(shouldShowColumn.campaignName) push('')' for each optional column
      const numberOfCelsWithoutTotalValue =  worksheet.getColumn(firstColumnWithTotal)._number - 2;
      for( let i = 0; i < numberOfCelsWithoutTotalValue; i++) {
        totalsRow.push('');
      }

      if (!worksheet._keys.socialPostSocialPlatform) {
        totalsRow.push(totals.clientSales);

        if(worksheet.columns.some(c => c.key == 'deviceRateLightboxViews')){
          totalsRow.push('');
        }
      }

      totalsRow.push(totals.shares);

      if(worksheet.columns.some(c => c.key == 'deviceRateShares')){
        totalsRow.push('');
      }

      if (!worksheet._keys.socialPostSocialPlatform) {
        totalsRow.push(totals.shareRate);
      }

      totalsRow.push(
        totals.clicks,
        totals.reachMultiple,
        totals.soretoTraffic
      );

      if(worksheet.columns.some(c => c.key == 'deviceRateInterstitialClick')){
        totalsRow.push('');
      }

      totalsRow.push(
        totals.countSoretoSales,
        totals.conversionRate,
        totals.totalValueSales,
        totals.countSoretoSalesPending,
        totals.countSoretoSalesPaid,
        totals.countSoretoSalesDeclined,
        totals.totalValueSoretoCommission,
        totals.totalValueSoretoCommissionPending,
        totals.totalValueSoretoCommissionPaid,
        totals.totalValueSoretoCommissionDeclined,
      );

      return totalsRow;
    },

    getTotalsRowSummaryPage(worksheet, totals, repeatedIsOn) {
      let totalsRow = [];
      totalsRow.push('Totals:');
      const firstColumnWithTotal = worksheet._keys.socialPostSocialPlatform ? 'shares' : 'clientSales';

      // Leaves empty all 'Totals:' row cells without value
      // This way there's no need to do 'if(shouldShowColumn.campaignName) push('')' for each optional column
      const numberOfCelsWithoutTotalValue =  worksheet.getColumn(firstColumnWithTotal)._number - 2;
      for( let i = 0; i < numberOfCelsWithoutTotalValue; i++) {
        totalsRow.push('');
      }

      if (!worksheet._keys.socialPostSocialPlatform) {
        totalsRow.push(totals.clientSales);
      }

      totalsRow.push(totals.shares);

      if (!worksheet._keys.socialPostSocialPlatform) {
        totalsRow.push(totals.shareRate);
      }

      if (repeatedIsOn){
        totalsRow.push(
          totals.clicks,
          totals.reachMultiple,
          totals.countSoretoSales,
          totals.conversionRate,
          totals.countSoretoSales_Repeated,
          totals.countSoretoSales_Repeated_Proportion,
          totals.countSoretoSales_New,
          totals.countSoretoSales_New_Proportion,
          totals.totalValueSales,
          totals.totalValueSales_New,
          totals.totalValueSales_Repeated,
          totals.totalValueSoretoCommission,
          totals.salesCommission_New,
          totals.salesCommission_Repeated
        );
      } else {
        totalsRow.push(
          totals.clicks,
          totals.reachMultiple,
          totals.countSoretoSales,
          totals.conversionRate,
          totals.totalValueSales,
          totals.aov,
          totals.totalValueSoretoCommission,
          totals.roi
        );
      }

      return totalsRow;
    },

    /**
     * The "if (row > 1)" is to not format the header.
     * Theses formats are from Excel VBA .numberFormat. When formatting currency which
     * is not dollar ($) it assumes as 'custom' not 'currency' in excel.
     * General     General
     * Number      0
     * Currency    $#,##0.00;[Red]$#,##0.00
     * Accounting  _($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)
     * Date        m/d/yy
     * Time        [$-F400]h:mm:ss am/pm
     * Percentage  0.00%
     * Fraction    # ?/?
     * Scientific  0.00E+00
     * Text        @
     * Special     ;;
     * Custom      #,##0_);[Red](#,##0)
     */
    setColumnsFormats(worksheet, shouldShowColumn, currency) {
      function formatText(cell, row) {
        if(row > 1) cell.numFmt = '@';
      }

      function formatDate(cell, row) {
        if(row > 1) cell.numFmt = 'yyyy-mm-dd';
      }

      function formatPercent(cell, row) {
        if(row > 1) cell.numFmt = '0.00%';
      }

      function getCurrencySignFromClientCountryCurrencyCode(currencyCode) {
        let currencySign = '';
        switch(currencyCode){
        case 'GBP':
          currencySign = '£';
          break;
        case 'USD':
          currencySign = '$';
          break;
        case 'EUR':
          currencySign = '€';
          break;
        case 'AUD':
          currencySign = '$';
          break;
        case 'CAD':
          currencySign = '$';
          break;
        case 'HKD':
          currencySign = 'HK$';
          break;
        case 'SGD':
          currencySign = '$';
          break;
        case 'NZD':
          currencySign = '$';
          break;
        case 'RUB':
          currencySign = '₽';
          break;
        default:
          currencySign = '';
          break;
        }
        return currencySign;
      }

      function getClientCountryNumberFormat(cell, row) {
        // Gets the clientCountryCurrencyCode from the hidden column
        let code = worksheet.getRow(row).getCell(worksheet.getColumn('clientCountryCurrencyCode')._number).value;
        return `"${getCurrencySignFromClientCountryCurrencyCode(code)}"#,##0.00;[Red]"${getCurrencySignFromClientCountryCurrencyCode(code)}"-#,##0.00`;
      }

      function formatCurrency(cell, row) {
        if(row <= 1) return; //Ignores header
        switch(currency){
        case 'GBP':
          cell.numFmt = '£#,##0.00;[Red]£-#,##0.00';
          break;
        case 'USD':
          cell.numFmt = '$#,##0.00;[Red]$-#,##0.00';
          break;
        case 'EUR':
          cell.numFmt = '€#,##0.00;[Red]€-#,##0.00';
          break;
        case 'ClientCountryCurrency':
          cell.numFmt = getClientCountryNumberFormat(cell, row);
          break;
        default:
          cell.numFmt = '#,##0.00;[Red]-#,##0.00';
        }
      }

      function formatValidity (cell, row) {
        if(row > 1) cell.value = cell.value == '' ? '' : cell.value > 365? 'EXISTENT': 'NEW';
      }

      function formatEachCell (columnName, format) {

        try{

          let col = worksheet.getColumn(columnName);

          if(col){
            col.eachCell(format);
          }
        } catch (e) {
          // Do nothing
          // Means that particular collumn is not present in the spreadsheet
        }
      }

      if (shouldShowColumn.eventDateTerm) formatEachCell('eventDateTerm',formatDate);
      if (shouldShowColumn.clientCountry) formatEachCell('clientCountry',formatText);
      if (shouldShowColumn.clientResponsibleName) formatEachCell('clientResponsibleName',formatText);
      if (shouldShowColumn.campaignCountryName) formatEachCell('campaignCountryName',formatText);
      if (shouldShowColumn.campaignName) formatEachCell('campaignName',formatText);
      if (shouldShowColumn.campaignVersionName) formatEachCell('campaignVersionName',formatText);
      if (shouldShowColumn.campaignVersionAlias) formatEachCell('campaignVersionAlias',formatText);
      if (shouldShowColumn.utmCampaign) formatEachCell('utmCampaign',formatText);
      if (shouldShowColumn.clientLaunchDiffDays) formatEachCell('clientLaunchDiffDays',formatValidity);
      formatEachCell('clientName',formatText);
      formatEachCell('shareRate',formatPercent);
      formatEachCell('conversionRate',formatPercent);
      formatEachCell('aov',formatCurrency);
      formatEachCell('roi',formatPercent);

      formatEachCell('declinedSalesCommission',formatCurrency);





      if (currency === 'OriginalValue') {
        formatEachCell('totalValueSales',formatCurrency);
        formatEachCell('salesCommission',formatCurrency);
        formatEachCell(`paidSalesCommission`,formatCurrency);
        formatEachCell(`pendingSalesCommission`,formatCurrency);
        formatEachCell(`declinedSalesCommission`,formatCurrency);
      } else {
        formatEachCell(`totalValueSales_${currency}`,formatCurrency);
        formatEachCell(`salesCommission_${currency}`,formatCurrency);
        formatEachCell(`paidSalesCommission_${currency}`,formatCurrency);
        formatEachCell(`pendingSalesCommission_${currency}`,formatCurrency);
        formatEachCell(`declinedSalesCommission_${currency}`,formatCurrency);

      }
      //repeted option selected
      formatEachCell(currency === 'OriginalValue' ? `salesCommission_Repeated` : `salesCommission_Repeated_${currency}`,formatCurrency);
      formatEachCell(currency === 'OriginalValue' ? `salesCommission_New` : `salesCommission_New_${currency}`,formatCurrency);
      formatEachCell(currency === 'OriginalValue' ? `totalValueSales_New` : `totalValueSales_New_${currency}`,formatCurrency);
      formatEachCell(currency === 'OriginalValue' ? `totalValueSales_Repeated` : `totalValueSales_Repeated_${currency}`,formatCurrency);
      formatEachCell('countSoretoSales_Repeated_Proportion',formatPercent);
      formatEachCell('countSoretoSales_New_Proportion',formatPercent);
    },

    setStyle(worksheet) {

      //set header as bold
      worksheet.getRow(1).style =  { font: { bold: true } };

      //set totals row background color as grey
      worksheet.lastRow.fill  = {
        type: 'pattern',
        pattern:'lightGray',
        fgColor:{argb:'e6e6e6'},
        bgColor:{argb:'e6e6e6'}
      };

      //set totals row borders
      worksheet.lastRow.border = {
        top: {style:'thin'},
        left: {style:'thin'},
        bottom: {style:'thin'},
        right: {style:'thin'}
      };

    },

    getCurrencySign(currencyCode) {
      let currencySign = '';
      switch(currencyCode){
      case 'GBP':
        currencySign = '£';
        break;
      case 'USD':
        currencySign = '$';
        break;
      case 'EUR':
        currencySign = '€';
        break;
      case 'ClientCountryCurrency':
      case 'OriginalValue':
      default:
        currencySign = '';
        break;
      }
      return currencySign;
    },

    createFileName(offset, limit, isClientSummary) {
      let date_yyyy_mm_dd = new Date().toISOString().split('T')[0].replace(new RegExp('-', 'g'), '_');
      let pageNumber = (offset / limit) + 1;
      return `live_stats_${isClientSummary ? 'summary_' : ''}${date_yyyy_mm_dd}_pg${pageNumber}.xlsx`;
    }
  },

  /**
   * MONGO
   */
  mongo : {

  },

  /**
   * DYNAMO
   */
  dynamo : {
    userAccess : {
      async getItems (params) {
        return await userAccess.getItems(params);
      }
    }
  }
};


