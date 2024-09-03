
exports.seed = function(knex) {
  return knex.raw(`
    DROP VIEW IF EXISTS reverb.agg_mp_offer_js;
    CREATE OR REPLACE VIEW reverb.agg_mp_offer_js AS
    SELECT 
	    mo.*, 
      json_agg("moc"."mpCategoryId") as "categoryIds" , 
	    "brand"."name" as "brandName",
	    "brand"."urlId" as "brandUrlId",
      "brand"."clientId",
      "brand"."_id" as "brandId",
      "camp"."_id" as "campaignId"
    FROM reverb."mp_offer_js" as "mo" 
	  LEFT JOIN reverb."mp_offer_category_js" as "moc" on "moc"."mpOfferId" = "mo"."_id" 
    LEFT JOIN reverb."campaign_version_js" as "cv" on "cv"."_id" = "mo"."campaignVersionId"
	  LEFT JOIN reverb."campaign_js" as "camp" on "camp"."_id" = "cv"."campaignId" 
    LEFT JOIN reverb."mp_brand_js" as "brand" on "brand"."clientId" = "camp"."clientId" 
	  GROUP BY
      "mo"."_id", 
      "mo"."campaignVersionId", 
      "mo"."name", 
      "mo"."active", 
      "mo"."startDate", 
      "mo"."endDate", 
      "mo"."cardImageUrl", 
	    "mo"."type",
      "mo"."title", 
      "mo"."subtitle", 
      "mo"."cardTitle", 
      "mo"."cardSubtitle", 
      "mo"."cardDescription", 
      "mo"."condition", 
      "mo"."urlId", 
      "mo"."trendingIndex", 
      "mo"."createdAt", 
      "mo"."updatedAt", 
	    "mo"."shareHeroImageUrl", 
      "mo"."trackingLink", 
      "mo"."shareHeroSmallImageUrl",
      "mo"."customSettings",
      "mo"."meta",
      "mo"."flashCampaignIds",
      "brand"."name",
      "brand"."clientId",
      "brand"."urlId",
      "brand"."_id",
      "camp"."_id";
  `);
};
