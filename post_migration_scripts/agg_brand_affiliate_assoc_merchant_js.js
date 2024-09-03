exports.seed = function(knex) {
  return knex.raw(`
  
    DROP VIEW IF EXISTS reverb.agg_brand_affiliate_assoc_merchant_js;
  
    CREATE OR REPLACE VIEW reverb.agg_brand_affiliate_assoc_merchant_js AS
    SELECT brand._id,
    brand.client_id,
    brand.name,
    brand.short_name,
    brand.url_id,
      assoc.merchant_id AS "merchantId",
      affiliate."name" AS "affiliateName"	
   FROM ( reverb.mp_brand brand
     LEFT JOIN reverb.client client
        ON ((brand.client_id = client._id))
       LEFT JOIN reverb.assoc_affiliate_merchant_client assoc 
           ON ((assoc.client_id = client._id))
       LEFT JOIN reverb.affiliate affiliate 
          ON (affiliate."_id" = assoc.affiliate_id));`);
};
