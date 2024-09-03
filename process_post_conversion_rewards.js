var moment = require('moment');
var logger = require('./common/winstonLogging');
var PostConversionRewardService = require('./services/postConversionReward');
var postConversionRewardService = new PostConversionRewardService();

postConversionRewardService.processDiscountPostConversionRewards()
  .then(() => {

    logger.info(`||| Discount process finished |||`);

    postConversionRewardService.processBatchDiscountPostConversionRewards()
      .then(function(values) {

        logger.info(`||| Batch Discount process finished |||`);

        console.log('fin:',values);
        logger.info('------------------------------------------------------');
        logger.info('%s - All post conversion rewards completed...', moment().format());
        logger.info('------------------------------------------------------');
        process.exit();
      }).catch((err)=>{
        logger.error(err);
        process.exit();
      });

  }).catch((err)=>{
    logger.error(err);
    process.exit();
  });