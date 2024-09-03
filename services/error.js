var _ = require('lodash');

module.exports.getErrorMsg = function getErrorMsg(err) {
  var message = err.message;

  if (err.data && err.data.errors) {
    _.forEach(err.data.errors, function (errObj) {
      if (errObj.message) {
        message = errObj.message;
      }
    });
  }

  return message;
};