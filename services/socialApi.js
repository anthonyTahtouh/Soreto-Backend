var request = require('../mocks/http-client');
var Twitter = require('node-twitter-api');
var googleApi = require('googleapis');
var plus = googleApi.plus('v1');
var plusDomains = googleApi.plusDomains('v1');
var OAuth2 = googleApi.auth.OAuth2;
var moment = require('moment');
var md5File = require('md5-file/promise');
var s3Service = require('./s3');
var hostingHelper = require('../utils/hostingHelper');
var logger = require('../common/winstonLogging');


var config = require('../config/config');

var facebook = {
  post: function (token, secret, refresh, message, url, imageId, meta, cb) {
    var postRequest = request
      .post(config.SOCIAL.FACEBOOK.URL_FEED)
      .set('Content-Type', 'application/json')
      .set('Authorization', 'Bearer ' + token);

    if (imageId) {
      postRequest.send({object_attachment: imageId});
    }
    if (imageId && url) {
      message = (message ? url + ' - ' + message : url);
    } else if (!imageId && url) {
      postRequest.send({link: url});
    }
    if (message) {
      postRequest.send({message: message});
    }

    postRequest.end(function (err, response) {
      if (err) {
        return cb({
          code: 'ERR_SOCIAL_POST',
          message: 'An error occurred while posting to facebook.',
          data: err
        });
      }

      var jsonResponse;

      try {
        jsonResponse = JSON.parse(response.text);
      } catch (e) {
        jsonResponse = {};
      }

      return cb(null, jsonResponse);
    });
  },
  getPostLikeCount: function (token, postId, cb) {
    request
      .get(config.SOCIAL.FACEBOOK.URL_BASE + '/' + postId + '/likes?summary=true')
      .set('Authorization', 'Bearer ' + token)
      .end(function (err, response) {
        if (err) {
          return cb({
            code: 'ERR_SOCIAL_GETLIKES',
            message: 'An error occurred while attempting to fetch facebook likes count',
            data: err
          });
        }

        var jsonResponse;

        try {
          jsonResponse = JSON.parse(response.text);
        } catch (e) {
          jsonResponse = {};
        }

        return cb(null, jsonResponse);
      });
  },
  uploadImage: function (token, secret, filename, cb) {
    request
      .post(config.SOCIAL.FACEBOOK.URL_PHOTOS)
      .set('Authorization', 'Bearer ' + token)
      .attach('source', filename)
      .query({'no_story': 1})
      .end(function (err, response) {
        if (err) {
          return cb({
            code: 'ERR_SOCIAL_IMAGEUPLOAD',
            message: 'Error occurred while uploading photo to facebook.',
            data: err
          });
        }

        var jsonResponse;

        try {
          jsonResponse = JSON.parse(response.text);
        } catch (e) {
          jsonResponse = {};
        }

        return cb(null, jsonResponse);
      });
  },
  getInfo: function (token, secret, refresh, cb) {
    var fields = [
      'id',
      'first_name',
      'last_name',
      'birthday',
      'email',
      'location',
      'gender'
    ];

    request
      .get(config.SOCIAL.FACEBOOK.URL_USERINFO)
      .set('Authorization', 'Bearer ' + token)
      .query({fields: fields.join(',')})
      .end(function (err, response) {
        if (err) {
          return cb({
            code: 'ERR_SOCIAL_GETINFO',
            message: 'An error occurred while attempting to retrieve social user data (facebook).',
            data: err
          });
        }

        var jsonResponse;

        try {
          jsonResponse = JSON.parse(response.text);
        } catch (e) {
          jsonResponse = {};
        }

        return cb(null, jsonResponse);

      });
  },
  getAccessCode: function (code, cb) {
    var redirect = config.BACK_URL + '/socialauth?p=facebook';

    // Get a short-lived access token
    request
      .get(config.SOCIAL.FACEBOOK.URL_ACCESSTOKEN)
      .query({
        client_id: config.SOCIAL.FACEBOOK.APP_ID,
        redirect_uri: redirect,
        client_secret: config.SOCIAL.FACEBOOK.APP_SECRET,
        code: code
      })
      .end(function (err, response) {
        if (err) {
          return cb({
            code: 'ERR_SOCIAL_AUTH',
            message: 'Authentication with facebook failed while getting access code.',
            data: err
          });
        }

        var jsonResponse;

        try {
          jsonResponse = JSON.parse(response.text);
        } catch (e) {
          jsonResponse = {};
        }

        return cb(null, jsonResponse);
      });
  },
  getAccessToken: function (code, cb) {
    request
      .get(config.SOCIAL.FACEBOOK.URL_ACCESSTOKEN)
      .query({
        grant_type: 'fb_exchange_token',
        client_id: config.SOCIAL.FACEBOOK.APP_ID,
        client_secret: config.SOCIAL.FACEBOOK.APP_SECRET,
        fb_exchange_token: code
      })
      .end(function (err, response) {
        if (err) {
          return cb({
            code: 'ERR_SOCIAL_AUTH',
            message: 'Authentication with facebook failed while getting access token.',
            data: err
          });
        }

        var jsonResponse;

        try {
          jsonResponse = JSON.parse(response.text);
        } catch (e) {
          jsonResponse = {};
        }

        return cb(null, jsonResponse);
      });
  },
  getTokenMeta: function (token, cb) {
    request
      .get(config.SOCIAL.FACEBOOK.URL_TOKEN_DEBUG)
      .query({
        input_token: token,
        access_token: config.SOCIAL.FACEBOOK.APP_ID + '|' + config.SOCIAL.FACEBOOK.APP_SECRET
      })
      .end(function (err, response) {
        if (err) {
          return cb({
            code: 'ERR_SOCIAL_TOKEN',
            message: 'An error occurred while verifying the social platform access token.',
            data: err
          });
        }

        var jsonResponse;

        try {
          jsonResponse = JSON.parse(response.text);
        } catch (e) {
          jsonResponse = {};
        }

        return cb(null, jsonResponse);
      });
  },
  getTokenExpiry: function (token, cb) {
    this.getTokenMeta(token, function (err, meta) {
      if (err) {
        return cb(err);
      }

      return meta && meta.data ? cb(null, moment.unix(meta.data.expires_at).format()) : cb();
    });
  }
};

