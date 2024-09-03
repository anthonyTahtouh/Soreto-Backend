const baseClient = require('../baseClient.js');

class ClientOrderSummaryStatsComposer {
  constructor() {
    this.INDEXES = ['soreto_stats_client_order_summary'];
    this.elasticClientOrderSummaryClient = baseClient.start(['soreto_stats_client_order_summary']);
    this.clientOrderSummaryQuery = {
      aggs: {
        total_GBP: {
          sum: {
            field: 'total_GBP'
          }
        },
        count: {
          sum: {
            field: 'orderCount'
          }
        },
        aggs: {
          terms: {
            field: 'clientName',
            size: 200
          },
          aggs: {
            total_GBP: {
              sum: {
                field: 'total_GBP'
              }
            },
            count: {
              sum: {
                field: 'orderCount'
              }
            }
          }
        }
      },
      query: {
        bool: {
          must: [
            {
              range: {
                date: {
                  gte: '2024-02-01',
                  lte: '2024-02-29',
                },
              },
            }
          ],
        },
      },
      size: 0,
    };
  }

  async getData(startDate, endDate, ignoreNoCurrencyRecords) {

    // clone the original search object
    let clientOrderSummaryQueryClone = JSON.parse(JSON.stringify(this.clientOrderSummaryQuery));

    // set date range
    clientOrderSummaryQueryClone.query.bool.must[0].range.date = {
      gte: startDate,
      lte: endDate,
    };

    if(ignoreNoCurrencyRecords){
      clientOrderSummaryQueryClone.query.bool.must.push(
        {
          exists: {
            field: 'currency'
          }
        }
      );
    }

    try {

      // prepare the search promisses
      let clientOrderSummaryResult = await this.elasticClientOrderSummaryClient.search({
        body: clientOrderSummaryQueryClone,
      });

      return this.parseResult(clientOrderSummaryResult);
    } catch (err) {
      // no treatment needed, let the controller handle it
      throw err;
    }
  }

  parseResult(orderResult) {

    let finalOrderDoc = baseClient.recursiveParser(orderResult.body.aggregations);

    return {...finalOrderDoc};
  }
}

module.exports = new ClientOrderSummaryStatsComposer();
