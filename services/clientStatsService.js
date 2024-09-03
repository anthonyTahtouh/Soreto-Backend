
const innerGroupFilter = (row, r) => {
  if(typeof row.socialPostSocialPlatform === 'string'){
    if(row.socialPostSocialPlatform == r.socialPostSocialPlatform){
      if(typeof row.eventDateTerm === 'string'){
        if(row.eventDateTerm == r.eventDateTerm){
          return true;
        }else {
          return false;
        }
      }else {
        return true;
      }
    }else {
      return false;
    }
  }else if(typeof row.campaignVersionSourceTagGroup === 'string'){
    if(row.campaignVersionSourceTagGroup == r.campaignVersionSourceTagGroup){
      if(typeof row.eventDateTerm === 'string'){
        if(row.eventDateTerm == r.eventDateTerm){
          return true;
        }else {
          return false;
        }
      }else {
        return true;
      }
    }else {
      return false;
    }
  }else if(typeof row.campaignVersionAlias === 'string'){
    if(row.campaignVersionAlias == r.campaignVersionAlias){
      if(typeof row.eventDateTerm === 'string'){
        if(row.eventDateTerm == r.eventDateTerm){
          return true;
        }else {
          return false;
        }
      }else {
        return true;
      }
    }else {
      return false;
    }
  }else if(typeof row.eventDateTerm === 'string'){
    if(row.eventDateTerm == r.eventDateTerm){
      return true;
    }else {
      return false;
    }
  }else{
    return true;
  }
};

const totalPropAmountPerGroup = (page, row, prop) => {
  return (page.filter((r) => {

    if(row.campaignVersionName){
      if((row.campaignVersionName == r.campaignVersionName)
        && (row.campaignName == r.campaignName)
        && (row.clientName == r.clientName)){
        return innerGroupFilter(row, r);
      }
    }else if(row.campaignName){

      if(row.campaignName == r.campaignName && row.clientName == r.clientName){
        return innerGroupFilter(row, r);
      }
    }else if(row.campaignCountryName){

      if(row.campaignCountryName == r.campaignCountryName && row.clientName == r.clientName){
        return innerGroupFilter(row, r);
      }
    }
    else if(row.clientName){

      if(row.clientName == r.clientName){
        return innerGroupFilter(row, r);
      }
    }
  }).reduce((acc, crr) => {return acc + crr[prop]; }, 0));
};

class ClientStatsService  {

