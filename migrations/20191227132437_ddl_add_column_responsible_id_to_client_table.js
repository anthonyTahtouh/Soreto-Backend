export function up(knex) {
  var query = `
    ALTER TABLE reverb.client
    ADD COLUMN responsible_id text;
  
    select reverb.create_view_table_js('reverb.client');`;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
    DROP VIEW reverb.client_js;

    ALTER TABLE reverb.client
    DROP COLUMN responsible_id;

    select reverb.create_view_table_js('reverb.client');
  `;
  return knex.schema.raw(query);
}