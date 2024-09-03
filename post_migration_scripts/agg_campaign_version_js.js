exports.seed = function(knex) {
  return knex.raw(`
      DROP VIEW reverb.agg_campaign_version_js;
      CREATE OR REPLACE VIEW reverb.agg_campaign_version_js AS
        SELECT 
        campaignversion._id,
        campaignversion.created_at AS "createdAt",
        campaignversion.updated_at AS "updatedAt",
        campaignversion.active,
        campaignversion.name,
        campaignversion.alias,
        campaignversion.flow_type as "flowType",
        campaignversion.source_tags as "sourceTags",
        campaignversion.tracking_link as "trackingLink",
        campaign.description AS "campaignName",
        client._id AS "clientId",
        client.name AS "clientName",
        campaignversion.exposure,
        '' AS "previewDesktopThumbnailUrl",
        campaignversion.archived,
        country.name as "countryName",
        campaign.country_id as "countryId",
        campaign.short_url_custom_string_component as "shortUrlCustomStringComponent",
        campaign.type as "type",
        campaignversion.campaign_id as "campaignId",
        campaignversion.reward_pool_id as "rewardPoolId",
        campaignversion.link_expiry_days as "linkExpiryDays",
        campaignversion.private_link_expiry_days as "privateLinkExpiryDays",
        campaignversion.private_shared_url_expires_at as "privateSharedUrlExpiresAt",
        campaignversion.public_shared_url_expires_at as "publicSharedUrlExpiresAt",
        campaignversion.document_url as "documentUrl",
        campaignversion.mp_offer_title as "mpOfferTitle"
      FROM 
        reverb.campaign_version campaignversion
      JOIN 
        reverb.campaign campaign ON campaignversion.campaign_id = campaign._id
      JOIN 
        reverb.client client ON campaign.client_id = client._id
      JOIN 
        reverb.country country ON campaign.country_id = country._id;
    `);
};