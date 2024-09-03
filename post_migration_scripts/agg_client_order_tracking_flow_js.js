
exports.seed = function(knex) {
  return knex.raw(`
    DROP VIEW IF EXISTS reverb.agg_client_order_tracking_flow_js;
    CREATE OR REPLACE VIEW reverb.agg_client_order_tracking_flow_js AS
    SELECT 
      "or"."client_order_id" as "clientOrderId",
      "or"."created_at" as "dateOrder",
      "or"."order_total" as "value",
      "or"."meta" as "orderMeta",
      "or"."test_mode" as "testMode",
      "or"."buyer_email" as "buyerEmail",
      "or"."ip",
      "cli"."name" as "clientName",
      "cv"."name" as "campaignVersionName",
      "su"."meta" as "sharedUrlAccessMeta",
      "su"."short_url" as "shortUrl",
      "usr"."email"
    FROM 
      reverb."client_order" as "or"
      left join reverb."shared_url" as "su"
      on "su"."_id" = "or"."shared_url_id"
      left join reverb."campaign_version" as "cv"
      on "cv"."_id" = "su"."campaign_version_id"
      left join reverb."user" as "usr"
      on "usr"."_id" = "su"."user_id"
      left join reverb."client" as "cli"
      on "cli"."_id" = "or"."client_id";
  `);
};
