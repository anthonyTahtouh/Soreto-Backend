const _ = require('lodash');
const _moment = require('moment');
const _elasticsearch = require('@elastic/elasticsearch');
const _config = require('../config/config.js');

let _query = null;
let _statsQuery = null;
let _pickedBaseSearch = null;
let _groupLevels = null;
let _fields = null;
let _additionalFields = null;
let _ignoredIndexes = null;
let _ignoreZeroResult = null;
let _exceptFields = null;
let _filters = null;
let _customParams = {};
let _sortField = {};
let _apiVersion = 1;
let _debugMode = false;
let _clientStarted = false;
let _limits = {
  startDate: '',
  endDate: '',
  page: '',
  size: ''
};
let _elasticsearchClient = null;

//
// all available queries in this library
//
const availableQueries  = {'stats' : { 'name' : 'stats' }, 'byChannel' : { 'name' : 'byChannel' }};

//
// available method exposed
//
module.exports = {

  which(name){

    i_resetVariables();
    _query = name;

    return this;
  },
  start(){

    // Basic validation
    if(!_query){
      throw 'Before call Start() method you should set the query name you want by calling which() method.';
    }

    _statsQuery = JSON.parse(JSON.stringify(_statsQueryDefault));

    let elasticSearchUrl = `${config().ELASTICSEARCH.URL}${(config().ELASTICSEARCH.PORT) ? ':' + config().ELASTICSEARCH.PORT :''}/`;

    let indexes = getQueryIndexes(_query);

    _elasticsearchClient = new _elasticsearch.Client( {node: elasticSearchUrl + indexes });

    _clientStarted = true;

    return this;
  },
  groupLevels(levels){

    _groupLevels = levels;

    return this;
  },
  fields(fields, extraFields, exceptFields){

    _fields = fields;
    _exceptFields = exceptFields;
    _additionalFields = extraFields;

    return this;
  },
  filters(filters){
    _filters = filters;

    return this;
  },
  customParams(customParams){
    _customParams = customParams;

    return this;
  },
  sort(sortField) {
    _sortField = sortField;

    return this;
  },
  limits(startDate, endDate, page, size){

    _limits.startDate = startDate;
    _limits.endDate = endDate;
    _limits.page = page;
    _limits.size = size;

    return this;
  },
  apiVersion(apiVersion){

    if(_clientStarted == true){
      throw 'The API version must be set before start() method.';
    }
    if(isNaN(apiVersion)){
      throw 'The API version must be a number, 1 or 2';
    }

    apiVersion = Number(apiVersion);

    if(apiVersion < 1 || apiVersion > 2){
      throw 'The API version must be 1 or 2';
    }

    _apiVersion = apiVersion;

    return this;
  },
  debug() {

    _debugMode = true;

    return this;
  },
  ignoreIndexes(indexes){
    _ignoredIndexes = indexes;
    return this;
  },
  ignoreZeroResult(ignore){

    // Basic validation
    if(_clientStarted === true){
      throw 'ignoreZeroResult() method should be called before start() method.';
    }

    _ignoreZeroResult = ignore;
    _ignoredIndexes = ignore === true ? ['soreto_stats_base'] : [];
    return this;
  },
  go() {

    if(!_elasticsearchClient){
      throw `Elasticsearch client not started, call start() method before search.`;
    }

    try {

      // build pipeline
      setBaseQuerySearch(_query);
      setQueryGroupLevels(_groupLevels);
      setQueryFields(_fields, _additionalFields, _exceptFields);
      setQueryFilters(_filters);
      setQuerySortField(_sortField);
      setQueryLimits(_limits);

    }catch(err){

      throw `An error ocurred setting your query up to search. Make sure that all the parameters are right: ${err}`;
    }

    if(_debugMode === true){

      console.log('SEARCH');
      console.log(JSON.stringify(_pickedBaseSearch));
    }

    // run search
    return _elasticsearchClient
      .search({ body : finalBody(_pickedBaseSearch) })
      .then((result) => {
        return handleResult(result);
      })
      .catch((error) => {
        console.error(error);
      });
  },
  queries : availableQueries
};

const config =() => {
  return _apiVersion == 1 ? _config.BI : _config.BI2;
};

