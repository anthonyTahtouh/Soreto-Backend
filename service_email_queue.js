const moment = require('moment');
var logger = require('./common/winstonLogging');

const config = require('./config/config');
const emailQueueService = require('./services/emailQueue');
const EmailQueueService = new emailQueueService();

var CronJob = require('cron').CronJob;

const sender = async() => {

  log('[email queue] - taking registers to be processed');

  try {

    // take the pending registers
    let emailsQueued = await EmailQueueService.takeProcessBatch(300);

    log(`[email queue] - There are ${emailsQueued.length} registers queued`);

    // iterate over the registers
    for(var emailQueued of emailsQueued){

      try {

        // send email
        let sentResult = await EmailQueueService.send(emailQueued);

        await EmailQueueService.update(emailQueued._id,
          {
            status: EmailQueueService.mailStatus().SENT,
            transactionId: sentResult._id,
            sentAt: moment()
          });

      } catch (error) {

        // update register to error
        await EmailQueueService.update(emailQueued._id, { status: EmailQueueService.mailStatus().ERROR, log: error });
      }
    }

    log(`[email queue] - Process finished!.`);

  }catch(error){
    errorLog('[email queue]', error);
  }
};

const log = (message) => {

  logger.log(message);

  // duplicate message to the terminal log
  // make it easier to follow on heroku
  console.log(message);
};

const errorLog = (message, additionalData) => {

  logger.error(message, additionalData);

  // duplicate message to the terminal log
  // make it easier to follow on heroku
  console.error(message, additionalData);
};

(() => {

  try {

    log('[email queue] - initializing cron job');

    new CronJob(config.MAIL.QUEUE.SEND_CRON_FREQUENCY, sender, null, true);

    log('[email queue] - cron job successfully initialized');

  } catch (error) {
    errorLog('[email queue] - cron job failed on its initialization.', error);
  }

})();
