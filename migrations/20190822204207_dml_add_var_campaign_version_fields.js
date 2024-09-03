const CONTEXT = 'CAMPAIGN_VERSION.CUSTOM_FIELD';
const TYPE = 'TEXT';

const shareMessageFacebook = {
  setting_key: 'SHARE_MESSAGE_FACEBOOK',
  context: CONTEXT,
  type: TYPE,
  description: '',
  fallback_value: [''],
  restrict: false,
  multi_value: false
};

const shareMessageWhatsapp = {
  setting_key: 'SHARE_MESSAGE_WHATSAPP',
  context: CONTEXT,
  type: TYPE,
  description: '',
  fallback_value: [''],
  restrict: false,
  multi_value: false
};

const shareMessageTwitter = {
  setting_key: 'SHARE_MESSAGE_TWITTER',
  context: CONTEXT,
  type: TYPE,
  description: '',
  fallback_value: [''],
  restrict: false,
  multi_value: false
};

const shareMessagePinterest = {
  setting_key: 'SHARE_MESSAGE_PINTEREST',
  context: CONTEXT,
  type: TYPE,
  description: '',
  fallback_value: [''],
  restrict: false,
  multi_value: false
};

const shareImagePinterest = {
  setting_key: 'SHARE_IMAGE_PINTEREST',
  context: CONTEXT,
  type: TYPE,
  description: '',
  fallback_value: [''],
  restrict: false,
  multi_value: false
};

const productUrl = {
  setting_key: 'PRODUCT_URL',
  context: CONTEXT,
  type: TYPE,
  description: '',
  fallback_value: [''],
  restrict: false,
  multi_value: false
};

const values = [shareMessageFacebook, shareMessageWhatsapp, shareMessageTwitter, shareMessagePinterest, shareImagePinterest, productUrl];

exports.up = function (knex) {

  return knex
    .batchInsert('reverb.var_definition', values, 10);
};

exports.down = function (knex) {

  return knex('reverb.var_definition')
    .delete()
    .whereIn('setting_key', values.map(x => x.setting_key))
    .andWhere(
      {
        context: CONTEXT,
        client_id: null
      });
};