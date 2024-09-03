export function up(knex) {

  var query = `
      ALTER TABLE reverb.shared_url ADD COLUMN source_client_order_id TEXT;
      
      select reverb.create_view_table_js('reverb.shared_url');
 `;
  return knex.schema.raw(query);
}

export function down(knex) {

  var query = `
    DROP VIEW reverb.shared_url_js;
  
    ALTER TABLE reverb.shared_url DROP COLUMN source_client_order_id;
  
    select reverb.create_view_table_js('reverb.shared_url');
    `;

  return knex.schema.raw(query);
}