const config = require('../config/config.js');

let _query = null;
let _q = null;
let _indexPattern = null;
let _sortField = null;
let _limits = {
  startDate: '',
  endDate: '',
  page: '',
  size: ''
};

const _elasticsearch = require('@elastic/elasticsearch');
let _elasticsearchClient = null;

//
// available method exposed
//
module.exports = {

  start(){

    let elasticSearchUrl = `${config.BI.ELASTICSEARCH.URL}${(config.BI.ELASTICSEARCH.PORT) ? ':' + config.BI.ELASTICSEARCH.PORT :''}/`;

    _elasticsearchClient = new _elasticsearch.Client( {node: elasticSearchUrl });

    return this;
  },
  freeString(freeString){
    _q = freeString;
    return this;
  },
  query(query){

    if(query){
      try{
        _query = JSON.parse(query);
      }catch(err){
        throw `Query parameter is not a valid JSON`;
      }
    }

    return this;
  },
  indexPattern(pattern){
    _indexPattern = pattern;

    return this;
  },
  limits(startDate, endDate, page, size){

    _limits.startDate = startDate;
    _limits.endDate = endDate;
    _limits.page = page;
    _limits.size = size;

    return this;
  },
  sort(sortField) {
    _sortField = sortField;

    return this;
  },
  go(){

    if(!_elasticsearchClient){
      throw `Elasticsearch client not started, call start() method before search.`;
    }

    let req = {
      index: _indexPattern,
      from: _limits.page || 1,
      size: _limits.size || 10,
      sort: _sortField,
      body : {}
    };

    if(_query) req.body.query = _query;
    if(_q) req.q = _q;

    return _elasticsearchClient.search(req);
  }
};