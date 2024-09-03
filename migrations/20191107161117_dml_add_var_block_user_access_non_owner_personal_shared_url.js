let varDefinition = {
  setting_key: 'BLOCK_USER_ACCESS_NON_OWNER_PERSONAL_SHARED_URL',
  context: 'LANDING_PAGE',
  type: 'BOOLEAN',
  description: 'Blocks the generation of a discount code for personal shared url if the user is not the sharer',
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
