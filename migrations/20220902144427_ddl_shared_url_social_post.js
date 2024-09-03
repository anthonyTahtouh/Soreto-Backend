export function up(knex) {
  var query = `
   
    DROP VIEW IF EXISTS reverb.agg_shared_url_post_js;
    DROP VIEW IF EXISTS reverb.agg_client_traction_by_date_js;
    DROP VIEW IF EXISTS reverb.shared_url_js;

    ALTER TABLE reverb.shared_url
    ADD COLUMN social_platform text;

    SELECT reverb.create_view_table_js('reverb.shared_url');
    
    `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ` 
    
    DROP VIEW IF EXISTS reverb.agg_shared_url_post_js;
    DROP VIEW IF EXISTS reverb.agg_client_traction_by_date_js;
    DROP VIEW IF EXISTS reverb.shared_url_js;
    DROP VIEW IF EXISTS reverb.agg_single_shared_js;

    ALTER TABLE reverb.shared_url
    DROP COLUMN social_platform;

    SELECT reverb.create_view_table_js('reverb.shared_url');

    `;
  return knex.schema.raw(query);
}