exports.seed = function(knex) {
  return knex.raw(`
  
    DROP VIEW IF EXISTS reverb.agg_client_affiliate_assoc_merchant_js;
  
    CREATE OR REPLACE VIEW reverb.agg_client_affiliate_assoc_merchant_js AS
    SELECT client._id,
    client.created_at AS "createdAt",
    client.updated_at AS "updatedAt",
    client.name,
    client.email,
    client.referer,
    client.percent_commission AS "percentCommission",
    client.secret,
    client.image_id AS "imageId",
    client.share_bg_id AS "shareBgId",
    client.share_bg_enabled AS "shareBgEnabled",
    client.share_text AS "shareText",
    client.website,
    client.trading_name AS "tradingName",
    client.tags,
    client.meta,
    assoc.meta AS "assocMeta",
    assoc.merchant_id AS "merchantId",
    affiliate."name" AS "affiliateName"
 FROM ( reverb.client client
     LEFT JOIN reverb.assoc_affiliate_merchant_client assoc 
         ON ((assoc.client_id = client._id))
     LEFT JOIN reverb.affiliate affiliate 
     	   ON (affiliate."_id" = assoc.affiliate_id)
      );`);
};
