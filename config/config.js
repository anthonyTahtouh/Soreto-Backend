var options = {
  SESSION_SECRET: process.env.SESSION_SECRET || 's0meSup3rC0mpleXPa$$w0rd',
  TOKEN_SECRET: process.env.TOKEN_SECRET || 's0meSup3rC0mpleXPa$$w0rd',
  COOKIE_SECRET: process.env.COOKIE_SECRET || 'eNboeOJQ6l$NiMM!VY2E#7bw735li$7a',
  SERVER_PROTOCOL: process.env.SERVER_PROTOCOL || 'http',
  SERVER_HOSTNAME: process.env.SERVER_HOSTNAME || 'localhost',
  SERVER_PORT: process.env.PORT || process.env.SERVER_PORT || 5000,
  FRONT_URL: process.env.FRONT_URL || 'http://localhost:4000',
  BACK_URL: process.env.BACK_URL || 'http://localhost:5000',
  SHARE_URL: process.env.SHARE_URL || 'http://localhost:5000' ,
  DIST_URL: process.env.DIST_URL || 'http://localhost:8081',
  DB_CERT_CRYPT: process.env.DB_CERT_CRYPT || null,
  DB_CERT_PRODUCT: process.env.DB_CERT_PRODUCT || null,
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: process.env.REDIS_PORT || '6379',
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || null,
  REDIS_SESSION_DB: process.env.REDIS_SESSION_DB || 0,
  REDIS_CACHE_DB: process.env.REDIS_CACHE_DB || 1,
  REDIS_CAMPAIGN_VERSION_DB: (process.env.NODE_ENV == 'prod') ? 4 : 0,
  REDIS_VARS_DB: (process.env.NODE_ENV == 'test') ? 10 : (process.env.REDIS_VARS_DB || 2),
  REDIS_CONN_RETRY: process.env.REDIS_CONN_RETRY || 5,
  ENV: process.env.NODE_ENV || 'dev',
  DEPLOYMENT_ENVIROMENT: process.env.DEPLOYMENT_ENVIROMENT || 'dev',
  DEPLOYED_ENVIRONMENT: !(process.env.NODE_ENV == 'test' ||  process.env.NODE_ENV === 'dev'),
  DISCOUNT: {
    CUSTOM_LIST:process.env.DISCOUNT_CUSTOM_LIST || '[]',  // example '[{"id":"59663f039a92e215cb60e79","name":"baa"}]'
  },
  ANALYTICS: {
    LOGENTRIES:{
      INFO_TOKEN:process.env.ANALYTICS_LOGENTRIES_INFO_TOKEN || 'XX2238da1f-2029-4d65-9c09-1666bb3b3506',
      ERROR_TOKEN:process.env.ANALYTICS_LOGENTRIES_ERROR_TOKEN || 'XX2238da1f-2029-4d65-9c09-1666bb3b3506'
    },
    MIXPANEL: {
      TOKEN: process.env.ANALYTICS_MIXPANEL_TOKEN || '65baf3250bf4bc5ef55cfa9a9f5c7d71'
    },
    GA: {
      TOKEN: process.env.ANALYTICS_GA_TOKEN || 'UA-126876051-10'
    },
    COOKIE: {
      KEY: process.env.ANALYTICS_COOKIE_KEY || 'reverbAnalytics',
      YEARS: process.env.ANALYTICS_COOKIE_DAYS || 10
    }
  },
  MQ: {
    URL: process.env.MQ_URL || 'amqp://guest:guest@localhost:5672',
    TYPE: process.env.MQ_TYPE || 'amqp'
  },
  COOKIE: {
    DOMAIN: process.env.COOKIE_DOMAIN || '127.0.0.1',
    DAYS: process.env.COOKIE_DAYS || 28,
    KEY: 'reverbToken',
    KEY_ID: 'reverbId',
    KEY_SHARE: 'reverbShareId',
    KEY_ACCESS: 'reverbShareAccess',
    TIMEOUT: process.env.COOKIE_TIMEOUT || 15, // cookie timeout in minutes,
    SECURE: process.env.COOKIE_SECURE || false
  },
  MAIL: {
    TEST_EMAIL: process.env.TEST_EMAIL,
    API_URL: process.env.MAIL_API_URL || 'https://api.sendinblue.com/v2.0',
    API_KEY: process.env.MAIL_API_KEY || null,
    TEMPLATES: {
      CONFIRM_USER: parseInt(process.env.MAIL_TEMPLATES_CONFIRM_USER),
      CONFIRM_USER_MARKETPLACE: process.env.MAIL_TEMPLATES_CONFIRM_USER_MARKETPLACE,
      WELCOME_USER: parseInt(process.env.MAIL_TEMPLATES_WELCOME_USER),
      SIGNUP_UNREG: parseInt(process.env.MAIL_TEMPLATES_SIGNUP_UNREG),
      WELCOME_CLIENT: parseInt(process.env.MAIL_TEMPLATES_WELCOME_CLIENT),
      PASSWORD_RESET: process.env.MAIL_TEMPLATES_PASSWORD_RESET,
      PASSWORD_RESET_MARKETPLACE: process.env.MAIL_TEMPLATES_PASSWORD_RESET_MARKETPLACE,
      SHARE_VIA_EMAIL: 14,
      PASSWORDLESS_AUTH_MARKETPLACE: process.env.MAIL_TEMPLATES_PASSWORDLESS_AUTH_MARKETPLACE,
      WELCOME_MARKETPLACE: process.env.MAIL_WELCOME_MARKETPLACE,
      WELCOME_FROM_SOCIALMEDIA_REGISTRATION_MARKETPLACE: process.env.WELCOME_FROM_SOCIALMEDIA_REGISTRATION_MARKETPLACE,
      TWO_FACTOR_AUTH_ENABLED: process.env.MAIL_TEMPLATES_TWO_FACTOR_AUTH_ENABLED

    },
    QUEUE: {
      SEND_CRON_FREQUENCY: process.env.MAIL_QUEUE_SEND_CRON_FREQUENCY || '*/5 * * * *'
    },
    MANDRILL_API_KEY: process.env.MANDRILL_API_KEY || null,
    TEST_USER_EMAILS: process.env.MAIL_TEST_USER_EMAILS ? process.env.MAIL_TEST_USER_EMAILS.split(',') : null
  },
  GOOGLE_RECAPTCHA:{
    DATA_SITEKEY:'6LdWhUcUAAAAABZtofnaG_L1hXOx8nk13jGqGp6_',
    SECRET: process.env.GOOGLE_RECAPTCHA_SECRET_KEY || '6LdWhUcUAAAAAJW8FhoyWVdyRH6CTvvJ4XBVaeIH'
  },
  AWS: {
    ACCESS_KEY: process.env.AWS_ACCESS_KEY,
    ACCESS_SECRET: process.env.AWS_ACCESS_SECRET,
    REGION: 'eu-west-1',
    IMAGE_BUCKET: process.env.AWS_IMAGE_BUCKET || 's3-reverb-images',
    HOSTING_BUCKET: process.env.AWS_HOSTING_BUCKET || 's3-reverb-hosting',
    DYNAMO : {
      URL: process.env.AWS_DYNAMO_URL || 'http://localhost:55013',
      REGION: process.env.AWS_DYNAMO_REGION || 'eu-west-1',
      ACCESS_KEY: process.env.AWS_DYNAMO_ACCESS_KEY || '',
      ACCESS_SECRET: process.env.AWS_DYNAMO_ACCESS_SECRET || '',
    }
  },
  IMG: {
    SRC: process.env.IMG_SRC || 'https://s3-eu-west-1.amazonaws.com/s3-reverb-images'
  },
  HOSTING: {
    SRC: process.env.HOSTING_SRC || 'https://s3-eu-west-1.amazonaws.com/s3-reverb-hosting'
  },
  ABBREVIATION:{
    PLACEMENTS:{
      lb:'lightbox',
      lbw:'lightboxwrapper',
      vcp:'voucher-page',
      itl:'interstitial'
    }
  },
  SOCIAL: {
    FACEBOOK: {
      APP_ID: process.env.FACEBOOK_APP_ID || '269814300077467',
      APP_SECRET: process.env.FACEBOOK_APP_SECRET || 'd78792a33c50445a597a5d467471186b',
      URL_BASE: process.env.FACEBOOK_URL_BASE || 'https://graph.facebook.com/v2.6',
      REFERERS: ['://facebook.com', '://www.facebook.com', '://m.facebook.com'],
      SCOPE_CONNECT: ['publish_actions', 'public_profile', 'email', 'user_birthday', 'user_location'],
      CLIENT_ID: process.env.FACEBOOK_CLIENT_ID || 'XXX',
      CLIENT_SECRET: process.env.FACEBOOK_CLIENT_SECRET || 'XXX'
    },
    INSTAGRAM: {
      REFERERS: ['://instagram.com', '://www.instagram.com']
    },
    TWITTER: {
      APP_ID: process.env.TWITTER_APP_ID || 'Eu2U2Gn8fROPaAcIzskeEXslv',
      APP_SECRET: process.env.TWITTER_APP_SECRET || 'O8Gd0CMZCFUSl7xKw8wyOiPUlxk81vyP9rJ81RchAZv1rPlHlX',
      REFERERS: ['://twitter.com', '://t.co']
    },
    PINTEREST: {
      APP_ID: process.env.PINTEREST_APP_ID || '4890870307446860884',
      APP_SECRET: process.env.PINTEREST_APP_SECRET || 'ca3e2f8086a14dfc073a7d01c6040fc1037c9376191a25afa3e964d1320718fe',
      URL_BASE: process.env.PINTEREST_URL_BASE || 'https://api.pinterest.com/v1',
      REFERERS: ['://pinterest.com'],
      BOARD_NAME: 'Soreto'
    },
    GOOGLE: {
      APP_ID: process.env.GOOGLE_APP_ID || 'xxxxx',
      APP_SECRET: process.env.GOOGLE_APP_SECRET || 'xxxxx',
      APP_ID_IOS: process.env.GOOGLE_APP_ID_IOS || 'xxxxx',
      APP_ID_ANDROID: process.env.GOOGLE_APP_ID_ANDROID || 'xxxxx',
      REFERERS: ['://google.com'],
      SCOPE_CONNECT: ['https://www.googleapis.com/auth/plus.me', 'https://www.googleapis.com/auth/plus.profile.emails.read', 'https://www.googleapis.com/auth/plus.stream.write']
    }
  },
  SHAREBRAND: {
    DEFAULT: {
      LOGO: 'b6dacc18981c3f57e88a966c360fc8b2.png',
      TEXT: 'Would your friends love this product? Share it now. If they buy, you can earn ££.'
    }
  },
  TERMS: {
    REWARD_CLEAR: 30
  },
  QUERY: {
    PRODUCT_TRENDING_DAYS: process.env.QUERY_PRODUCT_TRENDING_DAYS || 14,
    PRODUCT_TRENDING_LIMIT: process.env.QUERY_PRODUCT_TRENDING_LIMIT || 30
  },
  TMP_FOLDER: '/tmp/',
  SYSTEM: {
    DEFAULT_USER_EMAIL: 'system@soreto.com',
    DEFAULT_USER_PASSWORD: 'abcd1234'
  },
  BI: {
    ELASTICSEARCH : {
      URL : process.env.BI_ELASTIC_SEARCH_URL || 'http://localhost',
      PORT: process.env.BI_ELASTIC_SEARCH_PORT,
      INDEX_SUFIX: process.env.BI_ELASTIC_SEARCH_INDEX_SUFIX || 'release'
    },
    TRACKING: {
      URL: process.env.BI_TRACKING_URL || '',
      AUTHORIZATION_TOKEN: process.env.BI_TRACKING_AUTHORIZATION_TOKEN || ''
    },
  },
  BI2: {
    ELASTICSEARCH : {
      URL : process.env.BI2_ELASTIC_SEARCH_URL || 'http://localhost',
      PORT: process.env.BI2_ELASTIC_SEARCH_PORT,
      INDEX_SUFIX: process.env.BI2_ELASTIC_SEARCH_INDEX_SUFIX || 'release'
    }
  },
  MARKETPLACE : {
    DEFAULT_USER_EMAIL: process.env.MARKETPLACE_DEFAULT_USER_EMAIL || 'marketplace_user@soreto.com',
    ALLOWED_URLS: process.env.MARKETPLACE_ALLOWED_URLS ? process.env.MARKETPLACE_ALLOWED_URLS.split(',') : ['http://localhost:4000/'],
    AWS_BUCKET: process.env.MARKETPLACE_AWS_BUCKET || 'soreto-dev',
    AWS_BUCKET_BASE_DNS_URL: process.env.AWS_BUCKET_BASE_DNS_URL,
    URL: process.env.MARKETPLACE_URL || 'http://localhost:3000',
    OG_IMAGE : {
      CARD_URL: 'https://dist.soreto.com/marketplace/brands/brands_fallback_soreto.png',
      LOGO_URL: 'https://dist.soreto.com/marketplace/brands/brands_fallback_soreto.png',
      COVER_URL: 'https://dist.soreto.com/marketplace/brands/brands_fallback_soreto.png',
      OFFER_CARD_FALLBACK: 'https://dist.soreto.com/marketplace/brands/brands_fallback_soreto.png'
    },
  },
  PLATFORM_SECURITY: {
    SALT_SECRET: process.env.PLATFORM_SECURITY_SALT_SECRET || 'GSt896bXt618lL',
    CLIENT_ORDER_FRESH_USER : {
      REDIS_DB: process.env.REDIS_CLIENT_ORDER_FRESH_USER_DB || 1,
      DELAY_ADD_CACHE: process.env.CLIENT_ORDER_FRESH_USER_DELAY_ADD_CACHE || 30000
    },
    SHARED_URL : {
      REDIS_DB: process.env.REDIS_SHARED_URL_DB || 1
    },
    API_THROTTLING: {
      ENABLED: process.env.PLATFORM_SECURITY_API_THROTTLING_ENABLED ? process.env.PLATFORM_SECURITY_API_THROTTLING_ENABLED == 'true' : false,
      IN_MEMORY_REFRESH_FREQUENCY: process.env.PLATFORM_SECURITY_API_THROTTLING_IN_MEMORY_REFRESH_FREQUENCY ? Number(process.env.PLATFORM_SECURITY_API_THROTTLING_IN_MEMORY_REFRESH_FREQUENCY): 60000,
      MAX_REQUESTS_ALLOWED_PER_DAY: process.env.PLATFORM_SECURITY_API_THROTTLING_MAX_REQUESTS_ALLOWED_PER_DAY ? Number(process.env.PLATFORM_SECURITY_API_THROTTLING_MAX_REQUESTS_ALLOWED_PER_DAY): 30,
    }
  },
  THIRD_PARTY_INTEGRATION: {
    PROXY: {
      HOST: process.env.THIRD_PARTY_INTEGRATION_PROXY_HOST,
      PORT: process.env.THIRD_PARTY_INTEGRATION_PROXY_PORT,
      USERNAME: process.env.THIRD_PARTY_INTEGRATION_PROXY_USERNAME,
      PASSWORD: process.env.THIRD_PARTY_INTEGRATION_PROXY_PASSWORD
    },
    PARTNERS: {
      MATALAN: {
        URI: process.env.THIRD_PARTY_INTEGRATION_PARTNERS_MATALAN_URI,
        API_KEY: process.env.THIRD_PARTY_INTEGRATION_PARTNERS_MATALAN_API_KEY,
        ENCRYPT_SALT: process.env.THIRD_PARTY_INTEGRATION_PARTNERS_MATALAN_ENCRYPT_SALT,
        USE_PROXY: process.env.THIRD_PARTY_INTEGRATION_PARTNERS_MATALAN_USE_PROXY,
      }
    }
  },
  SHOPIFY: {
    APP_CLIENT_SECRET: process.env.SHOPIFY_APP_CLIENT_SECRET,
    TOKEN_CIPHER_KEY: process.env.SHOPIFY_TOKEN_CIPHER_KEY,
    TOKEN_CIPHER_INIT_VECTOR: process.env.SHOPIFY_TOKEN_CIPHER_INIT_VECTOR
  },
  init: function () {
    var self = this;

    switch (self.ENV) {
    case 'test':
      self.DB_URI = process.env.DB_TEST_URL || 'postgres://postgres:soreto_dev_2024!@localhost:5432/reverb_test';
      break;
    default:
      self.DB_URI = process.env.DATABASE_URL || 'postgres://postgres:soreto_dev_2024!@localhost:5432/reverb';
    }

    self.BASE_URL = self.SERVER_PROTOCOL + '://' + self.SERVER_HOSTNAME;
    self.MAIL.ENABLED = self.ENV === 'test' ? false : true;
    self.SOCIAL.FACEBOOK.URL_ACCESSTOKEN = process.env.FACEBOOK_URL_ACCESSTOKEN || self.SOCIAL.FACEBOOK.URL_BASE + '/oauth/access_token';
    self.SOCIAL.FACEBOOK.URL_USERINFO = process.env.FACEBOOK_URL_USERINFO || self.SOCIAL.FACEBOOK.URL_BASE + '/me';
    self.SOCIAL.FACEBOOK.URL_PHOTOS = process.env.FACEBOOK_URL_PHOTOS || self.SOCIAL.FACEBOOK.URL_BASE + '/me/photos';
    self.SOCIAL.FACEBOOK.URL_FEED = process.env.FACEBOOK_URL_FEED || self.SOCIAL.FACEBOOK.URL_BASE + '/me/feed';
    self.SOCIAL.FACEBOOK.URL_TOKEN_DEBUG = process.env.FACEBOOK_URL_TOKEN_DEBUG || self.SOCIAL.FACEBOOK.URL_BASE + '/debug_token';
    self.SOCIAL.PINTEREST.URL_ACCESSTOKEN = process.env.PINTEREST_URL_ACCESSTOKEN || self.SOCIAL.PINTEREST.URL_BASE + '/oauth/token';
    self.SOCIAL.PINTEREST.URL_USERINFO = process.env.PINTEREST_URL_USERINFO || self.SOCIAL.PINTEREST.URL_BASE + '/me';
    self.SOCIAL.PINTEREST.URL_PINS = process.env.PINTEREST_URL_PINS || self.SOCIAL.PINTEREST.URL_BASE + '/pins/';
    self.SOCIAL.PINTEREST.URL_BOARDS_GET = process.env.PINTEREST_URL_BOARDS_GET || self.SOCIAL.PINTEREST.URL_BASE + '/me/boards/';
    self.SOCIAL.PINTEREST.URL_BOARDS_CREATE = process.env.PINTEREST_URL_BOARDS_CREATE || self.SOCIAL.PINTEREST.URL_BASE + '/boards/';
    return self;
  }
}.init();

module.exports = options;
