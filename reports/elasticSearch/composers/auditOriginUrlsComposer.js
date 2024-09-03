let baseClient = require('../baseClient.js');
class AuditOriginUrlsComposer {
  constructor() {
    this.INDEXES = ['soreto_live_tag_details_*'];
    this.elasticClient = baseClient.startTracking(this.INDEXES);
    this.defaultQuery = {
      size: 10,
      from: 0,
      track_total_hits: true,
      query: {
        bool: {
          should: [],
          must: [],
        },
      },
      sort: [
        {
          date: {
            order: 'desc',
          },
        },
      ],
    };
  }

  filterByClientIds(clientId, defaultQueryClone) {
    if (!clientId) return defaultQueryClone;
    let boolShould = { bool: { must: [] } };
    for (let clientId of clientId) {
      boolShould.bool.should.push({ match: { clientId } });
    }
    defaultQueryClone.query.bool.must.push(boolShould);
    return defaultQueryClone;
  }

  filterByDate(defaultQueryClone, startDate, endDate) {
    if (startDate && endDate) {
      defaultQueryClone.query.bool.must.push({
        range: {
          eventDate: {
            gte: startDate,
            lte: endDate,
            format: 'strict_date_optional_time',
          },
        },
      });
    }
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

  adjustToPaginator(defaultQueryClone, first, rows) {
    if (first) {
      defaultQueryClone.from = first;
    }

    if (rows) {
      defaultQueryClone.size = rows;
    }
    return defaultQueryClone;
  }

  parseResult(result) {
    const totalCount = result.body.hits.total.value;
    const arrOfRawResult = result.body.hits.hits;
    let resultArr = [];
    for (let res of arrOfRawResult) {
      let browserURL = res._source.meta.userBrowserURL;
      let date = res._source.date;
      resultArr.push({ url: browserURL, date });
    }
    return { totalCount, resultData: resultArr };
  }

  async getData(internalId, externalId, first, rows) {
    let defaultQueryClone = '';
    defaultQueryClone = JSON.parse(JSON.stringify(this.defaultQuery));

    defaultQueryClone = this.filterByIds(
      defaultQueryClone,
      internalId,
      externalId
    );

    defaultQueryClone = this.adjustToPaginator(defaultQueryClone, first, rows);

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

const auditOriginUrlsComposer = new AuditOriginUrlsComposer();

module.exports = auditOriginUrlsComposer;
