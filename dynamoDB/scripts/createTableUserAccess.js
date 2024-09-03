const AWS = require('aws-sdk');
require('dotenv').config();

AWS.config.update({
  region: process.env.AWS_DYNAMO_REGION,
  endpoint: process.env.AWS_DYNAMO_URL,
  accessKeyId: process.env.AWS_DYNAMO_ACCESS_KEY,
  secretAccessKey: process.env.AWS_DYNAMO_ACCESS_SECRET,
});

const dynamodb = new AWS.DynamoDB();

async function CreateTable() {

  try {
    console.log('Creating table.....');

    var params = {
      TableName: 'LogAccessUser',
      KeySchema: [
        {
          AttributeName: 'partitionKey',
          KeyType: 'HASH',
        },
        {
          AttributeName: 'date',
          KeyType: 'RANGE',
        },
      ],
      AttributeDefinitions: [
        {
          AttributeName: 'partitionKey',
          AttributeType: 'S',
        },
        {
          AttributeName: 'date',
          AttributeType: 'N',
        },
        { AttributeName: 'email', AttributeType: 'S' },
        { AttributeName: 'clientId', AttributeType: 'S' },
        { AttributeName: 'role', AttributeType: 'S' },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 10,
      },
      GlobalSecondaryIndexes: [
        {
          IndexName: 'EmailIndex',
          KeySchema: [
            { AttributeName: 'email', KeyType: 'HASH' },
          ],
          Projection: {
            ProjectionType: 'ALL',
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 10,
            WriteCapacityUnits: 10,
          },
        },
        {
          IndexName: 'clientIdIndex',
          KeySchema: [
            { AttributeName: 'clientId', KeyType: 'HASH' },
          ],
          Projection: {
            ProjectionType: 'ALL',
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 10,
            WriteCapacityUnits: 10,
          },
        },
        {
          IndexName: 'roleIndex',
          KeySchema: [
            { AttributeName: 'role', KeyType: 'HASH' },
          ],
          Projection: {
            ProjectionType: 'ALL',
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 10,
            WriteCapacityUnits: 10,
          },
        },
      ],
    };

    await dynamodb.createTable(params).promise();
    console.log('Create Table - DONE');
  }
  catch (err) {
    console.log('---- > Error (CreateTable) <----:', err);
  }
}

async function main() {
  await CreateTable();
}


main().catch(console.error);


