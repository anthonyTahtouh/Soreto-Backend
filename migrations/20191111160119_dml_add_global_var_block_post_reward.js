let varDefinition = {
  setting_key: 'POST_REWARD_BLOCKED',
  context: 'POST_REWARD',
  type: 'BOOLEAN',
  description: 'Blocks the post reward execution for a specific client. Orders will be released after unblock',
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
