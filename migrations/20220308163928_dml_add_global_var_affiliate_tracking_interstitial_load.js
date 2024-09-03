let varDefinition = {
  setting_key: 'AFFILIATE_TRACK_ON_LOAD',
  context: 'CAMPAIGN_VERSION.LANDING_PAGE',
  type: 'BOOLEAN',
  description: 'Registers an affiliate track event during the landing page load',
  fallback_value: [false],
  value_option: [true, false],
  restrict: false,
  multi_value: false
};

exports.up = function (knex) {

  return knex('reverb.var_definition')
    .insert(varDefinition);
};

exports.down = function (knex) {

  return knex('reverb.var_definition')
    .delete()
    .where({
      setting_key: varDefinition.setting_key,
      context: varDefinition.context,
      client_id: null
    });
};