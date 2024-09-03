var express = require('express');
var router = express.Router();
var reportsService = require('../../services/reports');
var authService = require('../../services/auth');
var logger = require('../../common/winstonLogging');
var commissionsByMonthQueryComposer = require('../../reports/elasticSearch/composers/commissionsByMonthQueryComposer.js');
var commissionsByMonthXLSXExporter = require('../../reports/elasticSearch/XLSXExporters/commissionsByMonthXLSXExporter.js');
var auditOriginDomainsComposer = require('../../reports/elasticSearch/composers/auditOriginDomainsComposer');
var auditOriginUrlsComposer = require('../../reports/elasticSearch/composers/auditOriginUrlsComposer');
var utmCampaignsComposer = require('../../reports/elasticSearch/composers/utmCampaignsComposer');
var performanceByMonthComposer = require('../../reports/elasticSearch/composers/performanceByMonthComposer.js');
var statsComposer = require('../../reports/elasticSearch/composers/statsComposer');
var clientStatsComposer = require('../../reports/elasticSearch/composers/statsOrderComposer');
var clientOrderSummaryStatsComposer = require('../../reports/elasticSearch/composers/statsClientOrderSummaryComposer.js');
const ExcelJS = require('exceljs');
const axios = require('axios');
const config = require('../../config/config.js');
const responseHandler = require('../../common/responseHandler');
const moment = require('moment');
const _ = require('lodash');

/*
 |--------------------------------------------------------------------------
 | Reports API endpoint
 |--------------------------------------------------------------------------
 */

router.get('/reports/liveClients', authService.isAuthenticated, authService.isAuthorized, function (req, res) {

  const query = req.query;

  reportsService.postgres.getLiveClients({}, query, function(err, liveClients){
    if(err){
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }
    return res.status(200).json(liveClients);
  });
});

router.get('/reports/liveRewards', authService.isAuthenticated, authService.isAuthorized, function (req, res) {

  const query = req.query;

  reportsService.postgres.getRemainingDiscountCodesByClient({},query)
    .then((rewardDiscountCodeList)=>{
      return res.status(200).json(rewardDiscountCodeList);
    })
    .catch((err)=>{
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    });
});

router.get('/reports/liveRewardsBasic', authService.isAuthenticated, authService.isAuthorized, function (req, res) {

  const query = req.query;

  reportsService.postgres.getRemainingDiscountCodesByClientBasic({},query,
    function(err, liveClients){
      if(err){
        logger.error(err);
        return res.status(err.statusCode).json({
          code: err.code,
          message: err.message,
          data: {}
        });
      }
      return res.status(200).json(liveClients);
    }
  );
});

router.get(
  '/reports/auditOriginDomains',
  authService.isAuthenticated,
  authService.isAuthorized,
  async function (req, res) {
    const {internalId, externalId,startDate, endDate} = req.query;

    let auditDomains = await auditOriginDomainsComposer.getData(internalId,externalId, startDate, endDate);

    res.json(auditDomains);
  }
);

router.get(
  '/reports/auditOriginUrls',
  authService.isAuthenticated,
  authService.isAuthorized,
  async function (req, res) {
    const {internalId, externalId, first, rows, startDate, endDate} = req.query;

    let auditUrls = await auditOriginUrlsComposer.getData(internalId,externalId,first, rows, startDate, endDate);

    res.json(auditUrls);
  }
);

/**
 * BI set of endpoints
 */
