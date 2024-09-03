const { Crawler } = require('es6-crawler-detect');
var crawlerDetector = new Crawler;

var campaignService = require('../services/campaign');
var campaignVersionService = require('../services/campaignVersion');

var sharedUrlHelper = {
  isBrowserClick: function(userAgent){
    if(crawlerDetector.isCrawler(userAgent)){
      return false;
    }

    return true;
  },

  getShortUrlCustomStringComponentByCampaignIdOrCampaignVersion: function(campaignId,campaignVersionId){
    function getByCampaignId (campaignId){
      return new Promise(function(resolve, reject) {
        campaignService.getCampaign(campaignId,(err,row)=>{
          if (err){
            return reject(err);
          }
          var vanityString = row.shortUrlCustomStringComponent ? '/' + row.shortUrlCustomStringComponent : '';
          return resolve(vanityString);
        });
      });
    }

    function getCampaignIdByCampaignVersionId(campaignVersionId){
      return new Promise(function(resolve, reject) {
        campaignVersionService.getCampaignVersion(campaignVersionId,(err,row)=>{
          if (err){
            return reject(err);
          }
          if(!row){
            return reject();
          }
          getByCampaignId(row.campaignId).then((vanityString)=>{
            resolve(vanityString);
          });
        });
      });

    }


    if (!campaignId && !campaignVersionId){
      return Promise.resolve('');
    }
    if(campaignId){
      return getByCampaignId(campaignId);
    }else if(campaignVersionId){
      return getCampaignIdByCampaignVersionId(campaignVersionId);
    }
  }
};

module.exports = sharedUrlHelper;