export function up(knex) {
  var query = `
    ALTER TABLE reverb.client
    ADD COLUMN template boolean not null default false;
  
    select reverb.create_view_table_js('reverb.client');`;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `

    DROP VIEW IF EXISTS reverb.agg_client_js;
    
    DROP VIEW reverb.client_js;

    ALTER TABLE reverb.client
    DROP COLUMN template;

    select reverb.create_view_table_js('reverb.client');
  `;
  return knex.schema.raw(query);
}