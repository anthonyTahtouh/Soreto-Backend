exports.seed = function (knex) {
  return knex.raw(`
  DROP VIEW IF EXISTS reverb.agg_mp_banner_js;
  CREATE OR REPLACE VIEW reverb.agg_mp_banner_js AS
  SELECT 
    mb.*, 
    mo.name as "offerName", 
    brand.name as "brandName", 
    cat.name as "categoryName",
    "mo"."urlId"  as "offerUrlId",
    "brand"."urlId"  as "brandUrlId",
    "cat"."urlId"  as "categoryUrlId"
  FROM reverb."mp_banner_js" as "mb" 
  LEFT JOIN reverb."mp_offer_js" as "mo" on "mo"."_id" = "mb"."targetMpOfferId" 
  LEFT JOIN reverb."mp_brand_js" as "brand" on "brand"."_id" = "mb"."targetMpBrandId" 
  LEFT JOIN reverb."mp_category_js" as "cat" on "cat"."_id" = "mb"."targetMpCategoryId" 
  GROUP BY 
    "mb"."_id", 
    "mb"."name", 
    "mb"."startDate", 
    "mb"."endDate", 
    "mb"."title", 
    "mb"."description", 
    "mb"."buttonLabel", 
    "mb"."active", 
    "mb"."coverImageUrl", 
    "mb"."coverImageTabletUrl", 
    "mb"."coverImageMobileUrl", 
    "mb"."tag", 
    "mb"."targetMpOfferId", 
    "mb"."targetMpBrandId", 
    "mb"."targetMpCategoryId", 
    "mb"."createdAt", 
    "mb"."updatedAt",
    "mb"."visibilityTags",
    "mb"."customUrlTarget",
    "mb"."trendingIndex",
    "mb"."flashCampaignIds",
    "mb"."targetTypeId",
    "mo"."name",
    "mo"."urlId",
    "brand"."urlId",
    "cat"."urlId",
    "brand"."name", 
    "cat"."name"
    `);
};
