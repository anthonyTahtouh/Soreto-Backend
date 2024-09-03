exports.up = function(knex) {
  return knex.schema.raw(`ALTER TYPE reverb.SETTING_CONTEXT ADD VALUE 'CAMPAIGN_VERSION.REWARD';`);
};

exports.down = function(knex) {
  return knex.schema.raw(`DELETE FROM pg_enum WHERE enumlabel = 'CAMPAIGN_VERSION.REWARD';`);
};

exports.config = { transaction: false };