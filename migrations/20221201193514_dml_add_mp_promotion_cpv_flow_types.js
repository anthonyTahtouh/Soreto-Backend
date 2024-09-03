exports.up = function up(knex) {
  return knex.schema.raw(`
      ALTER TYPE reverb.flow_type ADD VALUE 'mp_promotion';
    `);
};

exports.down = function (knex) {
  return knex.schema.raw(`
      DELETE FROM pg_catalog.pg_enum WHERE enumlabel = 'mp_promotion';
    `);
};

exports.config = { transaction: false };