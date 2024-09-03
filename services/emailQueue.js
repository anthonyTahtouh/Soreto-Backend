const AbstractCrudInterface = require('./CrudInterface');
const moment = require('moment');
const mandrillApi = require('../microservices/send-email/external-services/mandrill-api');


const _maxEmailDaysOld = 5;

class emailQueueService extends AbstractCrudInterface {

  constructor() {
    super('reverb.email_queue_js');
  }

  async add(providerId, type, delaySeconds, data, objectId = null) {

    // calc the date to be sent
    const sendAt = moment().add(delaySeconds, 'seconds');

    // status: by default it is 'CREATED'
    let status = this.mailStatus().CREATED;

    /**
     *
     * DELAY ZERO
     *
     * When we are adding a delay zero entry, it means we are going to send it exactly now
     * due to this, the register will be created with the "SENT" status to prevent further execution
     *
     * Also, it will alredy trigger the send process
     *
     */

    if(delaySeconds === 0){
      status = this.mailStatus().SENT;
    }

    let newEmailQueue = null;

    try {

      // create a new email queue entry
      newEmailQueue = await this.create({
        providerId,
        delaySeconds,
        data,
        type,
        sendAt,
        status,
        objectId
      });

    } catch (error) {
      throw error;
    }

    // delay zero, send it immediately
    if(delaySeconds === 0){

      try {

        // send
        let sendResult = await this.send(newEmailQueue);

        await this.update(newEmailQueue._id, { sentAt: moment(), transactionId: sendResult._id });

      } catch (error) {

        // TODO: validates updated at
        await this.update(newEmailQueue._id, { status: this.mailStatus().ERROR, log: error });

        throw error;
      }
    }
  }

  async takeProcessBatch(size) {

    // TODO: take a look at the select update strategy to prevent lock
    return this.table()
      .update({ status: this.mailStatus().PROCESSING })
      .where('status', this.mailStatus().CREATED )
      .andWhere('createdAt', '>', moment().subtract(_maxEmailDaysOld, 'days'))
      .andWhere('sendAt', '<=', moment())
      .orderBy('sendAt')
      .limit(size)
      .returning('*');
  }

  async send(emailQueueRegister) {

    switch(emailQueueRegister.providerId){
    case 'MANDRILL':

      // get rid of the delay
      emailQueueRegister.data.delay = 0;

      var result = await mandrillApi.send(emailQueueRegister.data);

      // validates if an error happened
      if(result && result.length > 0 && result[0].status != 'sent'){
        throw result;
      }

      return { _id: result[0]._id };
    default:
      throw `Provider '${emailQueueRegister.providerId}' not supported`;
    }

  }

  mailStatus () { return {
    CREATED: 'CREATED',
    PROCESSING: 'PROCESSING',
    SENT: 'SENT',
    ERROR: 'ERROR'
  };}
}

module.exports = emailQueueService;
