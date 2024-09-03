
const _moment = require('moment');
const _elasticsearch = require('@elastic/elasticsearch');
var useragent = require('useragent');

const utility = require('./../../common/utility');
const config = require('../../config/config');

let _safeTimeout = 10000;

const elasticSearchUrl = `${config.BI.ELASTICSEARCH.URL}${(config.BI.ELASTICSEARCH.PORT) ? ':' + config.BI.ELASTICSEARCH.PORT : '' }/`;
const elasticsearchClient = new _elasticsearch.Client( {node: elasticSearchUrl });

const sendDataToElasticSearch = (msg) => {

  return Promise.race(
    [
      elasticsearchClient.index({
        index: `soreto_live_${msg.data.type}_${_moment().format('YYYY_MM_DD')}`,
        body: {
          meta: vanishInfo(msg.data.meta),
          date: _moment(),
          type: msg.data.type
        }
      })
      ,
      new Promise((resolve, reject) => {
        setTimeout(() => { reject('Safe Seneca Timeout'); }, _safeTimeout);
      })
    ]);
};

/**
 * Fields to be removed
 */
let fieldsToDelete = [
  'cookies', 'lineItems', 'BACK_URL', 'FRONT_URL', '_clientId', '_dimensions',
  '_showLightbox', '_lightboxOriginUrlRestriction', 'clientSettings', 'allowedOriginUrl',
  'sessionId', 'ip', 'ipAddress', 'voucherCode'];

/**
 * fields to mask
 */
let fieldsToMask = [ 'orderId', 'firstName' ];

let fieldsToMaskInherited = {
  'Order' : {
    field : 'id'
  }
};

/**
 * Vanish object
 * @param {*} data
 */
const vanishInfo = (data) => {

  try {

    let recursion = (data, childOf) => {

      // iterate over all object keys
      for(let key in data){

        // this prop should be deleted?
        if(fieldsToDelete.includes(key)){

          delete data[key];

          continue;
        }

        // is this property vakue a sub object?
        if(getType(data[key]) == 'object'){
          recursion(data[key], key);

          continue;
        }

        // mask email
        if(key.includes('mail')){

          data[key] = utility.maskEmailAddress(data[key]);

          continue;
        }

        // generic mask
        if(fieldsToMask.includes(key) ||
            (fieldsToMaskInherited[childOf] &&
                fieldsToMaskInherited[childOf].field == key)){

          data[key] = mask(data[key]);

          continue;
        }

        // parse user agent
        if(key == 'userAgent' || key == 'user-agent'){
          data[key] = useragent.parse(data[key]);
        }

        // set type to string
        if(data[key] !== undefined
            && data[key] !== null
            && getType(data[key]) != 'string'){
          data[key] = data[key].toString();
        }
      }
    };

    recursion(data, null);

  } catch (error) {
    console.error('Error vanishing data', data);
    return {
      message: `Data could not be vanished`,
      error: error
    };
  }

  return data;
};

const getType = (p) => {
  if (Array.isArray(p)) return 'array';
  else if (typeof p == 'string') return 'string';
  else if (!isNaN(p)) return 'number';
  else if (p != null && typeof p == 'object') return 'object';
  else return 'other';
};

const mask = (data) => {

  try {

    switch(getType(data)){
    case 'array':
    case 'object':
      data = JSON.stringify(data);
      break;
    case 'number':
      data = data.toString();
      break;
    case 'other' :
      data = 'data could not be masked';
      return data;
    }

    let hidePart = '';

    if(data.length <= 4){
      hidePart = data;
    }else if(data.length == 5){
      hidePart = data.substring(1, 4);
    }else if (data.length > 5 && data.length < 9){
      hidePart = data.substring(2, data.length - 2);
    }else {
      hidePart = data.substring(3, data.length - 3);
    }

    data = data.replace(hidePart, 'X'.repeat(hidePart.length));
  }catch (error){
    data = `Error masking data: ${error}`;
  }

  return data;
};

module.exports = {
  sendDataToElasticSearch
};
