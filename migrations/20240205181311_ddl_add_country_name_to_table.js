
exports.up = function(knex) {
  let query = `
    ALTER TABLE reverb.country ADD COLUMN country_name TEXT;

    UPDATE reverb.country SET country_name = name;

    ALTER TABLE reverb.country ALTER COLUMN country_name SET NOT NULL;

    select reverb.create_view_table_js('reverb.country');
    `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  let query = `
    DROP VIEW IF EXISTS reverb.country_js;

    ALTER TABLE reverb.country DROP COLUMN country_name;

    select reverb.create_view_table_js('reverb.country');
    `;
  return knex.schema.raw(query);
};
