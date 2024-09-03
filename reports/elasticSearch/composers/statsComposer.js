const { parseBoolean } = require('../../../common/utility.js');
const baseClient = require('../baseClient.js');
const _ = require('lodash');

function mergeAndCalculateConversionRate(group) {
  let mergedGroup = group.reduce((accumulator, currentValue) => {
    let row = accumulator.find(a => a.name.toUpperCase() === currentValue.name.toUpperCase());
    currentValue.conversionRate = ((currentValue.saleCountTotal / currentValue.interstitialLoadCountTotal) * 100) || 0;
    if (!row) {
      accumulator.push(currentValue);
    } else {
      let indexOfObject = accumulator.findIndex(activeItem => activeItem.name.toUpperCase() === currentValue.name.toUpperCase());
      accumulator[indexOfObject] = _.merge({}, row, currentValue);
    }
    return accumulator;
  }, []);

  mergedGroup = mergedGroup.map(item => {
    return {
      ...item,
      conversionRate: item.saleCountTotal && item.interstitialLoadCountTotal ? ((item.saleCountTotal / item.interstitialLoadCountTotal) * 100).toFixed(2) : 0
    };
  });

  return mergedGroup;
}
class StatsComposer {
  constructor() {
    this.INDEXES = ['soreto_stats_order', 'soreto_stats_tracking'];
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
        },
        aggCampaignRegionCountryName: {
          terms: {
            field: 'campaignRegionCountryName',
            size: 40,
            order: {
              saleCommission: 'desc'
            },
          },
          aggs: {
            campaignVersionCount: {
              cardinality: {
                field: 'campaignVersionId'
              }
            },
            saleCommission: {
              sum: {
                field: 'orderCommissionSum_GBP',
              },
            },
          },
        },
        aggNetwork: {
          terms: {
            field: 'clientHolderName',
            size: 20,
            order: {
              saleCommission: 'desc'
            },
            missing: 'None'
          },
          aggs: {
            campaignVersionCount: {
              cardinality: {
                field: 'campaignVersionId'
              }
            },
            saleCommission: {
              sum: {
                field: 'orderCommissionSum_GBP',
              },
            },
            clientCount: {
              cardinality: {
                field: 'clientId',
              },
            },
          },
        },
        aggIndustry: {
          terms: {
            field: 'clientIndustry',
            size: 20,
            order: {
              saleCommission: 'desc'
            },
          },
          aggs: {
            campaignVersionCount: {
              cardinality: {
                field: 'campaignVersionId'
              }
            },
            saleCommission: {
              sum: {
                field: 'orderCommissionSum_GBP',
              },
            },
          },
        },
        aggShareChannel: {
          terms: {
            field: 'socialPostSocialPlatform',
            size: 20,
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
            saleCommissionTotal: {
              sum: {
                field: 'orderCommissionSum_GBP',
              },
            },
          },
        },
        aggCampaignVersionSource: {
          terms: {
            field: 'campaignVersionSourceTagGroup',
            size: 20,
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
            saleCommissionTotal: {
              sum: {
                field: 'orderCommissionSum_GBP',
              },
            },
          },
        },
        aggShareDevice: {
          terms: {
            field: 'sharePlaceDeviceType',
            size: 3,
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
            saleCommissionTotal: {
              sum: {
                field: 'orderCommissionSum_GBP',
              },
            },
          },
        },
        aggClients: {
          terms: {
            field: 'clientName',
            size: 1000,
          },
          aggs: {
            campaignCountryName: {
              terms: {
                field: 'campaignCountryName'
              },
              aggs: {
                saleCountTotal: {
                  sum: {
                    field: 'orderCount'
                  }
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
                },
                soretoOrderCount: {
                  sum: {
                    field: 'orderSoretoCount',
                  },
                },
                soretoOrderTotal: {
                  sum: {
                    script: {
                      lang: 'painless',
                      source: 'if(doc.orderSoretoCount.value == 1) { return doc.orderTotal } else { return 0 }'
                    }
                  }
                },
              },
            },
            saleCountTotal: {
              sum: {
                field: 'orderCount'
              }
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
            },
            soretoOrderCount: {
              sum: {
                field: 'orderSoretoCount',
              },
            },
            soretoOrderTotal: {
              sum: {
                script: {
                  lang: 'painless',
                  source: 'if(doc.orderSoretoCount.value == 1) { return doc.orderTotal } else { return 0 }'
                }
              }
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
        },
        aggShareChannel: {
          terms: {
            field: 'socialPostSocialPlatform',
            size: 20,
          },
          aggs: {
            interstitialLoadCountTotal: {
              sum: {
                field: 'trackingSoretoClicksCount'
              }
            },
          },
        },
        aggCampaignVersionSource: {
          terms: {
            field: 'campaignVersionSourceTagGroup',
            size: 20,
          },
          aggs: {
            interstitialLoadCountTotal: {
              sum: {
                field: 'trackingSoretoClicksCount'
              }
            },
            sharePlaceViewCountTotal: {
              sum: {
                field: 'trackingClientSalesCount',
              },
            },
          },
        },
        aggShareDevice: {
          terms: {
            field: 'sharePlaceDeviceType',
            size: 3,
          },
          aggs: {
            interstitialLoadCountTotal: {
              sum: {
                field: 'trackingSoretoClicksCount'
              }
            },
            sharePlaceViewCountTotal: {
              sum: {
                field: 'trackingClientSalesCount',
              },
            },
          },
        },
        aggClients: {
          terms: {
            field: 'clientName',
            size: 1000,
          },
          aggs: {
            campaignCountryName: {
              terms: {
                field: 'campaignCountryName'
              },
              aggs: {
                sharePlaceViewCountTotal: {
                  sum: {
                    field: 'trackingClientSalesCount',
                  },
                },
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
                affiliateClickCountTotal: {
                  sum: {
                    field: 'trackingExternalClicksCount',
                  },
                },
                refClicks: {
                  sum: {
                    field: 'trackingClicksCount'
                  }
                },
              },
            },
            sharePlaceViewCountTotal: {
              sum: {
                field: 'trackingClientSalesCount',
              },
            },
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
            affiliateClickCountTotal: {
              sum: {
                field: 'trackingExternalClicksCount',
              },
            },
            refClicks: {
              sum: {
                field: 'trackingClicksCount'
              }
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
        },
        aggShareChannel: {
          terms: {
            field: 'socialPostSocialPlatform',
            size: 20,
          },
          aggs: {
            socialCount: {
              sum: {
                field: 'socialPostCount'
              }
            },
          },
        },
        aggCampaignVersionSource: {
          terms: {
            field: 'campaignVersionSourceTagGroup',
            size: 20,
          },
          aggs: {
            socialCount: {
              sum: {
                field: 'socialPostCount'
              }
            },
          },
        },
        aggShareDevice: {
          terms: {
            field: 'sharePlaceDeviceType',
            size: 3,
          },
          aggs: {
            socialCount: {
              sum: {
                field: 'socialPostCount'
              }
            },
          },
        },
        aggClients: {
          terms: {
            field: 'clientName',
            size: 1000,
          },
          aggs: {
            campaignCountryName: {
              terms: {
                field: 'campaignCountryName'
              },
              aggs: {
                shareCountTotal: {
                  sum: {
                    field: 'socialPostCount',
                  },
                },
                refClicks: {
                  sum: {
                    field: 'trackingClicksCount'
                  }
                },
              },
            },
            shareCountTotal: {
              sum: {
                field: 'socialPostCount',
              },
            },
            refClicks: {
              sum: {
                field: 'trackingClicksCount'
              }
            },
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

    this.baseQuery = {
      aggs: {
        aggCampaignRegionCountryName: {
          terms: {
            field: 'campaignRegionCountryName',
            size: 20,
          },
          aggs: {
            campaignCount: {
              cardinality: {
                field: 'campaignId'
              }
            }
          },
        },
      }
    };

    // Filter by GROUP BY OPTIONAL FIELD
    this.groupFields = {
      orderQuery: {
        campaignVersion: {
          terms: { field: 'campaignVersionAlias', size: 20 },
          aggs: {
            saleCountTotal: {
              sum: {
                field: 'orderCount'
              }
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
            },
          },
        },
      },
      trackingQuery: {
        campaignVersion: {
          terms: { field: 'campaignVersionAlias', size: 20 },
          aggs: {
            sharePlaceViewCountTotal: {
              sum: {
                field: 'trackingClientSalesCount',
              },
            },
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
            affiliateClickCountTotal: {
              sum: {
                field: 'trackingExternalClicksCount',
              },
            },
          },
        },
      },
      shareQuery: {
        campaignVersion: {
          terms: { field: 'campaignVersionAlias', size: 20 },
          aggs: {
            shareCountTotal: {
              sum: {
                field: 'socialPostCount',
              },
            },
            aggShareChannel: {
              terms: {
                field: 'socialPostSocialPlatform',
                size: 20,
              },
              aggs: {
                shareCountTotal: {
                  sum: {
                    field: 'socialPostCount',
                  },
                },
              },
            },
            aggShareDevice: {
              terms: {
                field: 'sharePlaceDeviceType',
                size: 20,
              },
              aggs: {
                shareCountTotal: {
                  sum: {
                    field: 'socialPostCount'
                  }
                },
              },
            },
          },
        },
      }
    };
  }

  async getData(startDate, endDate,
    campaignRegionCountryNames, sectorNames, networkNames,
    clientLaunch, responsibleIds, fixedFeeValues, groupBy, groupFields, campaignVersionIds) {

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

    // set the campaign country filter
    if (campaignRegionCountryNames) {
      for (const campaignCountryName of campaignRegionCountryNames) {
        orderQueryClone.query.bool.must[2].bool.should.push({
          match: { campaignRegionCountryName: campaignCountryName },
        });
        trackingQueryClone.query.bool.must[2].bool.should.push({
          match: { campaignRegionCountryName: campaignCountryName },
        });
        shareQueryClone.query.bool.must[2].bool.should.push({
          match: { campaignRegionCountryName: campaignCountryName },
        });
      }
    }

    if (sectorNames) {
      for (const sector of sectorNames) {
        orderQueryClone.query.bool.must[2].bool.should.push({
          match: { clientIndustry: sector },
        });
        trackingQueryClone.query.bool.must[2].bool.should.push({
          match: { clientIndustry: sector },
        });
        shareQueryClone.query.bool.must[2].bool.should.push({
          match: { clientIndustry: sector },
        });
      }
    }

    if (networkNames) {
      if (networkNames.length === 1) {
        orderQueryClone.query.bool.must.push({
          match: { clientHolderId: networkNames[0] },
        });
        trackingQueryClone.query.bool.must.push({
          match: { clientHolderId: networkNames[0] },
        });
        shareQueryClone.query.bool.must.push({
          match: { clientHolderId: networkNames[0] },
        });
      }
      else {
        for (const network of networkNames) {
          orderQueryClone.query.bool.must[2].bool.should.push({
            match: { clientHolderId: network },
          });
          trackingQueryClone.query.bool.must[2].bool.should.push({
            match: { clientHolderId: network },
          });
          shareQueryClone.query.bool.must[2].bool.should.push({
            match: { clientHolderId: network },
          });
        }
      }
    }

    if (clientLaunch) {
      if (clientLaunch['$clientLaunchDiffDays_$lte']) {
        orderQueryClone.query.bool.must.push({
          range: { clientLaunchDiffDays: { lte: clientLaunch['$clientLaunchDiffDays_$lte'] } },
        });
        trackingQueryClone.query.bool.must.push({
          range: { clientLaunchDiffDays: { lte: clientLaunch['$clientLaunchDiffDays_$lte'] } },
        });
        shareQueryClone.query.bool.must.push({
          range: { clientLaunchDiffDays: { lte: clientLaunch['$clientLaunchDiffDays_$lte'] } },
        });
      }

      if (clientLaunch['$clientLaunchDiffDays_$gte']) {
        orderQueryClone.query.bool.must.push({
          range: { clientLaunchDiffDays: { gte: clientLaunch['$clientLaunchDiffDays_$gte'] } },
        });
        trackingQueryClone.query.bool.must.push({
          range: { clientLaunchDiffDays: { gte: clientLaunch['$clientLaunchDiffDays_$gte'] } },
        });
        shareQueryClone.query.bool.must.push({
          range: { clientLaunchDiffDays: { gte: clientLaunch['$clientLaunchDiffDays_$gte'] } },
        });
      }
    }

    if (responsibleIds) {
      if (responsibleIds.length === 1) {
        orderQueryClone.query.bool.must.push({
          match: { clientResponsibleId: responsibleIds[0] },
        });
        trackingQueryClone.query.bool.must.push({
          match: { clientResponsibleId: responsibleIds[0] },
        });
        shareQueryClone.query.bool.must.push({
          match: { clientResponsibleId: responsibleIds[0] },
        });
      }
      else {
        for (const responsibleId of responsibleIds) {
          orderQueryClone.query.bool.must[2].bool.should.push({
            match: { clientResponsibleId: responsibleId },
          });
          trackingQueryClone.query.bool.must[2].bool.should.push({
            match: { clientResponsibleId: responsibleId },
          });
          shareQueryClone.query.bool.must[2].bool.should.push({
            match: { clientResponsibleId: responsibleId },
          });
        }
      }
    }

    if (fixedFeeValues && fixedFeeValues[0] !== 'all') {
      orderQueryClone.query.bool.must.push({
        match: { 'clientFeeBased': parseBoolean(fixedFeeValues[0])
        }
      });
      trackingQueryClone.query.bool.must.push({
        match: { 'clientFeeBased': parseBoolean(fixedFeeValues[0])
        }
      });
      shareQueryClone.query.bool.must.push({
        match: { 'clientFeeBased': parseBoolean(fixedFeeValues[0])
        }
      });
    }

    if (groupFields) {
      for (const groupField of groupFields) {
        orderQueryClone.aggs[groupField] = this.groupFields.orderQuery[groupField];
        trackingQueryClone.aggs[groupField] = this.groupFields.trackingQuery[groupField];
        shareQueryClone.aggs[groupField] = this.groupFields.shareQuery[groupField];
      }
    }

    // set the date group by
    let dateIntervalGroup =  null;
    let dateFieldName = null;

    switch (groupBy) {
    case 'monthly':
      dateIntervalGroup = 'month';
      dateFieldName = 'month_group';
      break;
    case 'daily':
      dateIntervalGroup = 'day';
      dateFieldName = 'day_group';
      break;
    }

    if(dateIntervalGroup){
      orderQueryClone.aggs[dateFieldName] =  {
        date_histogram: {
          field: 'eventDate',
          calendar_interval: dateIntervalGroup
        },
        aggs: { ...orderQueryClone.aggs }
      };

      trackingQueryClone.aggs[dateFieldName] =  {
        date_histogram: {
          field: 'eventDate',
          calendar_interval: dateIntervalGroup
        },
        aggs: { ...trackingQueryClone.aggs }
      };

      shareQueryClone.aggs[dateFieldName] =  {
        date_histogram: {
          field: 'eventDate',
          calendar_interval: dateIntervalGroup
        },
        aggs: { ...shareQueryClone.aggs }
      };
    }

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

      return this.parseResult(orderResult, trackingResult, shareResult, groupFields);
    } catch (err) {
      // no treatment needed, let the controller handle it
      throw err;
    }
  }

  parseResult(orderResult, trackingResult, shareResult, groupFields) {
    let finalGroupFields = {};
    let finalOrderDoc = baseClient.recursiveParser(orderResult.body.aggregations);
    let finalTrackingDoc = baseClient.recursiveParser(trackingResult.body.aggregations);
    let finalShareDoc = baseClient.recursiveParser(shareResult.body.aggregations);

    let monthGroup = [];
    if (finalOrderDoc.month_group) {
      monthGroup = this.groupByDate(finalOrderDoc.month_group, finalTrackingDoc.month_group, finalShareDoc.month_group);
    }

    let dayGroup = [];
    if (finalOrderDoc.day_group) {
      dayGroup = this.groupByDate(finalOrderDoc.day_group, finalTrackingDoc.day_group, finalShareDoc.day_group);
    }

    finalTrackingDoc.aggShareChannel = finalTrackingDoc.aggShareChannel.filter(item => item.name !== 'UNTRACKED');
    const shareChannelGroup = [...new Set([...(finalOrderDoc.aggShareChannel || []), ...(finalShareDoc.aggShareChannel || []), ...(finalTrackingDoc.aggShareChannel || [])])];
    const campaignVersionSourceTagGroup = [...new Set([...(finalOrderDoc.aggCampaignVersionSource || []), ...(finalShareDoc.aggCampaignVersionSource || []), ...(finalTrackingDoc.aggCampaignVersionSource || [])])];
    const deviceGroup = [...new Set([...(finalOrderDoc.aggShareDevice || []), ...(finalShareDoc.aggShareDevice || []), ...(finalTrackingDoc.aggShareDevice || [])])];
    const clients = [...new Set([...(finalOrderDoc.aggClients || []), ...(finalShareDoc.aggClients || []), ...(finalTrackingDoc.aggClients || [])])];

    if(groupFields){
      for (const groupField of groupFields) {
        const campaignVersionGroup = [...new Set([...(finalOrderDoc[groupField] || []), ...(finalShareDoc[groupField] || []), ...(finalTrackingDoc[groupField] || [])])];
        finalGroupFields[groupField] = mergeAndCalculateConversionRate(campaignVersionGroup);
      }
    }

    let shareChannelGroupMerged = mergeAndCalculateConversionRate(shareChannelGroup);
    let campaignVersionSourceTagGroupMerged = mergeAndCalculateConversionRate(campaignVersionSourceTagGroup);
    let deviceGroupMerged = mergeAndCalculateConversionRate(deviceGroup);
    let clientsMerged = mergeAndCalculateConversionRate(clients);

    return {...finalOrderDoc, ...finalTrackingDoc, ...finalShareDoc, ...{ monthGroup, dayGroup, shareChannelGroupMerged, campaignVersionSourceTagGroupMerged, deviceGroupMerged, clientsMerged }, ...finalGroupFields};
  }

  groupByDate(finalOrderDoc_dateGroup, finalTrackingDoc_dateGroup, finalShareDoc_dateGroup) {


    let monthGroupArray = [...finalOrderDoc_dateGroup, ...finalTrackingDoc_dateGroup, ...finalShareDoc_dateGroup];

    monthGroupArray = monthGroupArray.reduce((accumulator, currentValue) => {

      let dateRow = accumulator.find(a => a.name == currentValue.name);
      if (!dateRow) {
        accumulator.push(currentValue);
      } else {
        let indexOfObject = accumulator.findIndex(acitem => acitem.name == currentValue.name);
        accumulator[indexOfObject] = this.deepMerge(dateRow, currentValue);
      }

      return accumulator;
    }, []);

    return _.orderBy(monthGroupArray, ['name']);
  }

  deepMerge(obj1, obj2) {
    const isObject = (obj) => obj && typeof obj === 'object' && !Array.isArray(obj);
    const isArray = (arr) => Array.isArray(arr);

    const mergeArraysByName = (arr1, arr2) => {
      const result = [...arr1];

      arr2.forEach(item2 => {
        const matchIndex = result.findIndex(item1 => item1.name === item2.name);
        if (matchIndex > -1) {
          result[matchIndex] = this.deepMerge(result[matchIndex], item2);
        } else {
          result.push(item2);
        }
      });

      return result;
    };

    const result = { ...obj1 };

    for (const key in obj2) {
      if (isObject(obj2[key])) {
        if (!result[key]) {
          result[key] = {};
        }
        result[key] = this.deepMerge(result[key], obj2[key]);
      } else if (isArray(obj2[key])) {
        if (!result[key]) {
          result[key] = [];
        }
        result[key] = mergeArraysByName(result[key], obj2[key]);
      } else {
        result[key] = obj2[key];
      }
    }

    return result;
  }
}

const utmCampaignsComposerComposer = new StatsComposer();

module.exports = utmCampaignsComposerComposer;
