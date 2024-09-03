let baseClient = require('../baseClient.js');
class AuditOriginDomainsComposer {
  constructor() {
    this.INDEXES = ['soreto_live_tag_details_*'];
    this.elasticClient = baseClient.startTracking(this.INDEXES);
    this.defaultQuery = {
      size: 0,
      aggs: {
        origins: {
          terms: { field: 'meta.headers.referer.keyword', size: 1000 },
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

  filterByDate(defaultQueryClone, startDate, endDate) {
    defaultQueryClone.query.bool.must.push({
      range: {
        eventDate: {
          gte: startDate,
          lte: endDate,
          format: 'strict_date_optional_time',
        },
      },
    });
    return defaultQueryClone;
  }

  buildParsedData(queryResult) {
    return queryResult;
  }

  parse(queryResult) {
    let data = [];
    data = this.buildParsedData(queryResult);
    return { data };
  }

  filterByIds(defaultQueryClone, internalId, externalId) {
    const newQueryClone = { ...defaultQueryClone };
    const searchArr = newQueryClone.query.bool.should;
    searchArr.push({
      match: {
        'meta.params.externalId': internalId,
      },
    });
    if (externalId) {
      searchArr.push({
        match: {
          'meta.params.externalId': externalId,
        },
      });
    }
    return newQueryClone;
  }

  parseResult(result){
    const arrayOfDomains = result.body.aggregations.origins.buckets;
    return arrayOfDomains;
  }

  async getData(internalId, externalId) {
    let defaultQueryClone = '';
    defaultQueryClone = JSON.parse(JSON.stringify(this.defaultQuery));
    defaultQueryClone = this.filterByIds(
      defaultQueryClone,
      internalId,
      externalId
    );
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

const auditOriginDomainsComposer = new AuditOriginDomainsComposer();

module.exports = auditOriginDomainsComposer;
