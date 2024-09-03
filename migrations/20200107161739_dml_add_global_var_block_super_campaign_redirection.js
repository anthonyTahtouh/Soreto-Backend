let varDefinition = {
  setting_key: 'BLOCK_SUPER_CAMPAIGN_REDIRECTION',
  context: 'CAMPAIGN_VERSION.CUSTOM_FIELD',
  type: 'BOOLEAN',
  description: 'Prevents magnetic behavior on super campaigns',
  fallback_value: [false],
  value_option: [true, false],
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