router.get('/reports/bi/stats', authService.isAuthenticated, authService.isAuthorized, function (req, res) {

  const query = req.query;
  let groupLevels = [];
  let filters = [];
  let extraFields = [];
  let exceptions = [];

  if(query.showCampaignLevel === 'true'){
    groupLevels.push('campaignName');
  }

  if(query.showCampaignVersionLevel === 'true'){
    groupLevels.push('campaignVersionName');
  }

  if(query.showCampaignVersionAliasLevel === 'true'){
    groupLevels.push('campaignVersionAlias');
  }

  if(query.showCampaignCountryLevel === 'true'){
    groupLevels.push('campaignCountryName');
  }

  if(query.socialPostSocialPlatform === 'true') {
    groupLevels.push('socialPostSocialPlatform');
    exceptions.push('clientSales');
    exceptions.push('shareRate');
  }

  if(query.campaignVersionSourceTagGroup === 'true') {
    groupLevels.push('campaignVersionSourceTagGroup');
  }

  if(query.showResponsible === 'true'){
    extraFields.push('clientResponsibleName');
  }

  if(query.showNewRepeatComparison === 'true'){
    extraFields.push('soretoSalesRepeated');
  }

  if(query.showClientLaunchDiffDays){
    extraFields.push('clientLaunchDiffDays');
  }

  if(query.showClientIndustry === 'true'){
    groupLevels.push('clientIndustry');
  }

  if(query.deviceGroupPerspective == 'sharer'){

    if(query.showDeviceType === 'true'){
      groupLevels.push('sharePlaceDeviceType');
      extraFields.push('sharePlaceDeviceType');
    }

    if(query.showDeviceOS === 'true'){
      groupLevels.push('sharePlaceDeviceOS');
      extraFields.push('sharePlaceDeviceOS');
    }

    if(query.showDeviceBrowser === 'true'){
      groupLevels.push('sharePlaceDeviceBrowser');
      extraFields.push('sharePlaceDeviceBrowser');
    }
  }else if(query.deviceGroupPerspective == 'friend'){

    if(query.showDeviceType === 'true'){
      groupLevels.push('deviceType');
      extraFields.push('deviceType');
    }

    if(query.showDeviceOS === 'true'){
      groupLevels.push('deviceOS');
      extraFields.push('deviceOS');
    }

    if(query.showDeviceBrowser === 'true'){
      groupLevels.push('deviceBrowser');
      extraFields.push('deviceBrowser');
    }
  }

  if (query.dateGrouping === 'monthly') {
    groupLevels.push('monthly');
  }

  if(query.dateGrouping === 'daily'){
    groupLevels.push('eventDateTerm');
  }

  if(query.showUtmCampaign === 'true'){
    groupLevels.push('utmCampaign.keyword');
  }

  if(query.productGrouping === 'true'){
    groupLevels.push('campaignType');
  }

  if(query.showAffiliateName === 'true'){
    groupLevels.push('clientHolderName');
    extraFields.push('clientHolderName');
  }

  if(query.showCampaignRegionCountryName === 'true'){
    groupLevels.push('campaignRegionCountryName');
    extraFields.push('campaignRegionCountryName');
  }

  if(query.product){
    filters.push({ campaignType : query.product });
  }

  if(query.showActiveClients){
    filters.push({ clientActive : (query.showActiveClients === 'true') ? true: false });
  }

  if(query.campaignRegionCountryNames){

    filters.push({ campaignRegionCountryName : query.campaignRegionCountryNames });
  }

  if(query.deviceTypeFilter && query.deviceTypeFilter.length > 0){
    if(query.deviceGroupPerspective == 'sharer'){
      filters.push({ sharePlaceDeviceType: query.deviceTypeFilter });
    }else {
      filters.push({ deviceType: query.deviceTypeFilter });
    }
  }

  if(query.$search){
    filters.push({ clientName : query.$search });

    for(let group of groupLevels){

      if(group != 'eventDateTerm'){
        filters.push({ [group] : query.$search });
      }
    }
  }

  if(query.$countSoretoSales_$gt){
    filters.push({ soretoSales_$gt : query.$countSoretoSales_$gt });
  }

  if(query.$clicks_$gt){
    filters.push({ refClicks_$gt : query.$clicks_$gt });
  }

  if(query.$shares_$gt){
    filters.push({ shares_$gt : query.$shares_$gt });
  }

  if(query.$daysDiffFromClientLaunch_$lte){
    filters.push({ daysDiffFromClientLaunch_$lte : query.$daysDiffFromClientLaunch_$lte });
  }

  if(query.$clientLaunchDiffDays_$gte != undefined){
    filters.push({ clientLaunchDiffDays_$gte : query.$clientLaunchDiffDays_$gte });
  }

  if(query.$clientLaunchDiffDays_$lte){
    filters.push({ clientLaunchDiffDays_$lte : query.$clientLaunchDiffDays_$lte });
  }

  if(query.affiliateId){
    filters.push({ clientHolderId : query.affiliateId });
  }

  if(query.responsibleId){
    filters.push({ clientResponsibleId : query.responsibleId });
  }

  if(query.clientCountryId){
    filters.push({ clientCountryId : query.clientCountryId });
  }

  if(query.clientCountryExceptId){
    filters.push({ clientCountryId_EXCEPT : query.clientCountryExceptId });
  }

  if(query.campaingCountryId){
    filters.push({ campaignCountryId : query.campaingCountryId });
  }

  if(query.campaignCountryExceptId){
    filters.push({ campaignCountryId_EXCEPT : query.campaignCountryExceptId });
  }

  if(query.utmSearch){
    filters.push({'utmCampaign.keyword' : query.utmSearch });
  }

  if(req.clientId){
    filters.push({ clientId : req.clientId });
  }

  if(query.clientIds){
    filters.push({ clientId : query.clientIds });
  }

  if(!query.apiVersion){
    // set default API version
    query.apiVersion = 1;
  }

  const customParams = {};

  for(const key in query){
    if(key.startsWith('cp_')){
      customParams[key.replace('cp_', '')] = query[key];
    }
  }

  reportsService.elasticsearch
    .getLiveStats(groupLevels,
      query.$sort,
      query.$date_$gte,
      query.$date_$lte,
      query.$offset,
      query.$limit,
      filters,
      extraFields,
      query.apiVersion,
      query.showInactiveDays,
      exceptions,
      customParams)
    .then((result)=>{


      if (query.format === 'XLSX') {

        //Set headers for the browser to prompt download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=' + reportsService.xlsx.createFileName(query.$offset, query.$limit, query.isClientSummary));

        let workbook = new ExcelJS.Workbook();

        const clientSales = query.socialPostSocialPlatform ? false : true;

        // Defines which table columns should be shown
        let shouldShowColumn = {
          eventDateTerm: query.dateGrouping === 'monthly' || query.dateGrouping === 'daily',
          utmCampaign: query.showUtmCampaign === 'true',
          campaignName: query.showCampaignLevel === 'true',
          campaignVersionName: query.showCampaignVersionLevel === 'true',
          campaignVersionAlias: query.showCampaignVersionAliasLevel === 'true',
          campaignCountryName: query.showCampaignCountryLevel === 'true',
          clientResponsibleName: query.showResponsible === 'true',
          clientCountry: query.showCountry === 'true',
          showRepeated: query.showNewRepeatComparison === 'true',
          clientSales,
          socialPostSocialPlatform: query.socialPostSocialPlatform === 'true',
          showDeviceBrowser: query.showDeviceBrowser === 'true',
          showDeviceOS: query.showDeviceOS === 'true',
          showDeviceType: query.showDeviceType === 'true',
          deviceGroupPerspective : query.deviceGroupPerspective,
          showDeviceRate: query.showDeviceRate === 'true',
          campaignVersionSourceTagGroup: query.campaignVersionSourceTagGroup === 'true',
          clientLaunchDiffDays: query.showClientLaunchDiffDays === 'true',
          clientIndustry: query.showClientIndustry === 'true'
        };

        if (query.isClientSummary){
          workbook = reportsService.xlsx.populateWorkbookFromLiveStatsSummaryPage(workbook, result.data, shouldShowColumn, query.currency );
        }else{
          workbook = reportsService.xlsx.populateWorkbookFromLiveStats(workbook, result.data, shouldShowColumn, query.currency);
        }
        return workbook.xlsx.write(res).then(function () {
          res.status(200).end();
        });

      }

      return res.status(200).json(result);

    })
    .catch((err)=>{
      logger.error(err);
      return res.status(err.statusCode || 500).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    });
});

