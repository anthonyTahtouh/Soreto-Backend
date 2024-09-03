module.exports = function (req, res, next) {
  if (req.header('x-forwarded-proto') && req.header('x-forwarded-proto') != 'https') {
    return res.status(301).redirect('https://' + req.get('host') + req.url);
  }

  return next();
};