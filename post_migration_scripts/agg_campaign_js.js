exports.seed = function(knex) {
  return knex.raw(`
      
      DROP VIEW IF EXISTS reverb.agg_campaign_js;
    
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
          campaign.country_id AS "countryId",
          country.name AS "countryName",
          campaign.active AS "active",
          campaign.archived,
          campaign.super_campaign as "superCampaign",
          currency.currency_code as "orderOriginCurrency",
          src_campaign._id as "sourceTemplateId",
          src_campaign.description as "sourceTemplateDescription",
          src_client.name as "sourceTemplateClientName",
          coalesce(
            (select code from reverb.country_code where client_id = client."_id" and country_id = country."_id" limit 1),
            (select code from reverb.country_code where country_id = country."_id" limit 1)
          ) as "countryCode",
          campaign.type as "type",
          client.template as "clientTemplate",
          client.custom_identifier as "clientCustomIdentifier",
          (SELECT json_agg(item) from (SELECT offer.* FROM reverb.campaign_version cv
            INNER JOIN reverb.mp_offer offer on offer.campaign_version_id = cv._id
            WHERE cv.campaign_id = campaign._id) as item) as "relatedOffers"
      FROM reverb.campaign campaign
            LEFT JOIN reverb.client client ON campaign.client_id = client._id    
            LEFT JOIN reverb.campaign src_campaign ON src_campaign._id = campaign.source_campaign_id
            LEFT JOIN reverb.client src_client ON src_campaign.client_id = src_client._id    
            LEFT JOIN reverb.country country ON campaign.country_id = country._id
            LEFT JOIN reverb.currency currency ON campaign.order_origin_currency = currency._id
      `);
};