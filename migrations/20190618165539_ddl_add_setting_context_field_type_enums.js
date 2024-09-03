
exports.up = function(knex) {

  const scriptSql = `
        CREATE TYPE reverb.SETTING_CONTEXT AS ENUM (
        'CLIENT',
        'CAMPAIGN',
        'CAMPAIGN_VERSION',
        'INTERSTITIAL',
        'CODE_BLOCK',
        'REWARD_POOL',
        'REWARD',
        'POST_REWARD',
        'INTEGRATION',
        'GENERIC');
        CREATE TYPE reverb.FIELD_TYPE AS ENUM ('NUMERIC', 'TEXT', 'ARRAY', 'BOOLEAN', 'DATE', 'DATETIME', 'TIMESTAMP');
    `;
  return knex.schema.raw(scriptSql);
};

exports.down = function(knex) {
  const scriptSql = `
    
        DROP VIEW IF EXISTS reverb.agg_vars_js;
        DROP FUNCTION IF EXISTS reverb.func_get_var;
        DROP VIEW IF EXISTS reverb.global_vars_js;
        DROP FUNCTION IF EXISTS reverb.check_var_definition_constraint;
        DROP TYPE reverb.SETTING_CONTEXT;
        DROP TYPE reverb.FIELD_TYPE;
`;
  return knex.schema.raw(scriptSql);
};
