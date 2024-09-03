'use strict';

const moment = require('moment');
var dbDynamo = require('../../db_dynamo');
var utilities = require('../../common/utility.js');
let config = require('../../config/config');

let _blockedIpsMapping = {};

//=========================
// Live in memory refresh
//
// In order to have this local variable mirroring the records on DynamoDB
// without the need to restart the application
//=========================
setInterval(() => {
  (new apiThrottling( )).load();
}, config.PLATFORM_SECURITY.API_THROTTLING.IN_MEMORY_REFRESH_FREQUENCY);

class apiThrottling {

  /**
   *
   * Creates the interaction record on DynamoDb
   *
   * @param {*} req
   * @returns
   */
  async in(req) {

    try {

      // validates if the feature is on
      if(!config.PLATFORM_SECURITY.API_THROTTLING.ENABLED){
        return;
      }

      let reqMeta = utilities.getRequestMeta(req);

      // prepares the record
      let record = {
        TableName: 'api-throttling',
        Item: {
          ip: { S: reqMeta.ipAddress },
          endpoint: { S: req.url},
          'event-timestamp': { N: moment().valueOf().toString() },
          date: { S: moment().toISOString() },
          referrer: {S: reqMeta.referer },
          agent: {S: reqMeta.userAgent || '' },
          extra: {M: {}},
          blocked: { BOOL: false },
          ttl: { N: moment().add(1, 'day').unix().toString() }
        },
      };

      // insert on dynamo db
      dbDynamo.putItem(record);

      // verify the usage limits
      this.mesureUsage(req);
    } catch (error) {
      console.error(error);
    }
  }

  /**
   *
   * validates if the incomming request is valid
   *
   * @param {*} req
   * @returns
   */
  check (req) {

    // validates if the feature is on
    if(!config.PLATFORM_SECURITY.API_THROTTLING.ENABLED){
      return true;
    }

    let reqMeta = utilities.getRequestMeta(req);

    if(_blockedIpsMapping[req.url] && _blockedIpsMapping[req.url].length > 0){
      let found = _blockedIpsMapping[req.url].find(ip => ip == reqMeta.ipAddress);

      if(found){
        return false;
      }
    }

    return true;
  }

  /**
   *
   * Verifies the limits of the requests made by an IP
   *
   * @param {*} req
   */
  async mesureUsage(req){

    try {
      let reqMeta = utilities.getRequestMeta(req);

      // build the query
      let filterExpressions = [];

      let params = {
        TableName: 'api-throttling',
        KeyConditionExpression: '#ip = :ip',
        ExpressionAttributeNames: {
          '#ip': 'ip',
        },
        ExpressionAttributeValues: {
          ':ip': { S: reqMeta.ipAddress },
        },
        ScanIndexForward: false,
      };

      // looking for register under the same endpoint url
      filterExpressions.push('#endpoint = :endpoint');
      params.ExpressionAttributeNames['#endpoint'] = 'endpoint';
      params.ExpressionAttributeValues[':endpoint'] = { S: req.url };

      // looking for register having the ttl bigger than now (Dynamo does not get rid of the record immediatly)
      filterExpressions.push('#ttl >= :ttl');
      params.ExpressionAttributeNames['#ttl'] = 'ttl';
      params.ExpressionAttributeValues[':ttl'] = { N: moment().unix().toString() };

      if (filterExpressions.length > 0) {
        params.FilterExpression = filterExpressions.join(' AND ');
      }

      // take the records
      let interactions = await dbDynamo.queryItems(params);

      if(interactions && interactions.Items && interactions.Items.length >= config.PLATFORM_SECURITY.API_THROTTLING.MAX_REQUESTS_ALLOWED_PER_DAY){

        // check the time difference between the last request and the #10
        // the block in days will be bigger as close as they were made
        let diffFromLastTo10 = Number(interactions.Items[0]['event-timestamp'].N) - Number(interactions.Items[10]['event-timestamp'].N);

        let daysBlock = 0;

        if(diffFromLastTo10 < 10000){
          daysBlock = 20;
        }else if (diffFromLastTo10 < 20000){
          daysBlock = 15;
        }else if (diffFromLastTo10 < 30000){
          daysBlock = 10;
        }else {
          daysBlock = 5;
        }

        // preapres the block record
        let record = {
          TableName: 'api-throttling',
          Item: {
            ip: { S: reqMeta.ipAddress },
            endpoint: { S: req.url},
            'event-timestamp': { N: moment().valueOf().toString() },
            date: { S: moment().toISOString() },
            referrer: {S: reqMeta.referer },
            agent: {S: reqMeta.userAgent || '' },
            extra: {M: {}},
            blocked: { BOOL: true },
            ttl: { N: moment().add(daysBlock, 'days').unix().toString() }
          },
        };

        dbDynamo.putItem(record);

        // add to the in memory variable
        if(!_blockedIpsMapping[req.url]){
          _blockedIpsMapping[req.url] = [];
        }

        _blockedIpsMapping[req.url].push(reqMeta.ipAddress);

      }
    } catch (error) {
      console.error(error);
    }
  }

  /**
   *
   * Load records from Dynamo to the in memory variable
   *
   * @returns
   */
  async load() {

    try {

      if(!config.PLATFORM_SECURITY.API_THROTTLING.ENABLED){
        return;
      }

      console.log('Loading the blocked ips for the api throttling.');

      _blockedIpsMapping = {};

      let filterExpressions = [];

      let params = {
        TableName: 'api-throttling',
        ExpressionAttributeNames: {},
        ExpressionAttributeValues: {}
      };

      filterExpressions.push('#blocked = :blocked');
      params.ExpressionAttributeNames['#blocked'] = 'blocked';
      params.ExpressionAttributeValues[':blocked'] = { BOOL: true };

      filterExpressions.push('#ttl >= :ttl');
      params.ExpressionAttributeNames['#ttl'] = 'ttl';
      params.ExpressionAttributeValues[':ttl'] = { N: moment().unix().toString() };

      if (filterExpressions.length > 0) {
        params.FilterExpression = filterExpressions.join(' AND ');
      }

      const scanResults = [];
      let items;
      do{
        items = await dbDynamo.scan(params);
        items.Items.forEach((item) => {
          scanResults.push(item);

          if(!_blockedIpsMapping[item.endpoint.S]){
            _blockedIpsMapping[item.endpoint.S] = [];
          }

          _blockedIpsMapping[item.endpoint.S].push(item.ip.S);

        });
        params.ExclusiveStartKey = items.LastEvaluatedKey;
      }while(typeof items.LastEvaluatedKey !== 'undefined');

      console.log('Finished loading the blocked ips for the api throttling.');

    } catch (error) {
      console.error(`Error loading the blocked IPs for the api throttling.`);
      console.error(error);
    }
  }
}

module.exports = ( ) => { return new apiThrottling( ); };
