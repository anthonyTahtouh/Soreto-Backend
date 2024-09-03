exports.up = function up(knex) {
  return knex.schema.raw(`
    ALTER TYPE reverb.flow_type ADD VALUE 'direct_reward';
  `);
};

exports.down = function (knex) {
  return knex.schema.raw(`
    DELETE FROM pg_catalog.pg_enum WHERE enumlabel = 'direct_reward';
  `);
};

exports.config = { transaction: false };