var twitter = {
  getSdk: function () {
    return new Twitter({
      consumerKey: config.SOCIAL.TWITTER.APP_ID,
      consumerSecret: config.SOCIAL.TWITTER.APP_SECRET,
      callback: config.BACK_URL + '/socialauth?p=twitter'
    });
  },
  post: function (token, secret, refresh, message, url, imageId, meta, cb) {
    var self = this;

    var twitter = self.getSdk();

    var payload = {
      status: message
    };

    if (payload.status) {
      payload.status += (' ' + url);
    } else {
      payload.status = url;
    }

    if (imageId) {
      payload.media_ids = imageId;
    }

    twitter.statuses('update', payload, token, secret, function (err, data) {
      if (err) {
        return cb({
          code: 'ERR_SOCIAL_POST',
          message: 'An error occurred while posting to twitter.',
          data: err
        });
      }

      return cb(null, data);
    });
  },
  uploadImage: function (token, secret, filename, cb) {
    var self = this;

    var twitter = self.getSdk();

    twitter.uploadMedia({
      media: filename
    }, token, secret, function (err, data) {
      if (err) {
        return cb({
          code: 'ERR_SOCIAL_IMAGEUPLOAD',
          message: 'Error occurred while uploading photo to facebook.',
          data: err
        });
      }

      return cb(null, data);
    });
  },
  getInfo: function (token, secret, refresh, cb) {
    var self = this;

    var twitter = self.getSdk();

    twitter.verifyCredentials(token, secret, {
      include_email: true
    }, function (err, data) {
      if (err) {
        return cb({
          code: 'ERR_SOCIAL_GETINFO',
          message: 'An error occurred while attempting to retrieve social user data (twitter).',
          data: err
        });
      }

      return cb(null, data);
    });
  },
  getTokenExpiry: function (token, cb) {
    // Default twitter expiry is 30 years
    return cb(null, moment().add(30, 'years').format());
  }
};

var google = {
  getSdk: function () {
    return new OAuth2(config.SOCIAL.GOOGLE.APP_ID, config.SOCIAL.GOOGLE.APP_SECRET, config.BACK_URL + '/socialauth?p=google');
  },
  getInfo: function (token, secret, refresh, cb) {
    var self = this;

    var google = self.getSdk();

    google.setCredentials({
      access_token: token,
      refresh_token: refresh,
      expiry_date: true
    });

    plus.people.get({
      userId: 'me',
      auth: google
    }, function (err, response) {
      if (err) {
        return cb({
          code: 'ERR_SOCIAL_GETINFO',
          message: 'An error occurred while attempting to retrieve social user data (google).',
          data: err
        });
      }

      return cb(null, response);
    });
  },
  post: function (token, secret, refresh, message, url, imageId, meta, cb) {
    var self = this;

    var google = self.getSdk();

    google.setCredentials({
      access_token: token,
      refresh_token: refresh,
      expiry_date: true
    });

    plusDomains.activities.insert({
      userId: 'me',
      auth: google,
      resource: {
        'object': {
          'originalContent': 'Test post from API.',
        },
        'access': {
          'items': [{
            'type': 'domain'
          }],
          'domainRestricted': true
        }
      }
    }, function (err, response) {
      if (err) {
        return cb({
          code: 'ERR_SOCIAL_POST',
          message: 'An error occurred while posting to google.',
          data: err
        });
      }

      return cb(null, response);
    });
  },
  // eslint-disable-next-line no-unused-vars
  getTokenExpiry: function (token, cb) {
    // Placeholder
    //TODO TOZATI - Check why is not calling the cb method.
    return null;
  }
};