const setBaseQuerySearch = (name) => {

  // get if the passed parameter 'name' matches one of the available queries
  let allowedQuery = availableQueries[name];

  // inital basic validation
  // if the name is not in the list, throw an exception
  if(!allowedQuery){
    throw 'Invalid query base name. Please use which() method to set it';
  }

  switch(name){
  case availableQueries.stats.name:
    _pickedBaseSearch = _.cloneDeep(_statsQuery.baseSearch);
    break;
  case availableQueries.byChannel.name:
    _pickedBaseSearch = _.cloneDeep(byChannelQuery.baseSearch);
    break;
  default:
    throw 'Invalid query base name';
  }
};

const setQueryGroupLevels = (levels) => {

  switch(_pickedBaseSearch.custom.name){

  case availableQueries.stats.name:
  case availableQueries.byChannel.name:

    // 'clientName' level is required by default
    _pickedBaseSearch.aggs.main.composite.sources.push({ 'clientName':   { 'terms': {'field': 'clientName'} } });

    if(!levels || levels.length == 0){
      return;
    }

    _pickedBaseSearch.aggs.return_total.cardinality = {
      script: {
        source: `doc['clientName'].value`,
        lang: 'painless'
      }
    };

    for(let level of levels){

      // ignore 'clientName' loop
      if(level == 'clientName'){
        continue;
      }

      if (level === 'monthly') {

        _pickedBaseSearch.aggs.main.composite.sources.push({
          'eventDateTerm': {
            'terms': {
              'script': {
                'source' : `doc['eventDateTerm'].value.substring(0, 7)`,
                'lang' : 'painless'
              }
            }
          }
        });

        _pickedBaseSearch.aggs.return_total.cardinality.script.source += ` + doc['eventDateTerm'].value.substring(0, 7)`;
      } else {

        _pickedBaseSearch.aggs.main.composite.sources.push({ [level]:   { 'terms': {'field': level} } });
        _pickedBaseSearch.aggs.return_total.cardinality.script.source += ` + doc['${level}']`;
      }
    }

    break;
  }
};

const setQueryFields = (fields, extraFields, exceptFields) => {

  let selectedFields = {};

  switch(_pickedBaseSearch.custom.name){

  case availableQueries.stats.name:

    if(fields){

      for(let field of fields){

        if(_statsQuery.groupFields[field]){
          _.assign(selectedFields, _statsQuery.groupFields[field]);
        }else{
          throw `The field: ${field} is not available for the selected query`;
        }
      }

    }else{
      selectedFields = _statsQuery.groupFields;
    }

    if(extraFields){

      if(_customParams.clientLaunchDiffDaysBaseDate){
        _extraFields.clientLaunchDiffDays.max.script.params.baseDate = _moment(_customParams.clientLaunchDiffDaysBaseDate).valueOf();
      }

      for(let extraField of extraFields){
        _statsQuery.groupFields[extraField] = _extraFields[extraField];

        if([
          'deviceType',
          'deviceOS',
          'deviceBrowser',
          'sharePlaceDeviceType',
          'sharePlaceDeviceOS',
          'sharePlaceDeviceBrowser'].includes(extraField)){
          _statsQuery.compositeLevels.push(extraField);
        }
      }

    }else {
      selectedFields = _statsQuery.groupFields;
    }

    if(exceptFields){

      for(let field of exceptFields){

        if(selectedFields[field]){
          delete selectedFields[field];
        }
      }
    }

    _.assign(_pickedBaseSearch.aggs.main.aggs, selectedFields);

    break;

  case availableQueries.byChannel.name:
    // 'Not supported for the selected query';
    break;
  }
};

const setQuerySortField = (sortField) => {

  let joinableSort = false;
  let ascSortDIrection = true;
  let literalSortDirection = '';

  // if sortfield was not defined
  // set the default ordenation
  if(!sortField){
    return;
    //sortField = 'clientName';
  }

  switch(_pickedBaseSearch.custom.name){

  case availableQueries.stats.name:

    ascSortDIrection = !sortField.includes('-');
    sortField = sortField.replace('-', '');

    joinableSort = _.some(_statsQuery.compositeLevels, (co) => co == sortField);

    literalSortDirection = ascSortDIrection ? 'asc' : 'desc';

    if(joinableSort){

      // from the existent composite source
      // get the one that needs to be used as sort
      let sortSourceIndex = _.findIndex(_pickedBaseSearch.aggs.main.composite.sources, (s) => s[sortField] != null );

      // validates if the field exists in the search
      // preventing null reference
      if(sortSourceIndex == -1){
        return;
      }

      let sortSource = _.cloneDeep(_pickedBaseSearch.aggs.main.composite.sources[sortSourceIndex]);

      sortSource[sortField].terms.order = literalSortDirection;

      _pickedBaseSearch.aggs.main.composite.sources.splice(sortSourceIndex, 1);
      _pickedBaseSearch.aggs.main.composite.sources.unshift(sortSource);


    }else{

      // if it is not a a joinable sorte
      // means we must set sort for fields
      if(_statsQuery.groupFields[sortField]){

        _pickedBaseSearch.aggs.main.aggs.final_sort.bucket_sort['sort'] = [{ [sortField] : {'order': literalSortDirection}}];

      }else{
        throw `The sort field is not available for this query`;
      }
    }

    break;

  case availableQueries.byChannel.name:
    // 'Not supported for the selected query';
    break;
  }
};

