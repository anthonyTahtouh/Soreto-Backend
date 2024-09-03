var config = require('../config/config');
const seneca = require('seneca');
const senecaClient = seneca;

/**
 * Fanout client
 */
let client = senecaClient()
  .use('seneca-amqp-transport')

  .client({
    type: 'amqp',
    pin: 'fanout_event:*',
    url: config.MQ.URL,
    exchange: {
      name: 'fanout_exchange',
      type: 'fanout',
    }
  });

/**
 * Fanout listener builder
 */
let listener = (queue) => {

  return senecaClient()
    .use('seneca-amqp-transport')

    .listen({
      type: 'amqp',
      pin:  'fanout_event:*',
      url: config.MQ.URL,
      name: queue,
      exchange: {
        name: 'fanout_exchange',
        type: 'fanout',
      },
    });
};

module.exports = { client, listener };