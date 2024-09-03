export function up(knex) {
  var query = `
    ALTER TABLE reverb.client
    ADD COLUMN shopify_enabled boolean not null default false;

    ALTER TABLE reverb.client ADD COLUMN shopify_domain TEXT DEFAULT NULL;

    select reverb.create_view_table_js('reverb.client');

    ALTER TABLE reverb.campaign_version
    ADD COLUMN shopify_img_url TEXT DEFAULT NULL;
    
    select reverb.create_view_table_js('reverb.campaign_version');
    `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `    

    DROP VIEW IF EXISTS reverb.agg_campaign_version_configuration_js;
    DROP VIEW IF EXISTS reverb.client_js;
    
    ALTER TABLE reverb.client DROP COLUMN shopify_enabled;
    ALTER TABLE reverb.client DROP COLUMN shopify_domain;

    select reverb.create_view_table_js('reverb.client');

    DROP VIEW reverb.campaign_version_js;

    ALTER TABLE reverb.campaign_version
    DROP COLUMN shopify_img_url;

    select reverb.create_view_table_js('reverb.campaign_version');
  `;
  return knex.schema.raw(query);
}
