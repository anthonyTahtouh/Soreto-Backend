var config = require('./config/config');

var seneca = require('seneca')();
var url = require('url');
var og = require('open-graph-scraper');

var meta = function () {
  this.add({service: 'meta', controller: 'opengraph', action: 'get'}, function (msg, respond) {
    if (!msg.productUrl) {
      return respond(null, {success: false, data: {
        err: 'ERR_SRVMETA_PARAMS',
        message: 'Missing product URL.',
        data: {}
      }});
    }

    og({url: msg.productUrl, timeout: 5000}, function (err, meta) {
      if (err) {
        return respond(null, {success: false, data: {
          code: 'ERR_SRVMETA_PARAMS',
          message: 'An error occurred while fetching metadata - ' + JSON.stringify(meta),
          data: meta
        }});
      }

      var title = meta.data.ogTitle;
      var imageUrl = meta.data.ogImage ? meta.data.ogImage.url : null;

      if (imageUrl && imageUrl.indexOf('http://') !== 0 && imageUrl.indexOf('https://') !== 0 && imageUrl.indexOf('//') !== 0) {
        imageUrl = 'https://' + imageUrl;
      } else if (imageUrl && imageUrl.indexOf('//') === 0) {
        imageUrl = 'https:' + imageUrl;
      }

      return respond(null, {success: true, data: {
        title: title ? title : null,
        image: imageUrl ? imageUrl : null
      }});
    });
  });
};

var parsedUrl = url.parse(config.MQ.URL);
var opts = {
  servername: parsedUrl.hostname
};

seneca
  .use('seneca-amqp-transport')
  .use(meta)
  .listen({
    type: config.MQ.TYPE,
    pin: 'service:meta,controller:opengraph,action:*',
    url: config.MQ.URL,
    socketOptions: opts
  });