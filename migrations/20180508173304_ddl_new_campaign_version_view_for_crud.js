exports.up = function(knex) {
  var query = `
    CREATE OR REPLACE VIEW reverb.agg_campaign_version_js AS
    select
        campaignVersion._id,
        campaignVersion.created_at as "createdAt",
        campaignVersion.updated_at as "updatedAt",
        campaignVersion.active,
        campaignVersion.name,
        campaign.description as "campaignName",
        client.name as "clientName"
    from
        reverb.campaign_version campaignVersion
        join reverb.campaign campaign
            on campaignVersion.campaign_id = campaign._id
        join reverb.client client
            on campaign.client_id = client._id
    `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
          DROP VIEW reverb.agg_campaign_version_js;
            `;
  return knex.schema.raw(query);
};