  parseLiveStats(parsedLiveStats, currency) {

    var totals = {
      clientSales: 0,
      offerClicks: 0,
      soretoTraffic: 0,
      countSoretoSales: 0,
      totalValueSales: 0,
      totalValueSoretoSales: 0,
      totalValueRawCommission: 0,
      totalValueSoretoCommission_USD: 0,
      totalValueSoretoCommission_CLI_CURRENCY: 0,
      totalValueSoretoCommission: 0,
      countSoretoSales_New: 0,
      totalValueSales_New: 0,
      salesCommission_New: 0,
      countSoretoSales_Repeated: 0,
      totalValueSales_Repeated: 0,
      salesCommission_Repeated: 0,
      countSoretoSales_New_Proportion: 0,
      countSoretoSales_Repeated_Proportion: 0,
      clicks: 0,
      shares: 0,
      shareRate: 0,
      reachMultiple: 0,
      interstitialRate: 0,
      conversionRate: 0,
      aov: 0,
      roi: 0,
      countSoretoSalesPending: 0,
      countSoretoSalesPaid:0,
      countSoretoSalesDeclined:0,
      totalValueSoretoSalesPending:0,
      totalValueSoretoSalesPaid:0,
      totalValueSoretoSalesDeclined:0,
      totalValueSoretoCommissionPending:0,
      totalValueSoretoCommissionPaid:0,
      totalValueSoretoCommissionDeclined:0,
    };

    for(let row of parsedLiveStats) {

      totals.clientSales += +row.clientSales;
      totals.soretoTraffic += +row.interstitialClicks;

      let totalValueSales;
      let commission;

      if (currency === 'OriginalValue'){
        totalValueSales = row[`totalValueSales`];
        commission = row[`salesCommission`];
      }else{
        totalValueSales = row[`totalValueSales_${currency}`];
        commission = row[`salesCommission_${currency}`];
      }

      row.aov = row.soretoSales ? totalValueSales / row.soretoSales : 0;

      row.roi = commission ? (((totalValueSales - commission)/commission)) : 0;


      // SALES COUNT
      totals.countSoretoSales += +parseFloat(row.soretoSales);
      totals.countSoretoSalesPending += +Number(row.pendingSalesCount);
      totals.countSoretoSalesPaid += +parseFloat(row.paidSalesCount);
      totals.countSoretoSalesDeclined += +parseFloat(row.declinedSalesCount);

      // SALES TOTALS SUM
      totals.totalValueSoretoSales += +parseFloat(row.totalValueSales);
      totals.totalValueSoretoSalesPending += +parseFloat(row.totalValueSalesPending);
      totals.totalValueSoretoSalesPaid += +parseFloat(row.totalValueSalesPaid);
      totals.totalValueSoretoSalesDeclined += +parseFloat(row.totalValueSalesDeclined);

      if (currency === 'OriginalValue') {
        totals.totalValueSales += +parseFloat(row[`totalValueSales`]);
        totals.totalValueSoretoCommission += +parseFloat(row[`salesCommission`]);
        totals.totalValueSoretoCommissionPending += +parseFloat(row[`pendingSalesCommission`]);
        totals.totalValueSoretoCommissionPaid += +parseFloat(row[`paidSalesCommission`]);
        totals.totalValueSoretoCommissionDeclined += +parseFloat(row[`declinedSalesCommission`]);
      } else {
        totals.totalValueSales += +parseFloat(row[`totalValueSales_${currency}`]);
        totals.totalValueSoretoCommission += +parseFloat(row[`salesCommission_${currency}`]);
        totals.totalValueSoretoCommissionPending += +parseFloat(row[`pendingSalesCommission_${currency}`]);
        totals.totalValueSoretoCommissionPaid += +parseFloat(row[`paidSalesCommission_${currency}`]);
        totals.totalValueSoretoCommissionDeclined += +parseFloat(row[`declinedSalesCommission_${currency}`]);
      }

      // CLICKS
      totals.clicks += Number(row.refClicks).valueOf();
      totals.shares += +row.shares.valueOf();

      //Total Repeated
      let repeated =  row.soretoSalesRepeated;
      let new_totaValueSales = 0;
      let new_salesCommission = 0;
      let repeated_totaValueSales = 0;
      let repeated_salesCommission = 0;

      if(repeated){
        totals.countSoretoSales_New += +repeated.new_soretoSales;

        if (currency === 'OriginalValue'){
          new_totaValueSales = repeated[`new_totalValueSales`] || 0;
          repeated_totaValueSales = repeated[`repeated_totalValueSales`] || 0;
          new_salesCommission = repeated[`new_salesCommission`] || 0;
          repeated_salesCommission = repeated[`repeated_salesCommission`] || 0;
        }else{
          new_totaValueSales = repeated[`new_totalValueSales_${currency}`] || 0;
          repeated_totaValueSales = repeated[`repeated_totalValueSales_${currency}`] || 0;
          new_salesCommission = repeated[`new_salesCommission_${currency}`] || 0;
          repeated_salesCommission = repeated[`repeated_salesCommission_${currency}`] || 0;
        }

        totals.totalValueSales_New += +parseFloat(new_totaValueSales);
        totals.totalValueSales_Repeated += +parseFloat(repeated_totaValueSales);
        totals.salesCommission_New += +parseFloat(new_salesCommission);
        totals.salesCommission_Repeated += +parseFloat(repeated_salesCommission);

        totals.countSoretoSales_Repeated += +parseFloat(repeated.repeated_soretoSales);

        let newOrderProportion = 0;
        let repeatedOrderProportion = 0;

        row.countSoretoSales_New = repeated.new_soretoSales;
        row.countSoretoSales_Repeated = repeated.repeated_soretoSales;

        newOrderProportion = row.soretoSales ? (( repeated.new_soretoSales / row.soretoSales )) : 0;
        repeatedOrderProportion = row.soretoSales ? (( repeated.repeated_soretoSales / row.soretoSales )) : 0;

        row.countSoretoSales_New_Proportion = newOrderProportion;

        row.countSoretoSales_Repeated_Proportion = repeatedOrderProportion;
      }

      // default values
      row.countSoretoSales_New = row.countSoretoSales_New ? row.countSoretoSales_New : 0;
      row.countSoretoSales_Repeated = row.countSoretoSales_Repeated ? row.countSoretoSales_Repeated : 0;
      row.countSoretoSales_New_Proportion = row.countSoretoSales_New_Proportion ? row.countSoretoSales_New_Proportion : 0;
      row.countSoretoSales_Repeated_Proportion = row.countSoretoSales_Repeated_Proportion ? row.countSoretoSales_Repeated_Proportion : 0;


      if (currency === 'OriginalValue'){

        row[`totalValueSales_New`] = new_totaValueSales;
        row[`totalValueSales_Repeated`] = repeated_totaValueSales;
        row[`salesCommission_New`] = new_salesCommission;
        row[`salesCommission_Repeated`] = repeated_salesCommission;
      }else{
        row[`totalValueSales_New_${currency}`] = new_totaValueSales;
        row[`totalValueSales_Repeated_${currency}`] = repeated_totaValueSales;
        row[`salesCommission_New_${currency}`] = new_salesCommission;
        row[`salesCommission_Repeated_${currency}`] = repeated_salesCommission;
      }

      // Format row values
      row.refClicks = Number(row.refClicks).valueOf();
      row.reachMultiple = new Number(row.reachMultiple.toFixed(1)).valueOf();
      row.conversionRate = new Number((row.conversionRate/100).toFixed(4)).valueOf();
      row.shareRate = new Number((row.shareRate/100).toFixed(4)).valueOf();
      if (currency === 'OriginalValue') {
        row[`totalValueSales`] = new Number(row[`totalValueSales`].toFixed(2)).valueOf();
        row[`salesCommission`] = new Number(row[`salesCommission`].toFixed(2)).valueOf();
        row[`pendingSalesCommission`] = new Number(row[`pendingSalesCommission`].toFixed(2)).valueOf();
        row[`paidSalesCommission`] = new Number(row[`paidSalesCommission`].toFixed(2)).valueOf();
        row[`declinedSalesCommission`] = new Number(row[`declinedSalesCommission`].toFixed(2)).valueOf();
      } else {
        row[`totalValueSales_${currency}`] = new Number(row[`totalValueSales_${currency}`].toFixed(2)).valueOf();
        row[`salesCommission_${currency}`] = new Number(row[`salesCommission_${currency}`].toFixed(2)).valueOf();
        row[`pendingSalesCommission_${currency}`] = new Number(row[`pendingSalesCommission_${currency}`].toFixed(2)).valueOf();
        row[`paidSalesCommission_${currency}`] = new Number(row[`paidSalesCommission_${currency}`].toFixed(2)).valueOf();
        row[`declinedSalesCommission_${currency}`] = new Number(row[`declinedSalesCommission_${currency}`].toFixed(2)).valueOf();
      }

      var clientSalesTotalGroup = totalPropAmountPerGroup(parsedLiveStats, row, 'clientSales');
      var sharesTotalGroup = totalPropAmountPerGroup(parsedLiveStats, row, 'shares');
      var interstitialClicksTotalGroup = totalPropAmountPerGroup(parsedLiveStats, row, 'interstitialClicks');
      row.deviceRateLightboxViews = `${(clientSalesTotalGroup == 0) ? '-' : ((row.clientSales / clientSalesTotalGroup)*100).toFixed(2)+ '%'}`;
      row.deviceRateShares = `${(sharesTotalGroup == 0) ? '-' : ((row.shares / sharesTotalGroup)*100).toFixed(2)+ '%'}`;
      row.deviceRateInterstitialClick = `${(interstitialClicksTotalGroup == 0) ? '-' : ((row.interstitialClicks / interstitialClicksTotalGroup)*100).toFixed(2)+ '%'}`;
    }

    /**
    * FORMAT TOTALS
    */
    totals.conversionRate = new Number((+totals.clicks > 0 ? (+totals.countSoretoSales / +totals.clicks) : 0).toFixed(4)).valueOf();
    totals.shareRate = new Number((+totals.clientSales > 0 ? (+totals.shares / +totals.clientSales) : 0).toFixed(4)).valueOf();
    totals.reachMultiple = new Number((+totals.shares > 0 ? (+totals.clicks / +totals.shares) : 0).toFixed(1)).valueOf();
    totals.totalValueSales = new Number(totals.totalValueSales.toFixed(2)).valueOf();
    totals.totalValueSoretoCommission = new Number(totals.totalValueSoretoCommission.toFixed(2)).valueOf();
    totals.totalValueSoretoCommissionPending = new Number(totals.totalValueSoretoCommissionPending.toFixed(2)).valueOf();
    totals.totalValueSoretoCommissionPaid = new Number(totals.totalValueSoretoCommissionPaid.toFixed(2)).valueOf();
    totals.totalValueSoretoCommissionDeclined = new Number(totals.totalValueSoretoCommissionDeclined.toFixed(2)).valueOf();

    totals.roi = totals.totalValueSoretoCommission ?
      ((totals.totalValueSales - totals.totalValueSoretoCommission)/ totals.totalValueSoretoCommission) : 0;

    totals.aov = (totals.countSoretoSales ? totals.totalValueSales/totals.countSoretoSales : 0);

    totals.countSoretoSales_New_Proportion = totals.countSoretoSales ? ((totals.countSoretoSales_New / totals.countSoretoSales)) : 0;
    totals.countSoretoSales_Repeated_Proportion = totals.countSoretoSales ? ((totals.countSoretoSales_Repeated / totals.countSoretoSales)) : 0;

    return { totals, parsedLiveStats };
  }
}

const clientStatsService = new ClientStatsService();

module.exports = clientStatsService;