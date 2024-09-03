module.exports = function errorHandler (err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    code: 'ERR_GENERIC_500',
    message: 'An unknown error occurred. Contact support for assistance.',
    data: err
  });
};