const setQueryFilters = (filters) => {

  let query = { bool : { must : [], must_not : [] } };
  let shouldTextFilters = { bool : { should : [] } };

  if(!filters || filters.length == 0){
    return;
  }

  for(let filter of filters){

    var field = '';
    var value = '';

    try{
      field = Object.keys(filter)[0];
      value = Object.values(filter)[0];
    }catch(err){
      throw `Error parsing filter keys, maybe they were malformed: ${JSON.stringify(filter)}`;
    }

    let valIsString = (typeof value === 'string' || value instanceof String);
    let valIsArray = (value instanceof Array);
    if (valIsArray) {
      let shouldFilters = { bool : { should : [] } };
      for (let item of value) {
        shouldFilters.bool.should.push({ match : {[field]: item } });
      }

      query.bool.must.push(shouldFilters);

    } else if (valIsString && value.includes('*')){
      shouldTextFilters.bool.should.push({ wildcard: {[field]: {value: value }}});
    }
    else if (field.includes('_$')){

      let rawField = field.split('_$')[0];
      let gratherThan = field.split('_$')[1].includes('gt');
      let lessThan = field.split('_$')[1].includes('lt');
      let literalDirection = (gratherThan) ? 'gte' : (lessThan ? 'lte' : '');

      if(_statsQuery.groupFields[rawField]){

        _pickedBaseSearch.aggs.main.aggs.final_filter = {
          bucket_selector: {
            buckets_path: {
              [rawField]: rawField
            },
            gap_policy : 'skip',
            script: `params.${rawField} ${literalDirection == 'gte'? '>=' : '<='} ${value}`
          }
        };

        continue;

      }else {
        query.bool.must.push({ range: { [rawField] : { [literalDirection] : value } } });
      }
    }
    else{

      if(valIsString && value == '-1' ){

        query.bool.must_not.push({ exists : { field : field } });

      }else if(field.includes('_EXCEPT')){

        let rawField = field.split('_EXCEPT')[0];
        query.bool.must_not.push({ match : { [rawField] : value } });

      }else{
        query.bool.must.push({ match : filter });
      }
    }
  }

  if(shouldTextFilters.bool.should.length > 0){
    query.bool.must.push(shouldTextFilters);
  }

  // in order not to bring rows with zero values
  // add extra filters
  if(_ignoreZeroResult){
    query.bool.must.push(filterOrdersNoMainValue);
    query.bool.must.push(filterClicksNoMainValue);

    query.bool.must_not.push({ match: { trackingType : 'voucher-page-cta'} });
    query.bool.must_not.push({ match: { trackingType : 'voucher-page-loaded'} });
  }

  if(query.bool.must.length == 0){
    delete query.bool.must;
  }
  if(query.bool.must_not.length == 0){
    delete query.bool.must_not;
  }

  _pickedBaseSearch['query'] = query;
};

const setQueryLimits = (limits) => {

  if(!limits.endDate){
    limits.endDate = _moment();
  }

  if(!limits.startDate){
    limits.startDate = _moment(limits.endDate).subtract(60, 'days');
  }

  if(!limits.page){
    limits.page = 0;
  }

  if(!limits.size){
    limits.size = 10;
  }

  setQueryEventRange(limits.startDate, limits.endDate);
  setQueryPagination(limits.page, limits.size);
};

