var request = require('request');
var uuid = require('uuid');
var _ = require('lodash');
var _moment = require('moment');
var logger = require('./winstonLogging');
const crypto = require('crypto');

// Remove parameter utility function
module.exports = {
  // get the today's formated date
  today: function () {
    return _moment().format('YYYY-MM-DD');
  },
  nowUTC : () => {
    return _moment().utc().format('YYYY-MM-DD HH:mm:ss');
  },
  removeParam: function (key, sourceURL) {
    var rtn = sourceURL.split('?')[0];
    var param;
    var params_arr = [];
    var queryString = (sourceURL.indexOf('?') !== -1) ? sourceURL.split('?')[1] : '';

    if (queryString !== '') {
      params_arr = queryString.split('&');
      for (var i = params_arr.length - 1; i >= 0; i -= 1) {
        param = params_arr[i].split('=')[0];
        if (param === key) {
          params_arr.splice(i, 1);
        }
      }
      rtn = rtn + '?' + params_arr.join('&');
    }
    return rtn;
  },
  // Add protocol to URL
  addHttp: function (url) {
    if (!/^(?:f|ht)tps?:\/\//.test(url)) {
      url = 'http://' + url;
    }
    return url;
  },
  // Get root domain from URL
  getDomain: function (url) {
    if (!url) {
      return url;
    }

    var domain;

    if (url.indexOf('://') > -1) {
      domain = url.split('/')[2];
    }
    else {
      domain = url.split('/')[0];
    }

    domain = domain.split(':')[0];

    if (domain.split('www.').length > 1) {
      domain = domain.split('www.')[1];
    }

    return domain;
  },
  getDomainPassThrough: function (url, cb) {
    var self = this;
    request.get(self.addHttp(url), function (err, res) {
      if (err  || !res || !res.request || !res.request.uri || !res.request.uri.hostname) {
        return cb(null, self.getDomain(url));
      }

      return cb(null, res.request.uri.hostname);
    });
  },
  checkProtectedKeys: function (payload) {
    if (payload._id || payload.createdAt || payload.updatedAt || payload.roles || payload.primaryWallet) {
      return true;
    } else {
      return false;
    }
  },
  generateRandomKey: function () {
    return ('' + uuid.v4()).replace(/-/g, '');
  },
  prepareJson: function (payload) {
    _.each(payload, function (value, key) {
      if (value && typeof value === 'object') {
        payload[key] = JSON.stringify(value);
      }
    });
    return payload;
  },
  isJsonString: function (string) {
    try {
      JSON.parse(string);
    } catch (e) {
      return false;
    }
    return true;
  },
  generatePreview: function (string) {
    try {
      var length = string.length;
      return new Array(length - 2).join('X') + string.substr(length - 3);
    } catch (e) {
      return null;
    }
  },
  fixObjFloatingPoint: function (obj) {
    _.each(obj, function (value, key) {
      obj[key] = parseFloat(parseFloat(value).toFixed(2));
    });

    return obj;
  },
  getPrefix: function () {
    var possible = 'abcdefghijklmnopqrstuvwxyz';

    return possible.charAt(Math.floor(Math.random() * possible.length));
  },
  getRequestMeta: function(req){
    return {
      ipAddress : req.ip,
      userAgent : req.headers['user-agent'],
      cookies: req.cookieHandler ? req.cookieHandler.all.get() : {},
      fp: req.cookies.soreto_fp || ((req.body && req.body.options && req.body.options.fp) ? req.body.options.fp: undefined),
      utmCampaign: (req.body) ? ((req.body.utmCampaign) || ((req.body.options) ? req.body.options.utmCampaign : undefined)): undefined,
      referer: req.headers.referer || undefined
    };
  },
  getObjectClone: function(obj){
    try{
      return JSON.parse(JSON.stringify(obj));
    }catch(err) {
      logger.warn(err);
      return {};
    }
  },
  createUpdateMetadata: function(userId, origin, userEmail){
    return { userId: userId, origin: origin, userEmail: userEmail };
  },
  isValidEmail: function(email){
    //eslint-disable-next-line
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
  },
  parseBoolean : function(value) {

    if (typeof value === 'boolean') {
      return value;
    }

    if(typeof value === 'string'){
      return value.toLowerCase() === 'true' ? true : false; // everything different of 'true' must be false
    }

    return void 0;
  },
  isValidUrl : function(url) {

    var pattern = /^(?:(?:https?|ftp):\/\/)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/;

    return pattern.test(url);
  },
  isValidCustomIdentifier : function (customIdentifier) {

    if(customIdentifier.includes(' ')){
      return false;
    }

    var pattern = /^[a-zA-Z0-9_-]*$/;

    return pattern.test(customIdentifier);
  },
  maskEmailAddress : function (email, maskChar) {

    if (!email){
      return '';
    }

    let emailParsed = email.split('@');
    let user ='';

    if(emailParsed.length >= 2){
      user = (maskChar || 'X').repeat(emailParsed[0].length);
      return `${user}@${emailParsed[1]}`;
    }

    return (maskChar || 'X').repeat(email.length);
  },
  parseJson : function (jsonString) {

    try {
      return JSON.parse(jsonString);
    } catch (e) {
      return { error: 'It was not possible parsing Json' };
    }
  },
  stringfyJson : function (json) {
    try {
      return JSON.stringify(json);
    } catch (e) {
      return 'It was not possible stringy Json';
    }
  },
  isValidJsonString(tester) {

    if(/^\s*$|undefined/.test(tester) || !(/number|object|array|string|boolean/.test(typeof tester)))
    {
      return false;
    }

    return true;
  },
  toCamelCase(str) {
    var arr= str.match(/[a-z]+|\d+/gi);
    return arr.map((m,i)=>{
      let low = m.toLowerCase();
      if (i!=0){
        low = low.split('').map((s,k)=>k==0?s.toUpperCase():s).join``;
      }
      return low;
    }).join``;
  },
  hashMd5(value, salt) {
    const md5Hasher = crypto.createHmac('md5', salt);

    return md5Hasher.update(value).digest('hex');
  },
  hashSHA256(value, salt) {
    return crypto.createHash('sha256').update(value + salt).digest('hex');
  },
  gtagCode(gaToken, cookieFlags) {
    return `
    <!-- Global site tag (gtag.js) - Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${gaToken}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaToken}', {
        cookie_flags: '${cookieFlags}'
      });
    </script>
  `;
  }
};