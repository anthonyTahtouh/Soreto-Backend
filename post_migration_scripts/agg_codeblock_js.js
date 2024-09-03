
exports.seed = function(knex) {
  return knex.raw(`
  CREATE OR REPLACE VIEW reverb.agg_codeblock_js AS
  SELECT codeblock._id,
      codeblock.created_at AS "createdAt",
      codeblock.updated_at AS "updatedAt",
      codeblock.active,
      codeblock.name,
      campaignversion.name AS "campaignVersionName",
      displayblock.name AS "displayBlockName",
      campaign.description AS "campaignName",
      client.name AS "clientName",
      codeblock.archived,
      campaign.country_id as "countryId",
      country.name as "countryName",
      displayblock._id AS "displayBlockId"
    FROM reverb.code_block codeblock
      JOIN reverb.display_block displayblock ON codeblock.display_block_id = displayblock._id
      JOIN reverb.campaign_version campaignversion ON displayblock.campaign_version_id = campaignversion._id
      JOIN reverb.campaign campaign ON campaignversion.campaign_id = campaign._id
      JOIN reverb.client client ON campaign.client_id = client._id
      JOIN reverb.country country ON campaign.country_id = country._id
        `);
};