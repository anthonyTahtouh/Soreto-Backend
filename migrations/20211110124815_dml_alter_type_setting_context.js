
exports.up = function(knex) {
  return knex.schema.raw(`ALTER TYPE reverb.SETTING_CONTEXT ADD VALUE 'CLIENT.TRACKING';`);
};

exports.down = function(knex) {
  return knex.schema.raw(`DELETE FROM pg_enum WHERE enumlabel = 'CLIENT.TRACKING';`);
};

exports.config = { transaction: false };