const setQueryEventRange = (startDate, endDate) => {

  // check if query already exists
  if(!_.get(_pickedBaseSearch, 'query.bool.must')){

    if(!_.get(_pickedBaseSearch, 'query')){

      _pickedBaseSearch['query'] = {};
      _pickedBaseSearch['query']['bool'] = {};
    }else if (!_.get(_pickedBaseSearch, 'query.bool')){

      _pickedBaseSearch['query']['bool'] = {};
    }

    _pickedBaseSearch['query']['bool']['must'] = [];
  }

  _pickedBaseSearch.query.bool.must.push(i_composeEventRange(startDate, endDate));
};

const setQueryPagination = (page, size) => {

  switch(_pickedBaseSearch.custom.name){

  case availableQueries.stats.name:

    _pickedBaseSearch.aggs.main.aggs.final_sort.bucket_sort.from = page;
    _pickedBaseSearch.aggs.main.aggs.final_sort.bucket_sort.size = size;
    break;

  case availableQueries.byChannel.name:
    // 'Not supported for the selected query';
    break;
  }
};

const i_composeEventRange = (startDate, endDate) => {

  return {
    range: {
      eventDate: {
        format: 'strict_date_optional_time',
        gte : startDate ,
        lte : endDate
      }
    }
  };
};

const i_resetVariables = () => {

  _groupLevels =
  _fields =
  _ignoredIndexes =
  _ignoreZeroResult =
  _exceptFields =
  _filters =
  _elasticsearchClient = null;

  _sortField = {};
  _debugMode = false;
  _clientStarted = false;

  _limits = {
    startDate: '',
    endDate: '',
    page: '',
    size: ''
  };

  return;
};

const finalBody = () => {

  let pickedBaseSearchCopy = _.cloneDeep(_pickedBaseSearch);

  delete pickedBaseSearchCopy.custom;

  setBaseQuerySearch(_query);

  return pickedBaseSearchCopy;
};

const customHandler = (key , item) => {

  switch (key) {
  case 'clientCountryCurrencyCode':
  case 'clientCountry':
  case 'clientResponsibleName':

    if(item.buckets && item.buckets.length > 0){
      return item.buckets[0].key;
    }

    return '';
  case 'soretoSalesRepeated':

    if(item.buckets && item.buckets.length > 0){

      // search for the "true" part
      let trueRepeated = item.buckets.find(i => i.key_as_string == 'true');

      // search for the "false" part
      let falseRepeated = item.buckets.find(i => i.key_as_string == 'false');

      return  {
        repeated_soretoSales : _.get(trueRepeated, 'soretoSales.value') || 0,
        new_soretoSales : _.get(falseRepeated, 'soretoSales.value') || 0,
        repeated_totalValueSales : _.get(trueRepeated, 'totalValueSales.value') || 0,
        new_totalValueSales : _.get(falseRepeated, 'totalValueSales.value') || 0,
        repeated_totalValueSales_GBP : _.get(trueRepeated, 'totalValueSales_GBP.value') || 0,
        new_totalValueSales_GBP : _.get(falseRepeated, 'totalValueSales_GBP.value') || 0,
        repeated_totalValueSales_USD : _.get(trueRepeated, 'totalValueSales_USD.value') || 0,
        new_totalValueSales_USD : _.get(falseRepeated, 'totalValueSales_USD.value') || 0,
        repeated_totalValueSales_EUR : _.get(trueRepeated, 'totalValueSales_EUR.value') || 0,
        new_totalValueSales_EUR : _.get(falseRepeated, 'totalValueSales_EUR.value') || 0,
        repeated_totalValueSales_ClientCountryCurrency : _.get(trueRepeated, 'totalValueSales_ClientCountryCurrency.value') || 0,
        new_totalValueSales_ClientCountryCurrency : _.get(falseRepeated, 'totalValueSales_ClientCountryCurrency.value') || 0,
        repeated_salesCommission : _.get(trueRepeated, 'salesCommission.value') || 0,
        new_salesCommission : _.get(falseRepeated, 'salesCommission.value') || 0,
        repeated_salesCommission_GBP : _.get(trueRepeated, 'salesCommission_GBP.value') || 0,
        new_salesCommission_GBP : _.get(falseRepeated, 'salesCommission_GBP.value') || 0,
        repeated_salesCommission_USD : _.get(trueRepeated, 'salesCommission_USD.value') || 0,
        new_salesCommission_USD : _.get(falseRepeated, 'salesCommission_USD.value') || 0,
        repeated_salesCommission_EUR : _.get(trueRepeated, 'salesCommission_EUR.value') || 0,
        new_salesCommission_EUR : _.get(falseRepeated, 'salesCommission_EUR.value') || 0,
        repeated_salesCommission_ClientCountryCurrency : _.get(trueRepeated, 'salesCommission_ClientCountryCurrency.value') || 0,
        new_salesCommission_ClientCountryCurrency : _.get(falseRepeated, 'salesCommission_ClientCountryCurrency.value') || 0
      };
    }

    return '';

  default:
    return null;
  }
};

