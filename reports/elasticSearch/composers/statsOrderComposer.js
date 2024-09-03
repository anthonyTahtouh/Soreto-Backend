const baseClient = require('../baseClient.js');

class ClientStatsComposer {
  constructor() {
    this.INDEXES = ['soreto_stats_order'];
    this.elasticOrderClient = baseClient.start(['soreto_stats_order']);
    this.orderQuery = {
      aggs: {
        aggTopClient: {
          terms: {
            field: 'clientName',
            size: 1000,
            order: {
              saleCommission: 'desc'
            },
          },
          aggs: {
            saleCommission: {
              sum: {
                field: 'orderCommissionSum_GBP',
              },
            },
          },
        },
        aggReferrals: {
          terms: {
            field: 'sourceReferralType',
            size: 1000,
            order: {
              saleCommission: 'desc'
            },
          },
          aggs: {
            saleCountTotal: {
              sum: {
                field: 'orderCount'
              }
            },
            saleRevenueTotal: {
              sum: {
                field: 'orderTotalSum_GBP',
              },
            },
            saleCommission: {
              sum: {
                field: 'orderCommissionSum_GBP',
              },
            },
          },
        },
      },
      query: {
        bool: {
          must: [
            {
              range: {
                eventDate: {
                  gte: '2024-02-01',
                  lte: '2024-02-29',
                },
              },
            },
            {
              match: {
                campaignType: 'on_site_referral',
              },
            },
            {
              bool: {
                should: [],
              },
            },
          ],
        },
      },
      size: 0,
    };
  }

  async getData(startDate, endDate, campaignRegionCountryNames) {

    // clone the original search object
    let orderQueryClone = JSON.parse(JSON.stringify(this.orderQuery));

    // set date range
    orderQueryClone.query.bool.must[0].range.eventDate = {
      gte: startDate,
      lte: endDate,
    };

    // set the campaign country filter
    if (campaignRegionCountryNames) {
      for (const campaignCountryName of campaignRegionCountryNames) {
        orderQueryClone.query.bool.must[2].bool.should.push({
          match: { campaignRegionCountryName: campaignCountryName },
        });
      }
    }

    try {

      // prepare the search promisses
      let orderQuery = this.elasticOrderClient.search({
        body: orderQueryClone,
      });

      // execute all at once
      let [orderResult] = await Promise.all([
        orderQuery,
      ]);

      return this.parseResult(orderResult);
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

const utmTopClientsComposerComposer = new ClientStatsComposer();

module.exports = utmTopClientsComposerComposer;