router.get('/reports/bi/statsByChannel', authService.isAuthenticated, authService.isAuthorized, function (req, res) {

  const query = req.query;
  let groupLevels = [];
  let filters = [];

  // this group level may not work in this search
  // let it here for future improvements
  if(query.showCampaignLevel === 'true'){
    groupLevels.push('campaignName');
  }

  // this group level may not work in this search
  // let it here for future improvements
  if(query.showCampaignVersionLevel === 'true'){
    groupLevels.push('campaignVersionName');
  }

  if(query.daily === 'true'){
    groupLevels.push('eventDateTerm');
  }

  if(query.showActiveClients){
    filters.push({ clientActive : (query.showActiveClients === 'true') ? true: false });
  }

  if(query.affiliateId){
    filters.push({ clientHolderId : query.affiliateId });
  }

  if(req.clientId){
    filters.push({ clientId : req.clientId });
  }

  if(!query.apiVersion){
    // set default API version
    query.apiVersion = 1;
  }

  reportsService.elasticsearch
    .getLiveStatsByChannel(query.$date_$gte, query.$date_$lte, filters, query.apiVersion)
    .then((result)=>{
      return res.status(200).json(result);
    })
    .catch((err)=>{
      logger.error(err);
      return res.status(err.statusCode || 500).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    });
});

