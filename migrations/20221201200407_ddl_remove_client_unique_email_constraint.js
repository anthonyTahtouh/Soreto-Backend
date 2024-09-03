exports.up = function up(knex) {
  return knex.schema.raw(`
        ALTER TABLE reverb.client DROP constraint if EXISTS client_email_unique;
      `);
};

exports.down = function (knex) {
  return knex.schema.raw(`
        ALTER TABLE reverb.client ADD CONSTRAINT client_email_unique UNIQUE (email);
      `);
};

exports.config = { transaction: false };