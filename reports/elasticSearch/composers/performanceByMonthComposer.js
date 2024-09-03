let baseClient = require('../baseClient');
let moment = require('moment');
class PerformanceByMonthComposer {

  constructor() {
    this.INDEXES = ['soreto_stats_order'];
    this.elasticClient = baseClient.start(this.INDEXES);
    this.defaultQuery = {
      aggs: {
        months: {
          'date_histogram': {
            field: 'eventDate',
            'calendar_interval': '1M',
            'time_zone': 'UCT',
            'min_doc_count': 1
          },
          aggs: {
            'orderTotalSum': {
              'sum': {
                'field': 'orderTotalSum'
              }
            },
            'orderTotalSum_GBP': {
              'sum': {
                'field': 'orderTotalSum_GBP'
              }
            },
            'orderTotalSum_USD': {
              'sum': {
                'field': 'orderTotalSum_USD'
              }
            },
            'orderTotalSum_EUR': {
              'sum': {
                'field': 'orderTotalSum_EUR'
              }
            },
            'orderCommissionSum': {
              'sum': {
                'field': 'orderCommissionSum'
              }
            },
            'orderCommissionSum_GBP': {
              'sum': {
                'field': 'orderCommissionSum_GBP'
              }
            },
            'orderCommissionSum_USD': {
              'sum': {
                'field': 'orderCommissionSum_USD'
              }
            },
            'orderCommissionSum_EUR': {
              'sum': {
                'field': 'orderCommissionSum_EUR'
              }
            },
            'orderCount': {
              'sum': {
                'field': 'orderCount'
              }
            }
          }
        }
      },
      'size': 0,
      'stored_fields': [
        '*'
      ],
      'script_fields': {},
      'docvalue_fields': [
        {
          'field': 'eventDate',
          'format': 'date_time'
        },
        {
          'field': 'orderCreatedAt',
          'format': 'date_time'
        },
        {
          'field': 'socialPostCreatedAt',
          'format': 'date_time'
        },
        {
          'field': 'trackingCreatedAt',
          'format': 'date_time'
        },
        {
          'field': 'updatedDate',
          'format': 'date_time'
        },
      ],
      '_source': {
        'excludes': []
      },
      query: {
        bool: {
          must: [],
          filter: [],
          should: [],
          must_not: []
        }
      }
    };
  }

  async getPerformanceByMonth(
    dateLte,
    dateGte,
    campaignType,
    campaignRegionCountryNames,
    sortField
  ) {
    let defaultQueryClone = {};
    //Clone the default query to not use an altered query from previous requests
    defaultQueryClone = JSON.parse(JSON.stringify(this.defaultQuery));
    defaultQueryClone = this.filterByDate(defaultQueryClone, dateGte, dateLte);
    if (campaignType) {
      defaultQueryClone = this.filterCampaignType(defaultQueryClone, campaignType);
    }

    defaultQueryClone = this.filterByCampaignRegionCountry(
      defaultQueryClone,
      campaignRegionCountryNames
    );

    try {
      let queryResult = await this.elasticClient.search({ body: defaultQueryClone });
      return this.parseResult(queryResult, dateGte, dateLte, sortField);
    } catch (err) {
      throw new Error('Error on elasticClient.search(). Check if the url and port are correct.');
    }
  }

  filterByDate(defaultQueryClone, dateGte, dateLte) {
    defaultQueryClone.query.bool.must.push({
      range: {
        eventDate: {
          gte: dateGte,
          lte: dateLte,
          format: 'strict_date_optional_time'
        }
      }
    });
    return defaultQueryClone;
  }

  filterCampaignType(defaultQueryClone, campaignType) {
    defaultQueryClone.query.bool.must.push({
      match: {
        'campaignType': campaignType
      }
    });
    return defaultQueryClone;
  }

  filterByCampaignRegionCountry(
    defaultQueryClone,
    campaignRegionCountryNames
  ) {
    if (campaignRegionCountryNames) {
      let shouldFilters = { bool : { should : [] } };

      for (let country of campaignRegionCountryNames) {
        shouldFilters.bool.should.push({ match : {campaignRegionCountryName: country } });
      }

      defaultQueryClone.query.bool.must.push(shouldFilters);
    }

    return defaultQueryClone;
  }

  parseResult(queryResult, dateGte, dateLte, sortField) {
    //build array of months to display in the format yyyy-mm
    let monthsToDisplay = this.getMonthsToDisplay(dateGte, dateLte);
    let data = [];
    data = this.buildParsedData(queryResult, monthsToDisplay);
    data = this.sortData(data, sortField);
    return { data,  monthsToDisplay };
  }

  buildParsedData(queryResult, monthsToDisplay) {
    let data = [];

    for (let monthToDisplay of monthsToDisplay) {
      let parsedObject = { };
      let monthBucket = queryResult.body.aggregations.months.buckets.find(monthBucket => monthToDisplay === moment.utc(monthBucket.key_as_string).format('YYYY-MM'));

      parsedObject['orderTotalSum_GBP_' + monthToDisplay] = monthBucket ? monthBucket.orderTotalSum.value : 0;
      parsedObject['orderTotalSum_USD_' + monthToDisplay] = monthBucket ? monthBucket.orderTotalSum_USD.value : 0;
      parsedObject['orderTotalSum_EUR_' + monthToDisplay] = monthBucket ? monthBucket.orderTotalSum_EUR.value : 0;
      parsedObject['revenue_GBP_' + monthToDisplay] = monthBucket ? monthBucket.orderTotalSum_GBP.value : 0;
      parsedObject['orderCommissionSum_' + monthToDisplay] = monthBucket ? monthBucket.orderCommissionSum.value : 0;
      parsedObject['commissionSum_GBP_' + monthToDisplay] = monthBucket ? monthBucket.orderCommissionSum_GBP.value : 0;
      parsedObject['orderCommissionSum_USD_' + monthToDisplay] = monthBucket ? monthBucket.orderCommissionSum_USD.value : 0;
      parsedObject['orderCommissionSum_EUR_' + monthToDisplay] = monthBucket ? monthBucket.orderCommissionSum_EUR.value : 0;
      parsedObject['orderCount_' + monthToDisplay] = monthBucket ? monthBucket.orderCount.value : 0;

      data.push(parsedObject);
    }

    return data;
  }

  sortData(data, sortField) {

    //If it's sorting by client name sort directly in the query
    if (sortField && sortField !== '-clientName') {

      //If it has a '-' in the first character it's descending order
      let isDescendingOrder = sortField.substring(0, 1) === '-';

      //Remove the '-' if it's descending order
      sortField = isDescendingOrder ? sortField.substring(1) : sortField;

      data.sort((firstField, secondField) => {
        if (isDescendingOrder) {
          return ((secondField[sortField] || 0) - (firstField[sortField] || 0));
        } else {
          return ((firstField[sortField] || 0) - (secondField[sortField] || 0));
        }
      });

    }

    return data;
  }

  //build array of months to display in the format yyyy-mm
  getMonthsToDisplay(dateGte, dateLte) {
    let monthsToDisplay = [];
    let startDate = moment(dateGte);
    let endDate = moment(dateLte);
    while (startDate <= endDate || startDate.format('YYYY-MM') === endDate.format('YYYY-MM')) {
      monthsToDisplay.push(startDate.format('YYYY-MM'));
      startDate.add(1, 'month');
    }
    return monthsToDisplay;
  }
}

const performanceByMonthComposer = new PerformanceByMonthComposer();

module.exports = performanceByMonthComposer;