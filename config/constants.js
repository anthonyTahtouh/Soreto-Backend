module.exports = {

  SERVICES: {
    SERVICE_PINS: {
      SERVICE_API: 'service:api,controller:connector,action:*'
    },
    SERVICE_KEYS: {
      EXTERNAL_REVENUE_UPSERT: {
        service: 'api',
        controller: 'connector',
        action: 'external_revenue_upsert'
      },
      ASSOC_AFFILIATE_MERCHANT_GET: {
        service: 'api',
        controller: 'connector',
        action: 'assoc_affiliate_merchant_client_get'
      },
      ASSOC_AFFILIATE_MERCHANT_CLIENT_CREATE: {
        service: 'api',
        controller: 'connector',
        action: 'assoc_affiliate_merchant_client_create'
      },
      ORDER_CREATE: {
        service: 'api',
        controller: 'connector',
        action: 'order_create'
      },
      ORDER_GET: {
        service: 'api',
        controller: 'connector',
        action: 'order_get'
      },
      ORDER_UPDATE: {
        service: 'api',
        controller: 'connector',
        action: 'order_update'
      },
      USER_GET: {
        service: 'api',
        controller: 'connector',
        action: 'user_get'
      },
      TRANSACTION_CREATE: {
        service: 'api',
        controller: 'connector',
        action: 'transaction_create'
      },
      SHARED_URL_GET: {
        service: 'api',
        controller: 'connector',
        action: 'shared_url_get'
      },
      CLIENT_UPDATE: {
        service: 'api',
        controller: 'connector',
        action: 'client_update'
      },
      CLIENT_CREATE: {
        service: 'api',
        controller: 'connector',
        action: 'client_create'
      },
      CLIENT_ORDER_CREATE: {
        service: 'api',
        controller: 'connector',
        action: 'client_order_create'
      },
      AFFILIATES_GET: {
        service: 'api',
        controller: 'connector',
        action: 'affiliates_get'
      },
      PRODUCTS_DELETE: {
        service: 'api',
        controller: 'connector',
        action: 'products_delete'
      },
      PRODUCTS_BATCH_CREATE: {
        service: 'api',
        controller: 'connector',
        action: 'products_batch_create'
      },
      CATEGORIES_DELETE: {
        service: 'api',
        controller: 'connector',
        action: 'categories_delete'
      },
      CATEGORIES_BATCH_CREATE: {
        service: 'api',
        controller: 'connector',
        action: 'categories_batch_create'
      },
      PRODUCTS_CREATE: {
        service: 'api',
        controller: 'connector',
        action: 'products_create'
      },
      SEND_EMAIL: {
        service: 'api',
        controller: 'connector',
        action: 'send_email'
      },
      ADD_CLIENT_ORDER_FRESH_USER: {
        service: 'api',
        controller: 'connector',
        action: 'add_client_order_fresh_user'
      },
      ADD_SHARED_URL_CACHE: {
        service: 'api',
        controller: 'connector',
        action: 'add_shared_url_cache'
      }
    }
  },
  EVENTS: {
    SERVICE_PINS: {
      SERVICE_API: 'service:api,controller:connector,action:*'
    },
    NEW_SHARED_URL_INFO: {
      service: 'api',
      controller: 'connector',
      action: 'new_shared_url_info'
    },
    RETRIEVE_EMAIL_TEMPLATE: {
      service: 'api',
      controller: 'connector',
      action: 'retrieve_email_template'
    },
    RETRIEVE_SOCIAL_POST_COUNT: {
      service: 'api',
      controller: 'connector',
      action: 'retrieve_social_post_count'

    },
    SEND_SIMPLE_EMAIL:{
      service: 'api',
      controller: 'connector',
      action: 'send_simple_email'
    },
    SEND_POST_PURCHASE_DISCOUNT_MAIL:{
      service: 'api',
      controller: 'connector',
      action: 'send_post_purchase_discount_mail'
    },
    // Post Reward V2
    SEND_POST_REWARD_MAIL:{
      service: 'api',
      controller: 'connector',
      action: 'send_post_reward_mail'
    },
    SEND_FRIEND_EMAIL: {
      service: 'api',
      controller: 'connector',
      action: 'send_friend_email'
    },
    SEND_TEMPLATE_EMAIL:{
      service: 'api',
      controller: 'connector',
      action: 'send_template_email'
    },
    SEND_LIVE_TRACK_DATA : {
      service: 'api',
      controller: 'connector',
      action: 'send_live_track_data'
    },
    SEND_ELK_LOG_DATA : {
      service: 'api',
      controller: 'connector',
      action: 'send_elk_log_data'
    },
    ENTITY_CHANGE : {
      service: 'api',
      controller: 'connector',
      action: 'entity_change'
    },
    FANOUT : {
      ENTITY_NAME:  'client',
      ENTITY_CHANGE:'fanout_event:entity_change',
      QUEUE_BRAND:  'mp_brand_entity_change',
      QUEUE_BLOG:   'mp_blog_entity_change',
      QUEUE_BANNER: 'mp_banner_entity_change',
      QUEUE_OFFER:  'mp_offer_entity_change',
      QUEUE_MPS:    'entity_change_mps',
    },
    MARKETPLACE : {
      NOTIFY_NEW_SHARED_URL : {
        service: 'api',
        controller: 'connector',
        action: 'mp_notify_new_shared_url'
      },
      NOTIFY_ORDER : {
        service: 'api',
        controller: 'connector',
        action: 'mp_notify_order'
      },
      NOTIFY_POST_REWARD : {
        service: 'api',
        controller: 'connector',
        action: 'mp_notify_post_reward'
      },
      NOTIFY_TRACKING_EVENT : {
        service: 'api',
        controller: 'connector',
        action: 'mp_notify_tracking_event'
      },
      NOTIFY_NEW_USER : {
        service: 'api',
        controller: 'connector',
        action: 'mp_notify_new_user'
      },
      NOTIFY_REFRESH_USER : {
        service: 'api',
        controller: 'connector',
        action: 'mp_notify_refresh_user'
      },
    },
    LOG : {
      USER_ACCESS: {
        service: 'api',
        controller: 'connector',
        action: 'log_user_access'
      },
    },
  },
  CLIENT_DISPLAY_TYPE: {
    WEB_VIEW: 0,
    PRODUCT_FEED: 1
  },
  CLIENT_TYPE: {
    NATIVE: 0,
    AFFILIATE: 1
  },
  CLIENT_ID_PERMISSION_REMOVAL: ['5cee4f92ee9c6f5a7e11b331','5e4d46c1c381582425de597f', '5e4d476660064b243fa2ed72', '5e4d486db1fc092459674c1a', '5cbedccd3fc7b320bc05da38']

};