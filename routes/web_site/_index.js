var express = require('express');
var router = express.Router();


router.use(require('./fowardToEmail'));

module.exports = router;