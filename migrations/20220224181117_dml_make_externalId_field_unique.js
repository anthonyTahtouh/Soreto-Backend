exports.up = function (knex) {
  var query = `
      DROP VIEW IF EXISTS reverb.client_js;

      ALTER TABLE reverb.client DROP COLUMN external_id;
      ALTER TABLE reverb.client ADD COLUMN external_id TEXT DEFAULT NULL UNIQUE;

      select reverb.create_view_table_js('reverb.client');
      `;
  return knex.schema.raw(query);
};

exports.down = function (knex) {
  var query = `
      DROP VIEW IF EXISTS reverb.client_js;

      ALTER TABLE reverb.client DROP COLUMN external_id;
      ALTER TABLE reverb.client ADD COLUMN external_id TEXT DEFAULT NULL;

      select reverb.create_view_table_js('reverb.client');
  `;

  return knex.schema.raw(query);
};
