export function up(knex) {
  var query = `
      ALTER TABLE reverb.campaign
      ADD COLUMN country_id text;

      select reverb.create_view_table_js('reverb.campaign');

      CREATE OR REPLACE VIEW reverb.agg_campaign_js AS
      SELECT campaign._id,
        campaign.created_at AS "createdAt",
        campaign.updated_at AS "updatedAt",
        campaign.client_id AS "clientId",
        client.name AS "clientName",
        campaign.expiry,
        campaign.description,
        campaign.start_date AS "startDate",
        campaign.short_url_custom_string_component AS "shortUrlCustomStringComponent",
        campaign.country_id AS "countryId"
      FROM reverb.campaign campaign
          JOIN reverb.client client ON campaign.client_id = client._id;
      `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
      DROP VIEW reverb.campaign_js;

      ALTER TABLE reverb.campaign
      DROP COLUMN IF EXISTS country_id;

      select reverb.create_view_table_js('reverb.campaign');
    `;
  return knex.schema.raw(query);
}