router.get('/reports/bi/commissionsByMonth', authService.isAuthenticated, authService.isAuthorized, async function (req, res) {
  let clientIds = req.query.$clientIds;
  let dateLte = req.query.$date_$lte;
  let dateGte = req.query.$date_$gte;
  let showActiveClients = req.query.showActiveClients;
  let clientTier = req.query.clientTier;
  let feeBased = req.query.feeBased;
  let sortField = req.query.$sort;
  let format = req.query.format;
  let currency = req.query.currency;

  let commissionsByMonth =
    await commissionsByMonthQueryComposer.getCommissionsByMonth(dateLte, dateGte, showActiveClients, clientIds, sortField, clientTier, feeBased);

  if (format === 'XLSX') {

    //Set headers for the browser to prompt download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=' + commissionsByMonthXLSXExporter.createFileName(dateLte, dateGte));

    let workbook = new ExcelJS.Workbook();
    workbook = await commissionsByMonthXLSXExporter.populateWorkbookFromCommissionsByMonth(workbook, commissionsByMonth, currency);
    await workbook.xlsx.write(res);
    res.status(200).end();

  } else {
    res.json(commissionsByMonth);
  }

});

router.get('/reports/v2/bi/stats', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  let { $date_$gte: startDate, $date_$lte:endDate, campaignRegionCountryNames, sectorNames, networkNames, clientLaunch, responsibleIds, fixedFeeValues, groupBy, groupFields, campaignVersionIds } = req.query;

  try {
    let result = await statsComposer.getData(startDate, endDate, campaignRegionCountryNames, sectorNames, networkNames, clientLaunch, responsibleIds, fixedFeeValues, groupBy, groupFields, campaignVersionIds);

    return responseHandler.result(res, result);
  } catch (error) {
    return responseHandler.errorComposer(res, error);
  }
});

router.get('/reports/v2/bi/clientStats', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  let { $date_$gte: startDate, $date_$lte:endDate, campaignRegionCountryNames } = req.query;

  try {
    let result = await clientStatsComposer.getData(startDate, endDate, campaignRegionCountryNames);

    return responseHandler.result(res, result);
  } catch (error) {
    return responseHandler.errorComposer(res, error);
  }
});