var pinterest = {
  getAccessToken: function (code, cb) {
    request
      .post(config.SOCIAL.PINTEREST.URL_ACCESSTOKEN)
      .query({
        client_id: config.SOCIAL.PINTEREST.APP_ID,
        grant_type: 'authorization_code',
        client_secret: config.SOCIAL.PINTEREST.APP_SECRET,
        code: code
      })
      .end(function (err, response) {
        if (err) {
          return cb({
            code: 'ERR_SOCIAL_AUTH',
            message: 'Authentication with pinterest failed while getting access token.',
            data: err
          });
        }

        var jsonResponse;

        try {
          jsonResponse = JSON.parse(response.text);
        } catch (e) {
          jsonResponse = {};
        }

        return cb(null, jsonResponse);
      });
  },
  getInfo: function (token, secret, refresh, cb) {
    var fields = [
      'id',
      'username',
      'first_name',
      'last_name',
      'bio',
      'image'
    ];

    request
      .get(config.SOCIAL.PINTEREST.URL_USERINFO)
      .query({
        access_token: token,
        fields: fields.join(',')
      })
      .end(function (err, response) {
        if (err) {
          return cb({
            code: 'ERR_SOCIAL_GETINFO',
            message: 'An error occurred while attempting to retrieve social user data (pinterest).',
            data: err
          });
        }

        var jsonResponse;

        try {
          jsonResponse = JSON.parse(response.text);
        } catch (e) {
          jsonResponse = {};
        }

        return cb(null, jsonResponse.data);

      });
  },
  uploadImage: function (token, secret, filename, cb) {
    var fileId;

    // Create hash of image and upload copy to S3
    md5File(filename)
      .then(function (hash) {
        fileId = hash + '.' + filename.substr(filename.lastIndexOf('.')+1);
        return s3Service.uploadFile(config.AWS.HOSTING_BUCKET, filename, hash.substring(0,6) + '/' + fileId);
      })
      .then(function () {
        return cb(null, {
          id: hostingHelper.getHostingUrl(fileId)
        });
      })
      .catch(function (err) {
        logger.error(err);
        return cb({
          code: 'ERR_SOCIAL_UPLOADHASH',
          message: 'Failed to create a hash of the image. Aborting upload to S3.',
          data: err
        });
      });
  },
  createBoard: function (token, secret, refresh, boardName, cb) {
    request
      .post(config.SOCIAL.PINTEREST.URL_BOARDS_CREATE)
      .query({
        access_token: token,
        fields: 'id,name'
      })
      .type('form')
      .send({
        name: boardName
      })
      .end(function (err, response) {
        if (err) {
          return cb({
            code: 'ERR_SOCIAL_POST_BOARD',
            message: 'An error occurred while creating your Pinterest board.',
            data: err
          });
        }

        var jsonResponse;

        try {
          jsonResponse = JSON.parse(response.text);
        } catch (e) {
          jsonResponse = {};
        }

        return cb(null, jsonResponse.data);
      });
  },
  getBoards: function (token, secret, refresh, cb) {
    request
      .get(config.SOCIAL.PINTEREST.URL_BOARDS_GET)
      .query({
        access_token: token,
        fields: 'id,name'
      })
      .type('form')
      .end(function (err, response) {
        if (err) {
          return cb({
            code: 'ERR_SOCIAL_POST',
            message: 'An error occurred while posting to pinterest.',
            data: err
          });
        }

        var jsonResponse;

        try {
          jsonResponse = JSON.parse(response.text);
        } catch (e) {
          jsonResponse = {};
        }

        return cb(null, jsonResponse.data);
      });
  },
  post: function (token, secret, refresh, message, url, imageId, meta, cb) {
    request
      .post(config.SOCIAL.PINTEREST.URL_PINS)
      .query({
        access_token: token,
        fields: 'id'
      })
      .type('form')
      .send({
        board: meta.pinterestBoard,
        note: message,
        link: url,
        image_url: imageId
      })
      .end(function (err, response) {
        if (err) {
          return cb({
            code: 'ERR_SOCIAL_POST',
            message: 'An error occurred while posting to pinterest.',
            data: err
          });
        }

        var jsonResponse;

        try {
          jsonResponse = JSON.parse(response.text);
        } catch (e) {
          jsonResponse = {};
        }

        return cb(null, jsonResponse.data);
      });
  },
  getTokenExpiry: function (token, cb) {
    // Default twitter expiry is 30 years
    return cb(null, moment().add(30, 'years').format());
  }
};

module.exports = {
  facebook: facebook,
  twitter: twitter,
  google: google,
  pinterest: pinterest
};