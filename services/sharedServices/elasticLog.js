const _ = require('lodash');
const _moment = require('moment');
const _elasticsearch = require('@elastic/elasticsearch');

const config = require('../../config/config');
const constants = require('../../config/constants');
const msClient = require('../../common/senecaClient');

let _safeTimeout = 15000;

const elasticSearchUrl = `${config.BI.ELASTICSEARCH.URL}${(config.BI.ELASTICSEARCH.PORT) ? ':' + config.BI.ELASTICSEARCH.PORT : '' }/`;
const elasticsearchClient = new _elasticsearch.Client( {node: elasticSearchUrl });

const logOnElastic = (message, meta, type) => {

  msClient.act(_.extend(constants.EVENTS.SEND_ELK_LOG_DATA,
    {
      data: { message, meta, type }
    }
  ));
};

const logOnElasticEvent = (msg) => {

  return Promise.race(
    [
      elasticsearchClient.index({
        index: `log_${_moment().format('YYYY_MM_DD')}`,
        body: {
          log: msg.data.message,
          meta: msg.data.meta,
          date: _moment(),
          type: msg.data.type || 'generic'
        }
      })
      ,
      new Promise((resolve, reject) => {
        setTimeout(() => { reject('Safe Seneca Timeout'); }, _safeTimeout);
      })
    ]);
};

module.exports = { logOnElastic, logOnElasticEvent };
