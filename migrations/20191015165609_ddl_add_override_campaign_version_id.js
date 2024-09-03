export function up(knex) {
  var query = `

        ALTER TABLE reverb.order
            ADD COLUMN override_campaign_version_id TEXT;

        ALTER TABLE reverb.shared_url_access
            ADD COLUMN override_campaign_version_id TEXT;
          
        SELECT reverb.create_view_table_js('reverb.order');
        SELECT reverb.create_view_table_js('reverb.shared_url_access');
    `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
        
        DROP VIEW IF EXISTS reverb.agg_client_traction_by_date_js;
        DROP VIEW IF EXISTS reverb.order_js;
        DROP VIEW IF EXISTS reverb.agg_shared_url_meta_client_js; -- dropped permanently it no being used place
        DROP VIEW IF EXISTS reverb.agg_shared_url_meta_user_js; -- dropped permanently it no being used place
        DROP VIEW IF EXISTS reverb.shared_url_access_js;
        
        ALTER TABLE reverb.order
            DROP COLUMN IF EXISTS override_campaign_version_id;

        ALTER TABLE reverb.shared_url_access
            DROP COLUMN IF EXISTS override_campaign_version_id;
  
        SELECT reverb.create_view_table_js('reverb.order');
        SELECT reverb.create_view_table_js('reverb.shared_url_access');
    `;
  return knex.schema.raw(query);
}