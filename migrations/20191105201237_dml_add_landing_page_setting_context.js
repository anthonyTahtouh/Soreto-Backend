
exports.up = function up(knex) {
  return knex.schema.raw(`ALTER TYPE reverb.SETTING_CONTEXT ADD VALUE 'LANDING_PAGE';`);
};

exports.down = function (knex) {
  return knex.schema.raw(`DELETE FROM pg_enum WHERE enumlabel = 'LANDING_PAGE';`);
};

exports.config = { transaction: false };