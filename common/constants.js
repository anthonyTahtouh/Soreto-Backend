const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  CLIENT: 'client',
  CLIENT_USER: 'clientUser',
  GUEST: 'guest',
  SYSTEM: 'system',
  SALES: 'sales',
  MP_USER: 'mpUser',
  TECH: 'tech'
};

const AFFILIATE_FEED_STATUS = {
  CREATED: 'CREATED',
  BUILD_FAILED: 'BUILD_FAILED',
  IN_REVIEW: 'IN_REVIEW',
  REVIEWED: 'REVIEWED',
  REJECTED: 'REJECTED',
  BUILT: 'BUILT',
  PUBLISHED: 'PUBLISHED',
  BUILD_REVIEW: 'BUILD_REVIEW',
  BUILD_UPDATE_REQUIRED: 'BUILD_UPDATE_REQUIRED',
  BUILD_APPROVED: 'BUILD_APPROVED',
};

const AFFILIATE_FEED_TYPE = {
  OFFER: 'OFFER',
  BRAND: 'BRAND',
};

const DISPLAY_BLOCK_TYPES = {
  VOUCHER_PAGE:'voucher-page',
  LIGHTBOX:  'lightbox',
  SHARE_STATIC_PAGE:  'sharestaticpage',
  INTERSTITIAL:  'interstitial',
  SHARE_VIA_EMAIL:  'shareviaemail',
  LIGHTBOX_WRAPPER:  'lightboxwrapper'
};

const EMAIL_TEMPLATE_TYPES = {
  POST_PURCHASE_DISCOUNT_REWARD_EMAIL: 'post_purchase_discount_reward_email',
  BAA_FORWARD_EMAIL: 'baa-forward-email',
  SHARE_WITH_FRIEND_EMAIL: 'share_with_friend_email',
  BAA_THANKYOU_EMAIL: 'baa-thankyou-email',
  BAA_FRIEND_EMAIL: 'baa-friend-email',
  POST_PURCHASE_FRIEND_REWARD_EMAIL: 'post_purchase_friend_reward_email',
  REWARD_EMAIL: 'reward_email',
  SHARE_WITH_FRIEND_EMAIL_REMINDER: 'share_with_friend_email_reminder'
};

module.exports = {

  ROLES,
  SYSTEMIC_ROLES: [ROLES.ADMIN, ROLES.CLIENT, ROLES.CLIENT_USER, ROLES.SALES, ROLES.SYSTEM],
  DEFAULT_SOURCE_TAGS : {
    CONFIRMATION_PAGE : 'CONFIRMATION_PAGE',
    STATIC_PAGE_ON_SORETO : 'STATIC_PAGE_ON_SORETO',
    STATIC_PAGE_ON_CLIENT : 'STATIC_PAGE_ON_CLIENT',
    STATIC_PAGE_ON_SORETO_SHOPIFY : 'STATIC_PAGE_ON_SORETO_SHOPIFY'
  },
  SHARED_URL_TYPES : {
    SHARER_POST_REWARD: 'SHARER_POST_REWARD',
    PERSONAL: 'PERSONAL',
    SHARED: 'SHARED',
    FRIEND_POST_REWARD: 'FRIEND_POST_REWARD',
    MP_SIMPLE_OFFER: 'MP_SIMPLE_OFFER'
  },
  REWARD_TYPE : {
    SHARER_PRE : 'SHARER_PRE',
    SHARER_POST : 'SHARER_POST',
    FRIEND_PRE : 'FRIEND_PRE',
    FRIEND_POST : 'FRIEND_POST'
  },
  REWARD_DISCOUNT_TYPE : {
    BATCH : 'batch-discount',
    EVERGREEN : 'discount'
  },
  MARKETPLACE : {
    OFFER : {
      TYPE: {
        SIMPLE: 'SIMPLE',
        PROMOTION: 'PROMOTION',
        CUSTOM: 'CUSTOM',
        SHARING:'SHARING'
      }
    }
  },
  AFFILIATE_FEED_STATUS,
  AFFILIATE_FEED_TYPE,
  DISPLAY_BLOCK_TYPES,
  EMAIL_TEMPLATE_TYPES
};