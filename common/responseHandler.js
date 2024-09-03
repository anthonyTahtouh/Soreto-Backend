const _ = require('lodash');
const _logger = require('./winstonLogging');
const httpCodes = require('http2').constants;

/**
 * Generic HTTP result
 *
 * @param {*} res
 * @param {*} data
 * @param {*} code
 */
const result = (res, data = null, httpCode = httpCodes.HTTP_STATUS_OK) => {

  if(!_.isNull(data)){
    res.status(httpCode).send({ resultData: data});
  }else{
    res.status(httpCode).send({});
  }
};

/**
 * New data HTTP result
 *
 * @param {*} res
 * @param {*} newObj
 */
const resultNew = (res, newObj) => {

  result(res, newObj, httpCodes.HTTP_STATUS_CREATED);
};

/**
 * Updated data HTTP result
 *
 * @param {*} res
 * @param {*} updatedObj
 */
const resultUpdated = (res, updatedObj) => {

  result(res, updatedObj, httpCodes.HTTP_STATUS_OK);
};

/**
 * Deleted data HTTP result
 *
 * @param {*} res
 */
const resultDeleted = (res) => {

  result(res, null, httpCodes.HTTP_STATUS_NO_CONTENT);
};

/**
 * Not found HTTP result
 * @param {*} res
 */
const resultNotFound = (res) => {

  result(res, null, httpCodes.HTTP_STATUS_NOT_FOUND);
};

/**
 * Error composer
 * @param {*} res
 * @param {*} error
 * @param {*} httpCode
 * @param {*} errorCode
 * @param {*} friendlyMessage
 */
const errorComposer = (res, error, httpCode, errorCode, friendlyMessage) => {

  let errorMessage = '';
  let httpCodeFinal = httpCode || httpCodes.HTTP_STATUS_INTERNAL_SERVER_ERROR;

  // is the error already a string?
  if(typeof(error) === 'string' || error instanceof String){
    errorMessage = error;
  }

  // is the error an object?
  if(_.isObject(error)){

    // is there already a message?
    if(error.message){
      errorMessage = error.message.toString();
    }else{
      errorMessage = JSON.stringify(error);
    }

    if(!httpCode){
      if(error.statusCode){
        httpCodeFinal = error.statusCode;
      }
    }

    if(!errorCode){
      if(error.code){
        errorCode = error.code;
      }
    }

    if(!friendlyMessage) {
      if (error.friendlyMessage) {
        friendlyMessage = error.friendlyMessage;
      } else {
        friendlyMessage = 'Ooops! Something went wrong. Please contact the support team.';
      }
    }
  }

  let errorObj = {
    errorMessage,
    errorCode,
    friendlyMessage,
    errorProps: error.errorProps,
    details: error.data
  };

  // return to the client
  res.status(httpCodeFinal).send(errorObj);

  // log all errors on Winston
  _logger.error(errorObj);
};

module.exports =  { result, resultNew, resultUpdated, resultDeleted, resultNotFound, errorComposer, httpCodes };
