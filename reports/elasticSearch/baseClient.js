const config = require('../../config/config.js');
const elasticsearch = require('@elastic/elasticsearch');


const start = function (indexes){
  let elasticSearchUrl = `${config.BI.ELASTICSEARCH.URL}${(config.BI.ELASTICSEARCH.PORT) ? ':' + config.BI.ELASTICSEARCH.PORT :''}/`;
  return new elasticsearch.Client( {node: elasticSearchUrl + indexes.map(i => `${i}_${config.BI.ELASTICSEARCH.INDEX_SUFIX}`).join(',') });
};

const startTracking = function (indexes){
  let elasticSearchUrl = `${config.BI.ELASTICSEARCH.URL}${(config.BI.ELASTICSEARCH.PORT) ? ':' + config.BI.ELASTICSEARCH.PORT :''}/`;
  return new elasticsearch.Client( {node: elasticSearchUrl + indexes.map(i => i).join(',') });
};

const recursiveParser = (obj) => {
  let parsedObj = {};
  for (const key in obj) {
    const node = obj[key];

    if(node.value || node.value == 0){
      parsedObj[key] = node.value;
    }else if(node.buckets){
      parsedObj[key] = [];
      for (const bucket of node.buckets) {
        parsedObj[key].push(recursiveParser(bucket, {}));
      }
    }else if(key == 'key_as_string'){
      parsedObj.name = node;
    }else if (key == 'key' && !parsedObj.name){
      parsedObj.name = node;
    }
  }

  return parsedObj;
};

module.exports = { start, startTracking, recursiveParser } ;
