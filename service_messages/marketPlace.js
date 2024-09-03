var config = require('../config/config');
var seneca = require('seneca');
let si = seneca();
var url = require('url');

si.use('seneca-amqp-transport');

const _parsedUrl = url.parse(config.MQ.URL);

/**
 * Basic QUEUE config
 */
const _clientConfig = {

  type: 'amqp',
  url: config.MQ.URL,
  name: 'MP',
  exchange: {
    name: 'soreto_square',
    type: 'fanout'
  },
  socketOptions: {
    servername: _parsedUrl.hostname
  },
  listener: {
    queues: {
      options: {

        autoDelete: false,
        exclusive: false,
        arguments: {
          'x-dead-letter-exchange': 'seneca.dlx',
          'x-message-ttl': 120000
        }
      }
    }
  }
};

/**
 * Buidl client
 * @param {*} event Event name
 * @returns Seneca client instance
 */
const buildClient = (event) => {
  _clientConfig.pin = event;
  return  si.client(_clientConfig);
};

////////////////////
// MPs
////////////////////
let vanishCollectionClient = buildClient('event:vanish_collections');
let insertBatchMpBrandClient = buildClient('event:change_mp_brand');
let insertBatchMpTopBrandClient = buildClient('event:change_mp_top_brand');
let insertBatchMpTopOfferClient = buildClient('event:change_mp_top_offer');
let insertBatchMpOfferClient = buildClient('event:change_mp_offer');
let insertBatchMpBannerClient = buildClient('event:change_mp_banner');
let insertBatchMpBlogClient = buildClient('event:change_mp_blog');
let insertBatchMpNotificationClient = buildClient('event:insert_batch_mp_notification');
let insertBatchMpCategoryClient = buildClient('event:change_mp_category');
let insertBatchMpFlashCampaignClient = buildClient('event:change_mp_flash_campaign');

////////////////////
// New Share
////////////////////
let eventShareClient = buildClient('event:mp_share');

////////////////////
// Order Changed
////////////////////
let eventOrderChanged = buildClient('event:mp_order_changed');

////////////////////
// Tracking Event
////////////////////
let eventTrackingEvent = buildClient('event:mp_tracking_event');


const vanishCollections = () => {
  return new Promise((resolve, reject) => {
    vanishCollectionClient.act('event:vanish_collections', (err, result) => {

      if(err){
        return reject(err);
      }

      resolve(result);

    });
  });
};

//const publishCategory = (category) => {
//  changedMpCategoryClient.act('event:changed_mp_category', {category});
//};

const publishCategoryBatch = (categories) => {
  insertBatchMpCategoryClient.act(`event:change_mp_category`, {categories});
};

const publishBrandBatch = (brands) => {
  insertBatchMpBrandClient.act('event:change_mp_brand', {brands});
};

const publishTopBrandBatch = (topBrands) => {
  insertBatchMpTopBrandClient.act('event:change_mp_top_brand', {topBrands});
};

const publishTopOfferBatch = (topOffers) => {
  insertBatchMpTopOfferClient.act('event:change_mp_top_offer', {topOffers});
};

const publishOffers = (offers) => {
  insertBatchMpOfferClient.act('event:change_mp_offer', {offers});
};

const publishBanners = (banners) => {
  insertBatchMpBannerClient.act('event:change_mp_banner', {banners});
};

const publishBlogs = (blogs) => {
  insertBatchMpBlogClient.act('event:change_mp_blog', {blogs});
};

const publishNotification = (notifications) => {
  notifications = notifications.filter(n => n.publishedAt);
  insertBatchMpNotificationClient.act('event:insert_batch_mp_notification', {notifications});
};

const publishShare = (share) => {
  eventShareClient.act('event:mp_share', {share});
};

const publishOrder = (order) => {
  eventOrderChanged.act('event:mp_order_changed', {order});
};

const publishTrackingEvent = (trackingEvent) => {
  eventTrackingEvent.act('event:mp_tracking_event', {trackingEvent});
};

const publishFlashCampaign = (flashCampaigns) => {
  insertBatchMpFlashCampaignClient.act('event:change_mp_flash_campaign', {flashCampaigns});
};

module.exports = {
  vanishCollections,
  publishCategoryBatch,
  publishBrandBatch,
  publishTopBrandBatch,
  publishTopOfferBatch,
  publishOffers,
  publishBanners,
  publishBlogs,
  publishNotification,
  publishShare,
  publishOrder,
  publishTrackingEvent,
  publishFlashCampaign
};
