const sinon = require('sinon');
const passport = require('passport');
const async = require('async');

module.exports = () => {
  let local_context_next;
  const auth = sinon.stub(passport, 'authenticate').returns((req, res, next) => {
    req.userRoles = 's';
    local_context_next = next;
    return next();
  });
  const auto = sinon.stub(async, 'auto').callsFake(() => {
    local_context_next();
  });
  return {
    restore: () => {
      auth.restore();
      auto.restore();
    }
  };
};