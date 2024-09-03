var dbDynamo = require('../db_dynamo');
var msClient = require('../common/senecaClient');

const constants = require('../config/constants');
var moment = require('moment');
var uuid = require('uuid');
var utilities = require('../common/utility.js');

const tableName = 'LogAccessUser';
const partitionKey = 'soreto';

/*
 |--------------------------------------------------------------------------
 | Get all items from dynamoDB
 |--------------------------------------------------------------------------
 */
var getItems = async function (filter) {
  let filterExpressions = [];
  let keyConditionExpression = ['#partitionKey = :partitionKey'];

  let params = {
    TableName: tableName,
    KeyConditionExpression: '#partitionKey = :partitionKey',
    ExpressionAttributeNames: {
      '#partitionKey': 'partitionKey',
    },
    ExpressionAttributeValues: {
      ':partitionKey': { S: partitionKey },
    },
    ScanIndexForward: false,
  };

  if (filter.email) {
    filterExpressions.push('contains(#email, :email)');
    params.ExpressionAttributeNames['#email'] = 'email';
    params.ExpressionAttributeValues[':email'] = { S: filter.email };
  }

  if (filter.client !== 'undefined') {
    filterExpressions.push('#client = :client');
    params.ExpressionAttributeNames['#client'] = 'client';
    params.ExpressionAttributeValues[':client'] = { S: filter.client };
  }

  if (filter.role !== 'undefined') {
    filterExpressions.push('#role = :role');
    params.ExpressionAttributeNames['#role'] = 'role';
    params.ExpressionAttributeValues[':role'] = { S: filter.role };
  }

  if (filter.startDate != 'undefined' && filter.endDate != 'undefined') {
    keyConditionExpression.push('#date BETWEEN :start_date AND :end_date');
    params.ExpressionAttributeNames['#date'] = 'date';
    params.ExpressionAttributeValues[':start_date'] = { N: moment(filter.startDate).valueOf().toString() };
    params.ExpressionAttributeValues[':end_date'] = { N: moment(filter.endDate).endOf('day').valueOf().toString() };
  } else if (filter.startDate != 'undefined') {
    keyConditionExpression.push('#date >= :start_date');
    params.ExpressionAttributeNames['#date'] = 'date';
    params.ExpressionAttributeValues[':start_date'] = { N: moment(filter.startDate).valueOf().toString() };
  } else if (filter.endDate != 'undefined') {
    keyConditionExpression.push('#date <= :end_date');
    params.ExpressionAttributeNames['#date'] = 'date';
    params.ExpressionAttributeValues[':end_date'] = { N: moment(filter.endDate).endOf('day').valueOf().toString() };
  }

  if (filterExpressions.length > 0) {
    params.FilterExpression = filterExpressions.join(' AND ');
  }

  if (keyConditionExpression.length > 0) {
    params.KeyConditionExpression = keyConditionExpression.join(' AND ');
  }

  return await dbDynamo.queryItems(params);
};

/*
 |--------------------------------------------------------------------------
 | Save item to dynamoDB
 |--------------------------------------------------------------------------
 */
var putItem = async function (data, req, status, type) {

  if(process.env.NODE_ENV == 'test'){
    return;
  }

  let reqMeta = utilities.getRequestMeta(req);

  let params = {
    TableName: tableName,
    Item: {
      partitionKey: { S: partitionKey },
      date: { N: moment().valueOf().toString() },
      referrer: {S: reqMeta.referer },
      agent: {S: reqMeta.userAgent || '' },
      client: {S: data.clientId || '' },
      role: data.roleName? { S: data.roleName } : null,
      ip: {S: reqMeta.ipAddress || ''},
      id: {S: uuid.v4() || ''},
      type: {S: type || ''},
      email: {S: data.email || ''},
      username: data.firstName? {S: data.firstName + ' ' + data.lastName } : null,
      status: {S: status || ''},
    },
  };

  msClient.act(constants.EVENTS.LOG.USER_ACCESS, { record: params });
};


msClient.add(constants.EVENTS.LOG.USER_ACCESS, async (data, respond) => {
  try {
    if (data && (data.record)) {
      await dbDynamo.putItem(data.record);
    }

    return respond(null, { success: true });
  } catch (error) {
    return respond(error, {success: false });
  }
});


/*
 |--------------------------------------------------------------------------
 | Standard responses
 |--------------------------------------------------------------------------
*/

module.exports.putItem = putItem;
module.exports.getItems = getItems;
