var logger = require('./winstonLogging');

module.exports = function (err, modelName) {
  logger.warn(err);
  switch (err.code) {
  case '23505':
    return {
      code: 'ERR_' + modelName.toUpperCase() + '_EXISTS',
      message: modelName + ' already exists.',
      data: err,
      statusCode: 409
    };
  case '23502':
    return {
      code: 'ERR_' + modelName.toUpperCase() + '_FIELDS',
      message: modelName + ' is missing required field (' + err.column + ').',
      data: err,
      statusCode: 400
    };
  case '23503':
    return {
      code: 'ERR_' + modelName.toUpperCase() + '_FKEY',
      message: modelName + ' query failed a foreign key constraint.',
      data: err,
      statusCode: 400
    };
  case '23514':
    return {
      code: 'ERR_' + modelName.toUpperCase() + '_FORMAT',
      message: modelName + ' contains an invalid field format (' + err.dataType + ').',
      data: err,
      statusCode: 400
    };
  case '22P02':
    return {
      code: 'ERR_' + modelName.toUpperCase() + '_JSON',
      message: modelName + ' contains an invalid json format.',
      data: err,
      statusCode: 400
    };
  case 'P0001':
    return {
      code: 'ERR_' + modelName.toUpperCase() + '_EXCEPTION',
      message: err.message.split(' - ')[1],
      data: err,
      statusCode: 400
    };
  default:
    return {
      code: 'ERR_' + modelName.toUpperCase() + '_QUERY',
      message: 'An unknown error occurred while querying the database.',
      data: err,
      statusCode: 500
    };
  }
};