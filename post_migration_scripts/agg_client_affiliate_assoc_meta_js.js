exports.seed = function(knex) {
  return knex.raw(`
  
    DROP VIEW IF EXISTS reverb.agg_client_affiliate_assoc_meta_js;
  
    CREATE OR REPLACE VIEW reverb.agg_client_affiliate_assoc_meta_js AS
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
    assoc.meta AS "assocMeta"
 FROM (
       reverb.client client
         LEFT JOIN reverb.assoc_affiliate_merchant_client assoc 
             ON ( 
                 (assoc.client_id = client._id) 
                 and assoc.connected_at::date <= now()::date 
                 and (assoc.disconnected_at is null or assoc.disconnected_at::date > now()::date) )
     );
   
      `);
};
