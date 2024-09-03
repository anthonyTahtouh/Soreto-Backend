exports.up = function up(knex) {
  return knex.schema.raw(`
    ALTER TYPE reverb.flow_type ADD VALUE 'custom_flow';
  `);
};

exports.down = function (knex) {
  return knex.schema.raw(`
    DELETE FROM pg_catalog.pg_enum WHERE enumlabel = 'custom_flow';
  `);
};

exports.config = { transaction: false };
