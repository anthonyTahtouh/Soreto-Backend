
exports.up = function up(knex) {
  return knex.schema.raw(`ALTER TYPE reverb.SETTING_CONTEXT ADD VALUE 'CAMPAIGN_VERSION.CUSTOM_FIELD';`);
};

exports.down = function (knex) {
  return knex.schema.raw(`DELETE FROM pg_enum WHERE enumlabel = 'CAMPAIGN_VERSION.CUSTOM_FIELD';`);
};

exports.config = { transaction: false };