router.get('/reports/v2/bi/clientOrderSummary', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  let { $date_$gte: startDate, $date_$lte:endDate } = req.query;

  try {
    let result = await clientOrderSummaryStatsComposer.getData(startDate, endDate, true);

    return responseHandler.result(res, result);
  } catch (error) {
    return responseHandler.errorComposer(res, error);
  }
});

/**
 * Get live integration
 */
router.get('/reports/liveintegration', authService.isAuthenticated, authService.isAuthorized, function (req, res) {

  const query = req.query;

  reportsService.elasticsearch.genericSearch(query.$date_$gte, query.$date_$lte, query.indexPattern, query.freeString, query.query, query.$sort, query.$offset, query.$limit)
    .then((rewardDiscountCodeList)=>{
      return res.status(200).json(rewardDiscountCodeList);
    })
    .catch((err)=>{
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    });
});

router.get('/reports/tracking', authService.isAuthenticated, authService.isAuthorized, async function (req, res) {
  try {
    let url = req.url.replace('/reports/tracking', config.BI.TRACKING.URL);

    let urlConfig = {
      headers: {
        AuthorizationToken: config.BI.TRACKING.AUTHORIZATION_TOKEN,
      }
    };

    let userTrackingFlow = await axios.get(url, urlConfig);

    return res.json(userTrackingFlow.data);
  }catch(err){
    logger.error(err);

    let statusCode = isNaN(err.statusCode) ? 500 : err.statusCode;

    return res.status(statusCode).json({
      code: err.code,
      message: err.message,
      data: {}
    });
  }
});

router.get('/reports/utmCampaign', authService.isAuthenticated, authService.isAuthorized, async function (req, res) {
  try {
    let results = await utmCampaignsComposer.getData();
    res.json(results);
  }catch(err){
    logger.error(err);

    let statusCode = isNaN(err.statusCode) ? 500 : err.statusCode;

    return res.status(statusCode).json({
      code: err.code,
      message: err.message,
      data: {}
    });
  }

});

router.get('/reports/breakage', authService.isAuthenticated, authService.isAuthorized, async function (req, res) {
  const query = req.query;

  try {
    if (moment(query.$date_$lte) < moment(query.$date_$gte)){
      responseHandler.errorComposer(res,
        'Date fields',
        responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST,
        'date_range_conflict',
        `End date must be greater than the Start date`);
      return;
    }

    let results = await reportsService.postgres.getBreakage({}, query.$date_$gte, query.$date_$lte, query.clientIds);

    if (results) {
      responseHandler.result(res, results);
    } else {
      responseHandler.resultNotFound(res);
    }

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }

});

router.get('/reports/bi/performanceByMonth', authService.isAuthenticated, authService.isAuthorized, async function (req, res) {
  let dateLte = req.query.$date_$lte;
  let dateGte = req.query.$date_$gte;
  let campaignType = req.query.$campaignType;
  let campaignRegionCountryNames = req.query.campaignRegionCountryNames;
  let sortField = '';

  let performanceByMonth =
    await performanceByMonthComposer.getPerformanceByMonth(dateLte, dateGte, campaignType, campaignRegionCountryNames, sortField);

  res.json(performanceByMonth);
});

router.get('/reports/tracking/usersAccess', authService.isAuthenticated, authService.isAuthorized, async function (req, res) {
  const params = {
    email: req.query.$email,
    client: req.query.$client_id,
    role: req.query.$role,
    startDate: req.query.$start_date,
    endDate: req.query.$end_date,
  };

  try {
    var results = await reportsService.dynamo.userAccess.getItems(params);

    if(results && !_.isEmpty(results.Items)) {
      responseHandler.result(res, results);
    } else {
      responseHandler.resultNotFound(res);
    }

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }
});

module.exports = router;
