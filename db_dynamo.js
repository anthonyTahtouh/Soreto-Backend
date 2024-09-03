var AWS = require('aws-sdk');
var config = require('./config/config');

AWS.config.update({
  region: config.AWS.DYNAMO.REGION,
  accessKeyId: config.AWS.DYNAMO.ACCESS_KEY,
  secretAccessKey: config.AWS.DYNAMO.ACCESS_SECRET,
  sslEnabled: false,
});

const dynamodb = new AWS.DynamoDB({
  endpoint: config.AWS.DYNAMO.URL,
});

async function queryItems(params) {
  const result = await dynamodb.query(params).promise();
  return result;
}

function putItem(params) {
  const result = dynamodb.putItem(params).promise();
  return result;
}


module.exports = {
  queryItems,
  putItem
};