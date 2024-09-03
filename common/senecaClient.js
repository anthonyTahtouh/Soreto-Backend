var config = require('../config/config');
var url = require('url');
var seneca = require('seneca');

var parsedUrl = url.parse(config.MQ.URL);

module.exports = seneca()
  .use('seneca-amqp-transport')
  .client({
    type: config.MQ.TYPE,
    pin: 'service:*,controller:*,action:*',
    url: config.MQ.URL,
    socketOptions: {
      servername: parsedUrl.hostname
    }//,
    // exchange: { //It should declare an exchange of type fanout messages broadcast.
    //   name: 'service:fanout',
    //   type: 'fanout'
    // }
  });