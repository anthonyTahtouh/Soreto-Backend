let varDefinition = {
  setting_key: 'SINGLE_USER_CODE_PER_INFRA',
  context: 'CAMPAIGN_VERSION.LANDING_PAGE',
  type: 'BOOLEAN',
  description: 'Delivers a single code to the friend landing page based on the same IP and user agent.',
  fallback_value: [false],
  value_option: [true, false],
  restrict: false,
  multi_value: false
};

exports.up = function (knex) {

  knex.schema.raw(`ALTER TYPE reverb.SETTING_CONTEXT ADD VALUE 'CAMPAIGN_VERSION.LANDING_PAGE';`);
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