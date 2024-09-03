export function up(knex) {
  var query = `
  ALTER TABLE reverb.shared_url_access_user_info
  ADD COLUMN shared_url_access_id text;

  ALTER TABLE reverb.shared_url_access_user_info
  ADD CONSTRAINT shared_url_access_id_fk FOREIGN KEY (shared_url_access_id) REFERENCES reverb.shared_url_access (_id);

  DROP VIEW IF EXISTS reverb.shared_url_access_user_info_js;
  SELECT reverb.create_view_table_js('reverb.shared_url_access_user_info');
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `

    DROP VIEW IF EXISTS reverb.shared_url_access_user_info_js;

    ALTER TABLE reverb.shared_url_access_user_info
    DROP COLUMN shared_url_access_id;
  
  `;
  return knex.schema.raw(query);
}