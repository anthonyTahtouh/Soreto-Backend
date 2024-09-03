const express = require('express');
const router = express.Router();
const _ = require('lodash');
var moment = require('moment');
const logger = require('../../common/winstonLogging');

const CodeBlockService = require('../../services/codeBlock');
const authService = require('../../services/auth');

const templateHelper = require('../../utils/templateHelper');

/*
 |--------------------------------------------------------------------------
 | Code Block API endpoint
 |--------------------------------------------------------------------------
 */
router.get('/codeBlock', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // return code block list page
  const query = req.query;
  let filter = {};

  if(req.query.$countryId){
    filter = { countryId: req.query.$countryId };
  }

  var codeBlockService = new CodeBlockService();

  codeBlockService.getPage(filter, query, function (err, codeBlockList) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    return res.status(200).json(codeBlockList);
  });
});

router.get('/codeBlock/:codeBlockId',authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // return single code block
  const codeBlockId = req.params.codeBlockId;
  var codeBlockService = new CodeBlockService();
  codeBlockService.get(codeBlockId, function (err, codeBlock) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }
    return res.status(200).json(codeBlock);
  });
});

// Update code block
router.put('/codeBlock/:codeBlockId', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var codeBlockId = req.params.codeBlockId;
  var payload = req.body;
  var codeBlockService = new CodeBlockService();

  payload.updatedAt = moment();

  codeBlockService.update(codeBlockId, payload, function (err, codeBlock) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    return res.status(200).json(codeBlock);
  });
});

router.post('/codeBlock',authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // create code block
  const codeBlockObj = _.pick(req.body,['active','displayBlockId','name','htmlBody', 'css', 'javascript', 'scss', 'cssExternal', 'javascriptExternal', 'archived' ]);
  var codeBlockService = new CodeBlockService();
  const { displayBlockId, active } = codeBlockObj;


  codeBlockService.getActiveCodeBlock(displayBlockId, function(err, displayBlock) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }
    if (_.isEmpty(displayBlock) || active === 'false') {
      codeBlockService.create(codeBlockObj, function (err, stats) {
        if (err) {
          logger.error(err);
          return res.status(err.statusCode).json({
            code: err.code,
            message: err.message,
            data: {}
          });
        }

        return res.status(201).json(stats);
      });
    } else {
      return res.status(403).json({
        message: 'Placement Content already has one active content layout.'
      });
    }
  });
});

router.get('/codeBlock/previewHtml/:codeBlockId', function (req, res) {
  // return single code block
  const codeBlockId = req.params.codeBlockId;

  var codeBlockService = new CodeBlockService();

  codeBlockService.get(codeBlockId,function(err, codeBlock){
    let templateObject = _.pick(codeBlock, ['htmlBody', 'css', 'javascript', 'cssExternal', 'jsExternal']);
    templateObject.testMode = true;
    templateHelper.combineHtmlCssJsTemplate(templateObject)
      .then((html)=>{
        return res.status(200).send(html);
      });
  });
});

module.exports = router;
