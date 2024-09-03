let baseClient = require('../baseClient');
let moment = require('moment');
class CommissionsByMonthQueryComposer {

  constructor() {
    this.INDEXES = ['soreto_stats_order'];
    this.elasticClient = baseClient.start(this.INDEXES);
    this.defaultQuery = {
      aggs: {
        clientName: {
          terms: {
            field: 'clientName',
            size: '1000'
          },
          aggs: {
            clientTier: {
              terms: {
                field: 'clientTier',
                size: '1000'
              },
              aggs: {
                clientFeeBased: {
                  terms: {
                    field: 'clientFeeBased',
                    size: '1000'
                  },
                  aggs: {
                    months: {
                      'date_histogram': {
                        field: 'eventDate',
                        'calendar_interval': '1M',
                        'time_zone': 'UCT',
                        'min_doc_count': 1
                      },
                      aggs: {
                        'clientCountryCurrencyCode': {
                          'terms': {
                            'field': 'clientCountryCurrencyCode',
                            'size': 1
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
                        'orderCommissionSum_ClientCountryCurrency': {
                          'sum': {
                            'field': 'orderCommissionSum_ClientCountryCurrency'
                          }
                        }
                      }
                    }
                  }
                }
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

  async getCommissionsByMonth(dateLte, dateGte, showActiveClients, clientIds, sortField, clientTier, feeBased) {
    let defaultQueryClone = {};
    //Clone the default query to not use an altered query from previous requests
    defaultQueryClone = JSON.parse(JSON.stringify(this.defaultQuery));
    defaultQueryClone = this.filterByDate(defaultQueryClone, dateGte, dateLte);
    defaultQueryClone = this.filterByShowActiveClients(showActiveClients, defaultQueryClone);
    defaultQueryClone = this.filterByClientIds(clientIds, defaultQueryClone);
    defaultQueryClone = this.filterByClientTier(clientTier, defaultQueryClone);
    defaultQueryClone = this.filterByFeeBased(feeBased, defaultQueryClone);
    defaultQueryClone = this.sortByClientName(defaultQueryClone, sortField);
    try {
      let queryResult = await this.elasticClient.search({ body: defaultQueryClone });
      return this.parseResult(queryResult, dateGte, dateLte, sortField);
    } catch (err) {
      throw new Error('Error on elasticClient.search(). Check if the url and port are correct.');
    }
  }

  sortByClientName(defaultQueryClone, sortField) {
    defaultQueryClone.aggs.clientName.terms.order = (sortField === '-clientName') ? { '_key': 'desc' } : { '_key': 'asc' };
    return defaultQueryClone;
  }

  filterByClientIds(clientIds, defaultQueryClone) {
    if (!clientIds) return defaultQueryClone;
    let boolShould = { bool: { should : [] } };
    for (let clientId of clientIds) {
      boolShould.bool.should.push({ match: { clientId } });
    }
    defaultQueryClone.query.bool.must.push(boolShould);
    return defaultQueryClone;
  }

  filterByClientTier(clientTier, defaultQueryClone) {
    if (!clientTier || clientTier === 'all') return defaultQueryClone;
    defaultQueryClone.query.bool.must.push({
      'match': {
        'clientTier': clientTier
      }
    });
    return defaultQueryClone;
  }

  filterByFeeBased(feeBased, defaultQueryClone) {
    if (feeBased === 'all') return defaultQueryClone;
    defaultQueryClone.query.bool.must.push({
      'match': {
        'clientFeeBased': feeBased
      }
    });
    return defaultQueryClone;
  }

  filterByShowActiveClients(showActiveClients, defaultQueryClone) {
    switch (showActiveClients) {
    case 'active':
      defaultQueryClone.query.bool.must.push({
        'match': {
          'clientActive': true
        }
      });
      break;
    case 'inactive':
      defaultQueryClone.query.bool.must.push({
        'match': {
          'clientActive': false
        }
      });
      break;
    case 'all':
    default:
      break;
    }
    return defaultQueryClone;
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
    for (let clientNameBucket of queryResult.body.aggregations.clientName.buckets) {

      let parsedObject = {
        clientName: clientNameBucket.key
      };

      for(let clientTierBucket of clientNameBucket.clientTier.buckets) {

        parsedObject.clientTier = clientTierBucket.key;

        for(let clientFeeBasedBucket of clientTierBucket.clientFeeBased.buckets) {

          parsedObject.clientFeeBased = (clientFeeBasedBucket.key === 'true') ? 'Yes' : 'No';

          for (let monthToDisplay of monthsToDisplay) {
            let monthBucket = clientFeeBasedBucket.months.buckets.find(monthBucket => monthToDisplay === moment.utc(monthBucket.key_as_string).format('YYYY-MM'));
            parsedObject['orderCommissionSum_' + monthToDisplay] = monthBucket ? monthBucket.orderCommissionSum.value : 0;
            parsedObject['orderCommissionSum_GBP_' + monthToDisplay] = monthBucket ? monthBucket.orderCommissionSum_GBP.value : 0;
            parsedObject['orderCommissionSum_USD_' + monthToDisplay] = monthBucket ? monthBucket.orderCommissionSum_USD.value : 0;
            parsedObject['orderCommissionSum_EUR_' + monthToDisplay] = monthBucket ? monthBucket.orderCommissionSum_EUR.value : 0;
            parsedObject['orderCommissionSum_ClientCountryCurrency_' + monthToDisplay] = monthBucket ? monthBucket.orderCommissionSum_ClientCountryCurrency.value : 0;
            parsedObject['clientCountryCurrencyCode'] = monthBucket ? monthBucket.clientCountryCurrencyCode.buckets[0].key : 0;
          }

        }
      }

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

const commissionsByMonthQueryComposer = new CommissionsByMonthQueryComposer();

module.exports = commissionsByMonthQueryComposer;