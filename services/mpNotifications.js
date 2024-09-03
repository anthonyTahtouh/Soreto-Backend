const AbstractCrudInterface = require('./CrudInterface');
const mpBrandService = require('./mpBrands');
const mpOfferService = require('./mpOffers');
const mpCategoryService = require('./mpCategories');

const marketplaceMessages = require('../service_messages/marketPlace');
const _ = require('lodash');
const moment = require('moment');
var dbError = require('../common/dbError');
const httpCodes = require('http2').constants;

class mpNotification extends AbstractCrudInterface {

  constructor() {
    super('reverb.mp_notification_js');
  }

  async publishNotifications(notificationIds) {

    let notifications = [];
    let invalidNotifications = [];

    try {
      for(let notificationId of notificationIds){
        let notification = await this.getById(notificationId);

        if(!notification){
          continue;
        }

        if(notification && notification.publishedAt){
          invalidNotifications.push(invalidNotifications);
        }else{
          notifications.push(notification);
        }
      }
    } catch (error) {
      throw dbError(error, `Error to call 'get' data from ${this.viewName}`);
    }

    // valdidates if there were invalid notifications
    if(invalidNotifications.length > 0){
      throw {
        statusCode: httpCodes.HTTP_STATUS_CONFLICT,
        friendlyMessage: `The following notifications were already sent: ${invalidNotifications.map((n) => n._id)}`
      };
    }

    for(let notification of notifications){

      notification.publishedAt = moment();

      notification = await this.update(notification._id, notification);

      // send to market place
      marketplaceMessages.publishNotification([notification]);
    }

    return notifications;
  }

  pick(obj) {
    return _.pick(obj,[
      'message',
      'type',
      'targetMpOfferId',
      'targetMpBrandId',
      'targetMpCategoryId',
      'redirectUrl'
    ]);
  }

  requiredProps() {
    return [
      'message',
      'type',
    ];
  }

  async createNotification(obj) {
    // valida objeto

    if (obj.targetMpOfferId) {
      const offer = await mpOfferService.getById(obj.targetMpOfferId);

      if (!offer)
        throw 'Invalid offer Id';
    }

    if (obj.targetMpBrandId) {
      const brand = await mpBrandService.getById(obj.targetMpBrandId);

      if (!brand)
        throw 'Invalid brand Id';
    }

    if (obj.targetMpCategoryId) {
      const category = await mpCategoryService.getById(obj.targetMpCategoryId);

      if (!category)
        throw 'Invalid category Id';
    }


    return;


  }

}

const mpNotificationService =  new mpNotification();

module.exports = mpNotificationService;