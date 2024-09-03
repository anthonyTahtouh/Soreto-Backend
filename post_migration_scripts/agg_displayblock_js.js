
exports.seed = function(knex) {
  return knex.raw(`
    CREATE OR REPLACE VIEW reverb.agg_displayblock_js AS
    SELECT displayblock._id,
        displayblock.created_at AS "createdAt",
        displayblock.updated_at AS "updatedAt",
        displayblock.active,
        displayblock.name,
        displayblock.type,
        campaignversion.name AS "campaignVersionName",
        campaign.description AS "campaignName",
        client.name AS "clientName",
        displayblock.archived,
        campaign.country_id as "countryId",
        country.name as "countryName"
      FROM reverb.display_block displayblock
        JOIN reverb.campaign_version campaignversion ON displayblock.campaign_version_id = campaignversion._id
        JOIN reverb.campaign campaign ON campaignversion.campaign_id = campaign._id
        JOIN reverb.client client ON campaign.client_id = client._id
        JOIN reverb.country country ON campaign.country_id = country._id;        
          `);
};