const handleResult = (result) => {

  switch(_query){
  case availableQueries.byChannel.name:
  case availableQueries.stats.name:

    try{

      let baseArray = result.body.aggregations.main.buckets;
      let totalResults = result.body.aggregations.return_total.value;

      for(let item of baseArray){

        for(let key in item.key){

          item[key.replace('.keyword', '')] = item.key[key];

          delete item.key[key];
        }

        delete item.key;

        for(let key in item){

          let custom = customHandler(key, item[key]);

          if(custom !== null){
            item[key] = custom;

            continue;
          }

          if(_.has(item[key], 'value')){
            item[key] = item[key].value;
          }
        }
      }

      let metaData = {
        totalResults : totalResults,
        totalPages: totalResults / _limits.size
      };

      return { data : baseArray, metaData : metaData };

    }catch(error){
      throw `Somenthing went worng parsing the API result: ${error}`;
    }
  default:
    throw 'Invalid query base name';
  }

};

const getQueryIndexes = (which) => {

  let ind = null;
  switch(which){
  case availableQueries.stats.name:
    ind = _.difference(_statsQuery.indexes, _ignoredIndexes);
    break;
  case availableQueries.byChannel.name:
    ind = byChannelQuery.indexes;
    break;
  default:
    throw 'Invalid query base name';
  }

  return ind.map(i => `${i}_${config().ELASTICSEARCH.INDEX_SUFIX}`).join(',');
};

