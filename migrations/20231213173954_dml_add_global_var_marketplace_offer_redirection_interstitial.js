let varDefinition = {
  setting_key: 'MARKETPLACE_OFFER_REDIRECTION',
  context: 'CAMPAIGN_VERSION.LANDING_PAGE',
  type: 'BOOLEAN',
  description: 'Show marketplace offer redirection on friend landing page',
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