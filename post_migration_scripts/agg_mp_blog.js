exports.seed = function (knex) {
  return knex.raw(`
  DROP VIEW IF EXISTS reverb.agg_mp_blog_js;
  CREATE OR REPLACE VIEW reverb.agg_mp_blog_js AS
  SELECT 
    mb.*, 
    "brand"."name" as "brandName", 
    "brand"."clientId",
    "brand"."urlId" as "brandUrlId"
  FROM reverb."mp_blog_js" as "mb" 
  LEFT JOIN reverb."mp_brand_js" as "brand" on "brand"."_id" = "mb"."brandId" 
  group by 
    "mb"."_id", 
    "mb"."name", 
    "mb"."title", 
    "mb"."description", 
    "mb"."active", 
    "mb"."publishedDate", 
    "mb"."cardImageUrl", 
    "mb"."urlId", 
    "mb"."coverTitle", 
    "mb"."coverDescription", 
    "mb"."coverImageUrl", 
    "mb"."bodySourceUrl", 
    "mb"."brandId", 
    "mb"."createdAt", 
    "mb"."updatedAt", 
    "mb"."bodyContent", 
    "mb"."trendingIndex",
    "mb"."designContent",
    "mb"."invisible",
    "mb"."flashCampaignIds",
    "brand"."clientId",
    "brand"."name",
    "brand"."urlId",
    "mb"."meta"
  `);
};
