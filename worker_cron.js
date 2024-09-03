const { fork } = require('child_process');

var CronJob = require('cron').CronJob;

/* eslint-disable */

var processPostConversionRewards = ()=>{
  fork('./process_post_conversion_rewards.js');
};

/* eslint-enable */

module.exports = {
  init: function () {
    new CronJob('0 0 16 * * *', processPostConversionRewards, null, true);
  }
};
