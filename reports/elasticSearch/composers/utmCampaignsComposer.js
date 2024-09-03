let baseClient = require('../baseClient.js');

class UTMCampaignsComposer {
  constructor() {
    this.INDEXES = ['soreto_fingerprint_user'];
    this.elasticClient = baseClient.startTracking(this.INDEXES);
    this.defaultQuery = {
      size: 0,
      aggs: {
        origins: {
          terms: { field: 'utm_campaign_history.utm_campaign.keyword', size: 50000 },
        },
      },
      query: {
        bool: {
          should: [
          ],
        },
      },
    };
  }

  buildParsedData(queryResult) {
    return queryResult;
  }

  parse(queryResult) {
    let data = [];
    data = this.buildParsedData(queryResult);
    return { data };
  }

  parseResult(result){
    const arrayOfDomains = result.body.aggregations.origins.buckets;
    return arrayOfDomains;
  }

  async getData() {
    let defaultQueryClone = '';
    defaultQueryClone = JSON.parse(JSON.stringify(this.defaultQuery));

    try {
      let queryResult = await this.elasticClient.search({
        body: defaultQueryClone,
      });
      return this.parseResult(queryResult);
    } catch (err) {
      return err;
    }
  }
}

const utmCampaignsComposerComposer = new UTMCampaignsComposer();

module.exports = utmCampaignsComposerComposer;
