export function up(knex) {
  var query = `
                ALTER TABLE reverb.shared_url_access
                  ADD COLUMN session_id TEXT;
  
                SELECT reverb.create_view_table_js('reverb.shared_url_access');
                `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
                DROP VIEW reverb.shared_url_access_js;
          
                ALTER TABLE reverb.shared_url_access
                  DROP COLUMN IF EXISTS session_id;
          
                SELECT reverb.create_view_table_js('reverb.shared_url_access');
              `;
  return knex.schema.raw(query);
}