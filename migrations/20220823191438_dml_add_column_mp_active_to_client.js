
exports.up = function(knex) {
  var query = `
    ALTER TABLE reverb.client
    ADD COLUMN mp_active boolean not null default false;
  
    select reverb.create_view_table_js('reverb.client');`;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
    DROP VIEW IF EXISTS reverb.agg_client_js;
    
    DROP VIEW reverb.client_js;

    ALTER TABLE reverb.client
    DROP COLUMN mp_active;

    select reverb.create_view_table_js('reverb.client');
  `;
  return knex.schema.raw(query);
};
