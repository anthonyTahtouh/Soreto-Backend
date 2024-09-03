var EventEmitter = require('events');
var util = require('util');
var config = require('../config/config');

var ua = require('universal-analytics');
var ga = ua(config.ANALYTICS.GA.TOKEN);

function AnalyticsService() {
  EventEmitter.call(this);

  this.on('page_view', function (path, referrer, title) {
    ga.pageview(path, referrer, title).send();
  });

}

util.inherits(AnalyticsService, EventEmitter);

module.exports = new AnalyticsService();