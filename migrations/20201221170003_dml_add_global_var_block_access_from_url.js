let varDefinition = {
  setting_key: 'BLOCK_USER_ACCESS_FROM_URLS',
  context: 'LANDING_PAGE',
  type: 'TEXT',
  description: 'Blocks the friend landing page access from a defined domain regex',
  fallback_value: [''],
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
    .where(
      {
        setting_key: varDefinition.setting_key,
        context: varDefinition.context,
        client_id: null
      });
};