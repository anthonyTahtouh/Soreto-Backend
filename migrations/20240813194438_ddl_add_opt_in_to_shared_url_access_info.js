export function up(knex) {
  var query = `
    DROP VIEW IF EXISTS reverb.shared_url_access_user_info_js;

    ALTER TABLE reverb.shared_url_access_user_info
    ADD COLUMN opt_in BOOLEAN DEFAULT FALSE;
  
    SELECT reverb.create_view_table_js('reverb.shared_url_access_user_info');
    `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
  
      DROP VIEW IF EXISTS reverb.shared_url_access_user_info_js;
  
      ALTER TABLE reverb.shared_url_access_user_info
      DROP COLUMN opt_in;

      SELECT reverb.create_view_table_js('reverb.shared_url_access_user_info');    
    `;
  return knex.schema.raw(query);
}