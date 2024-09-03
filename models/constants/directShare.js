/**
 * This configuration gonna be useful for the entire project
 *
 * Move it for a more 'shared' file to be used by other places
 */

var config = require('../../config/config');

var channelProps = {
  FACEBOOK: {
    shareMessageField:  'SHARE_MESSAGE_FACEBOOK',
    baseUrl:'https://www.facebook.com/sharer/sharer.php?u='
  },
  TWITTER:{
    shareMessageField:  'SHARE_MESSAGE_TWITTER',
    baseUrl: 'https://twitter.com/intent/tweet?text='
  },
  GOOGLE:{
    shareMessageField:  'SHARE_MESSAGE_GOOGLE',
    baseUrl:'https://plus.google.com/share?url='
  },
  PINTEREST:{
    shareMessageField:  'SHARE_MESSAGE_PINTEREST',
    pinterestImageField: 'SHARE_IMAGE_PINTEREST',
    baseUrl:'https://www.pinterest.com/pin/create/button/?url='
  },
  WHATSAPP:{
    shareMessageField:  'SHARE_MESSAGE_WHATSAPP',
    baseUrl: config.BACK_URL + '/whatsapp?text='
  },
  MESSENGER:{
    shareMessageField:  'SHARE_MESSAGE_MESSENGER',
    baseUrl: config.BACK_URL + '/shareViaMessenger?url='
  },
  EMAIL:{
    shareMessageField:  'SHARE_MESSAGE_EMAIL',
    clientIdVar: '@@CLIENT_ID',
    baseUrl: config.BACK_URL + '/placement/@@CLIENT_ID/shareviaemail/?url='
  }
};

var allowed = ['FACEBOOK', 'TWITTER','GOOGLE','PINTEREST', 'WHATSAPP', 'MESSENGER', 'EMAIL'];

var directShare = {
  channelProps: channelProps,
  allowedChannels: allowed,
  productUrlField: 'PRODUCT_URL',
  camVerCustomFieldGKey: 'CAMPAIGN_VERSION.CUSTOM_FIELD'
};

module.exports = directShare;