//
// stats query
//
let _statsQueryDefault = {

  indexes : [
    'soreto_stats_base',
    'soreto_stats_order',
    'soreto_stats_tracking',
    'soreto_stats_social_post'],
  compositeLevels : ['eventDateTerm', 'campaignVersionName', 'campaignVersionAlias', 'campaignName', 'clientName', 'campaignCountryName', 'clientIndustry' ],
  groupFields : {

    clientActive: {
      max: {
        field: 'clientActive'
      }
    },
    socialPostSocialPlatform: {
      terms: {
        field: 'socialPostSocialPlatform',
        size: 1
      }
    },

    campaignVersionSourceTagGroup: {
      terms: {
        field: 'campaignVersionSourceTagGroup'
      }
    },
    clientCountry: {
      terms: {
        field: 'clientCountryName',
        size: 1
      }
    },
    clientCountryCurrencyCode: {
      terms: {
        field: 'clientCountryCurrencyCode',
        size: 1
      }
    },
    clientIndustry: {
      terms: {
        field: 'clientIndustry',
        size: 1
      }
    },
    clientSales: {
      sum: {
        field: 'trackingClientSalesCount'
      }
    },
    shares: {
      sum: {
        field: 'socialPostCount'
      }
    },
    refClicks: {
      sum: {
        field: 'trackingClicksCount'
      }
    },
    interstitialLoads: {
      sum: {
        field: 'trackingSoretoClicksCount'
      }
    },
    refClicksUntracked :
    {
      sum: {
        field: 'trackingExternalClicksUntrackedCount'
      }
    },
    interstitialClicks: {
      sum: {
        field: 'trackingSoretoTrafficCount'
      }
    },
    soretoSales: {
      sum: {
        field: 'orderCount'
      }
    },
    pendingSalesCount: {
      sum: {
        field: 'orderPendingCount'
      }
    },
    paidSalesCount: {
      sum: {
        field: 'orderPaidCount'
      }
    },
    declinedSalesCount: {
      sum: {
        field: 'orderCancelledCount'
      }
    },
    totalValueSales:{
      sum: {
        field: 'orderTotalSum'
      }
    },
    totalValueSales_GBP:{
      sum: {
        field: 'orderTotalSum_GBP'
      }
    },
    totalValueSales_USD:{
      sum: {
        field: 'orderTotalSum_USD'
      }
    },
    totalValueSales_EUR:{
      sum: {
        field: 'orderTotalSum_EUR'
      }
    },
    totalValueSales_ClientCountryCurrency:{
      sum: {
        field: 'orderTotalSum_ClientCountryCurrency'
      }
    },
    salesCommission: {
      sum: {
        field: 'orderCommissionSum'
      }
    },
    salesCommission_GBP: {
      sum: {
        field: 'orderCommissionSum_GBP'
      }
    },
    salesCommission_USD: {
      sum: {
        field: 'orderCommissionSum_USD'
      }
    },
    salesCommission_EUR: {
      sum: {
        field: 'orderCommissionSum_EUR'
      }
    },
    salesCommission_ClientCountryCurrency: {
      sum: {
        field: 'orderCommissionSum_ClientCountryCurrency'
      }
    },
    pendingSalesCommission: {
      sum: {
        field: 'orderCommissionPendingSum'
      }
    },
    paidSalesCommission: {
      sum: {
        field: 'orderCommissionPaidSum'
      }
    },
    declinedSalesCommission: {
      sum: {
        field: 'orderCommissionCancelledSum'
      }
    },
    pendingSalesCommission_GBP: {
      sum: {
        field: 'orderCommissionPendingSum_GBP'
      }
    },
    paidSalesCommission_GBP: {
      sum: {
        field: 'orderCommissionPaidSum_GBP'
      }
    },
    declinedSalesCommission_GBP: {
      sum: {
        field: 'orderCommissionCancelledSum_GBP'
      }
    },
    pendingSalesCommission_USD: {
      sum: {
        field: 'orderCommissionPendingSum_USD'
      }
    },
    paidSalesCommission_USD: {
      sum: {
        field: 'orderCommissionPaidSum_USD'
      }
    },
    declinedSalesCommission_USD: {
      sum: {
        field: 'orderCommissionCancelledSum_USD'
      }
    },
    pendingSalesCommission_EUR: {
      sum: {
        field: 'orderCommissionPendingSum_EUR'
      }
    },
    paidSalesCommission_EUR: {
      sum: {
        field: 'orderCommissionPaidSum_EUR'
      }
    },
    declinedSalesCommission_EUR: {
      sum: {
        field: 'orderCommissionCancelledSum_EUR'
      }
    },
    pendingSalesCommission_ClientCountryCurrency: {
      sum: {
        field: 'orderCommissionPendingSum_ClientCountryCurrency'
      }
    },
    paidSalesCommission_ClientCountryCurrency: {
      sum: {
        field: 'orderCommissionPaidSum_ClientCountryCurrency'
      }
    },
    declinedSalesCommission_ClientCountryCurrency: {
      sum: {
        field: 'orderCommissionCancelledSum_ClientCountryCurrency'
      }
    },
    shareRate: {
      bucket_script: {
        buckets_path: {
          lShares: 'shares',
          ltotalSales: 'clientSales'
        },
        script: {
          lang: 'painless',
          source: 'if(params.ltotalSales == null || params.ltotalSales == 0) { 0.0 } else { (params.lShares / params.ltotalSales) * 100 }'
        }
      }
    },
    reachMultiple: {
      bucket_script: {
        buckets_path: {
          lShares: 'shares',
          lRefClicks: 'refClicks'
        },
        script: {
          lang: 'painless',
          source: 'if(params.lShares == null || params.lShares == 0) { 0.0 } else { (params.lRefClicks / params.lShares) }'
        }
      }
    },
    purchaseRate: {
      bucket_script: {
        buckets_path: {
          lIntClicks: 'interstitialClicks',
          lSoretoSales: 'soretoSales'
        },
        script: {
          lang: 'painless',
          source: 'if(params.lIntClicks == null || params.lIntClicks == 0) { 0.0 } else { (params.lSoretoSales / params.lIntClicks) * 100 }'
        }
      }
    },
    conversionRate: {
      bucket_script: {
        buckets_path: {
          lRefClicks: 'refClicks',
          lSoretoSales: 'soretoSales'
        },
        script: {
          lang: 'painless',
          source: 'if(params.lRefClicks == null || params.lRefClicks == 0) { 0.0 } else { (params.lSoretoSales / params.lRefClicks) * 100 }'
        }
      }
    }
  },
  baseSearch : {
    aggs : {
      return_total : {
        cardinality : {
          field : 'clientName'
        }
      },
      main: {
        composite : {
          size: 100000,
          sources : []
        },
        aggs:{
          final_sort : {
            bucket_sort: {
              size : 10,
              from: 0
            }
          }
        }
      }
    },
    size: 0,
    custom : {
      name : availableQueries.stats.name
    }
  }
};

