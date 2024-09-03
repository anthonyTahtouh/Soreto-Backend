let varDefinition = {
  setting_key: 'ALLOWED_ORDER_STATUS',
  context: 'POST_REWARD',
  type: 'TEXT',
  description: 'This configuration will set the allowed Order status to execute a Post Reward',
  fallback_value: ['PAID'],
  value_option: ['PAID', 'PENDING', 'CANCELLED', 'VOID', 'THIRD_PARTY_PENDING'],
  restrict: false,
  multi_value: true
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
