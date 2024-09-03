let varDefinition = {
  setting_key: 'SHARED_URL_DISCOUNT_CODE_QUOTA',
  context: 'CAMPAIGN_VERSION.REWARD',
  type: 'NUMERIC',
  description: 'Creates a quota of Discount Code per Shared Url',
  fallback_value: [0],
  restrict: false,
  multi_value: false
};

exports.up = function(knex) {

  return knex('reverb.var_definition')
    .insert(varDefinition);
};

exports.down = function(knex) {

  return knex('reverb.var_definition')
    .delete()
    .where(
      {
        setting_key : varDefinition.setting_key,
        context: varDefinition.context,
        client_id: null
      });
};