//
// byChannel query
//
let byChannelQuery = {

  indexes : ['soreto_stats_base','soreto_stats_order','soreto_stats_tracking','soreto_stats_social_post'],
  compositeLevels : ['eventDateTerm', 'socialPostSocialPlatform' ],
  baseSearch : {
    aggs: {
      return_total: {
        cardinality: {
          field: 'clientName'
        }
      },
      main: {
        composite: {
          size: 10000,
          sources: []
        },
        aggs: {
          shares: {
            sum: {
              field: 'socialPostCount'
            }
          },
          clicks : {
            sum : {
              field : 'trackingClicksCount'
            }
          },
          sales: {
            sum: {
              field: 'orderCount'
            }
          }
        }
      }
    },
    size: 0,
    custom : {
      name : availableQueries.byChannel.name
    }
  }
};

let _extraFields = {
  clientResponsibleName : {
    terms: {
      field: 'clientResponsibleName',
      size: 1
    }
  },
  deviceType: {
    terms: {
      field: 'deviceType',
      size: 1
    }
  },
  deviceOS: {
    terms: {
      field: 'deviceOS',
      size: 1
    }
  },
  deviceBrowser: {
    terms: {
      field: 'deviceBrowser',
      size: 1
    }
  },
  sharePlaceDeviceType: {
    terms: {
      field: 'sharePlaceDeviceType',
      size: 1
    }
  },
  sharePlaceDeviceOS: {
    terms: {
      field: 'sharePlaceDeviceOS',
      size: 1
    }
  },
  sharePlaceDeviceBrowser: {
    terms: {
      field: 'sharePlaceDeviceBrowser',
      size: 1
    }
  },
  soretoSalesRepeated: {
    terms: {
      field: 'repeated',
      size: 2
    },
    aggs: {
      soretoSales: {
        sum: {
          field: 'orderCount'
        }
      },
      totalValueSales:{
        sum: {
          field: 'orderTotalSum'
        }
      },
      totalValueSales_GBP:{
        sum: {
          field: 'orderTotalSum_GBP'
        }
      },
      totalValueSales_USD:{
        sum: {
          field: 'orderTotalSum_USD'
        }
      },
      totalValueSales_EUR:{
        sum: {
          field: 'orderTotalSum_EUR'
        }
      },
      salesCommission: {
        sum: {
          field: 'orderCommissionSum'
        }
      },
      salesCommission_GBP: {
        sum: {
          field: 'orderCommissionSum_GBP'
        }
      },
      salesCommission_USD: {
        sum: {
          field: 'orderCommissionSum_USD'
        }
      },
      salesCommission_EUR: {
        sum: {
          field: 'orderCommissionSum_EUR'
        }
      }
    }
  },
  clientLaunchDiffDays: {
    max: {
      script: {
        params: {
          baseDate: _moment().unix()
        },
        lang: 'painless',
        source: 'if(doc.clientLaunchedAt.size() > 0) { (params.baseDate - doc.clientLaunchedAt.value.toInstant().toEpochMilli())/(1000 * (60*60*24)); }'
      }
    }
  },
  clientHolderName: {
    terms: {
      field: 'clientHolderName',
      size: 1
    }
  }
};

let filterOrdersNoMainValue = {

  bool: {
    should: [
      {
        bool: {
          must: [
            {
              match: {
                category: 'order'
              }
            },
            {
              range: {
                orderCount: {
                  gt: '0'
                }
              }
            }
          ]
        }
      },
      {
        bool: {
          must_not: [
            {
              match: {
                category: 'order'
              }
            }
          ]
        }
      }
    ]
  }
};

let filterClicksNoMainValue = {

  bool: {
    should: [
      {
        bool: {
          must: [
            {
              match: {
                trackingType: 'external-click'
              }
            },
            {
              range: {
                trackingClicksCount: {
                  gt: '0'
                }
              }
            }
          ]
        }
      },
      {
        bool: {
          must: [
            {
              match: {
                trackingType: 'lightbox-load'
              }
            },
            {
              range: {
                trackingClicksCount: {
                  gt: '0'
                }
              }
            }
          ]
        }
      },
      {
        bool: {
          must_not: [
            {
              match: {
                trackingType: 'external-click'
              }
            }
          ]
        }
      },
      {
        bool: {
          must_not: [
            {
              match: {
                trackingType: 'lightbox-load'
              }
            }
          ]
        }
      }
    ]
  }
};