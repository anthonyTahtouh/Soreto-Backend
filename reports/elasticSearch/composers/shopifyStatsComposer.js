const baseClient = require('../baseClient.js');

class StatsComposer {
  constructor() {
    this.elasticOrderClient = baseClient.start(['soreto_stats_order']);

    this.elasticTrackingClient = baseClient.start([
      'soreto_stats_tracking',
    ]);

    this.elasticShareClient = baseClient.start([
      'soreto_stats_social_post',
    ]);

    this.orderQuery = {
      aggs: {
        saleCountTotal: {
          sum: {
            field: 'orderCount',
          },
        },
        saleRevenueTotal: {
          sum: {
            field: 'orderTotalSum_GBP'
          }
        },
        saleCommissionTotal: {
          sum: {
            field: 'orderCommissionSum_GBP',
          },
        }
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

    this.trackingQuery = {
      aggs: {
        interstitialLoadCountTotal: {
          sum: {
            field: 'trackingSoretoClicksCount'
          }
        },
        interstitialCTACountTotal: {
          sum: {
            field: 'trackingSoretoTrafficCount'
          }
        },
        sharePlaceViewCountTotal: {
          sum: {
            field: 'trackingClientSalesCount',
          },
        },
        affiliateClickCountTotal: {
          sum: {
            field: 'trackingExternalClicksCount',
          },
        }
      },
      query: {
        bool: {
          must: [
            {
              range: {
                eventDate: {
                  gte: '2024-02-01',
                  lte: '2024-02-28',
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

    this.shareQuery = {
      aggs: {
        shareCountTotal: {
          sum: {
            field: 'socialPostCount',
          },
        }
      },
      query: {
        bool: {
          must: [
            {
              range: {
                eventDate: {
                  gte: '2024-02-01',
                  lte: '2024-02-28',
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

  async getData(startDate, endDate, campaignVersionIds) {

    // clone the original search object
    let orderQueryClone = JSON.parse(JSON.stringify(this.orderQuery));
    let trackingQueryClone = JSON.parse(JSON.stringify(this.trackingQuery));
    let shareQueryClone = JSON.parse(JSON.stringify(this.shareQuery));

    // set date range
    orderQueryClone.query.bool.must[0].range.eventDate = {
      gte: startDate,
      lte: endDate,
    };
    trackingQueryClone.query.bool.must[0].range.eventDate = {
      gte: startDate,
      lte: endDate,
    };
    shareQueryClone.query.bool.must[0].range.eventDate = {
      gte: startDate,
      lte: endDate,
    };

    if (campaignVersionIds) {
      for (const campaignVersionId of campaignVersionIds) {
        orderQueryClone.query.bool.must[2].bool.should.push({
          match: { campaignVersionId },
        });
        trackingQueryClone.query.bool.must[2].bool.should.push({
          match: { campaignVersionId },
        });
        shareQueryClone.query.bool.must[2].bool.should.push({
          match: { campaignVersionId },
        });
      }
    }

    try {

      // prepare the search promisses
      let orderQuery = this.elasticOrderClient.search({
        body: orderQueryClone,
      });

      let trackingQuery = this.elasticTrackingClient.search({
        body: trackingQueryClone,
      });

      let shareQuery = this.elasticShareClient.search({
        body: shareQueryClone,
      });

      // execute all at once
      let [orderResult, trackingResult, shareResult] = await Promise.all([
        orderQuery,
        trackingQuery,
        shareQuery,
      ]);

      return this.parseResult(orderResult, trackingResult, shareResult);
    } catch (err) {
      // no treatment needed, let the controller handle it
      throw err;
    }
  }

  parseResult(orderResult, trackingResult, shareResult) {

    let finalOrderDoc = baseClient.recursiveParser(orderResult.body.aggregations);
    let finalTrackingDoc = baseClient.recursiveParser(trackingResult.body.aggregations);
    let finalShareDoc = baseClient.recursiveParser(shareResult.body.aggregations);


    return {...finalOrderDoc, ...finalTrackingDoc, ...finalShareDoc };
  }



}

const utmCampaignsComposerComposer = new StatsComposer();

module.exports = utmCampaignsComposerComposer;
