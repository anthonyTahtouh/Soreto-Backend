var express = require('express');
var router = express.Router();
var multer = require('multer');
var async = require('async');
var moment = require('moment');
var autoReap  = require('multer-autoreap');
var md5File = require('md5-file/promise');
var mime = require('mime');
var logger = require('../../common/winstonLogging');


var authService = require('../../services/auth');
var socialAuthService = require('../../services/socialAuth');
var socialApiService = require('../../services/socialApi');
var s3Service = require('../../services/s3');

var config = require('../../config/config');

// Configure local server storage
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    return cb(null, './uploads/');
  },
  filename: function (req, file, cb) {
    return cb(null, file.fieldname + '-' + Date.now() + '.' + file.originalname.substr(file.originalname.lastIndexOf('.')+1));
  }
});

// Upload middleware
var upload = multer({
  storage: storage,
  limits: {
    fileSize: 10000000
  }
}).single('file');

// Upload image endpoint
router.route('/uploadimage')
  .post(authService.isAuthenticated, authService.isAuthorized, autoReap, function (req, res, next) {
  // Multer custom callback
    upload(req, res, function (err) {
      if (err) {
        logger.error(err);
        return res.status(500).json({
          code: 'ERR_UPLOAD_IMAGE',
          message: err
        });
      }

      return next();
    });
  // End custom callback
  }, function (req, res) {
    var socialPlatforms = req.query.p;
    var userId = req.user;
    var file = req.file;

    if (!file) {
      return res.status(400).json({
        code: 'ERR_UPLOAD_IMAGE',
        message: 'An image is required with multipart name "file"',
        data: {}
      });
    }

    // Ensure socialPlatforms is array
    if (socialPlatforms && typeof socialPlatforms === 'string') {
      socialPlatforms = socialPlatforms.split(',');
    }

    // For each social platform...
    async.map(socialPlatforms, function (socialPlatform, next) {
      async.auto({
      // Get OAuth authentication details
        auth: function (cb) {
          socialAuthService.getToken(userId, socialPlatform, function (err, socialAuth) {
            if (err) {
              return cb(err);
            }

            if (!socialAuth) {
              return cb({
                message: 'Connect to ' + socialPlatform + ' before attempting to post.'
              });
            }

            if (moment().isAfter(socialAuth.expires)) {
              return cb({expired: true});
            }

            return cb(null, socialAuth);
          });
        },
        // Upload the image to the social platform
        upload: ['auth', function (cb, results) {
          socialApiService[socialPlatform].uploadImage(results.auth.tokenValue, results.auth.tokenSecret, file.path, function (err, response) {
            if (err) {
              return cb(err);
            }

            return cb(null, response);
          });
        }]
      }, function (err, results) {
        if (err) {
          return next(null, {socialPlatform: socialPlatform, err: err});
        }

        // Return socialPlatform and upload id
        // Multiple ID options given to compensate for platform return data inconsistencies
        return next(null, {socialPlatform: socialPlatform, id: (results.upload.id || results.upload.media_id_string)});
      });
    }, function (err, results) {
      if (err) {
        logger.error(err);
        return res.status(err.statusCode).json({
          code: err.code,
          message: err.message,
          data: {}
        });
      }

      var socialUploadIds = results;
      var fileId;

      // Create hash of image and upload copy to S3
      md5File(file.path)
        .then(function (hash) {
          fileId = hash + '.' + mime.extension(file.mimetype);
          return s3Service.uploadFile(config.AWS.IMAGE_BUCKET, file.path, hash.substring(0,6) + '/' + fileId);
        })
        .then(function () {
          return res.status(200).json({
            fileId: fileId,
            socialUploads: socialUploadIds
          });
        })
        .catch(function (err) {
          logger.error(err);
        });
    });
  });

module.exports = router;