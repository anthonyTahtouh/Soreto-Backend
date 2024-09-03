
exports.seed = function(knex) {
  return knex.raw(`
    DROP VIEW IF EXISTS reverb.agg_order_tracking_flow_js;
    CREATE OR REPLACE VIEW reverb.agg_order_tracking_flow_js AS
    SELECT 
      "or"._id,
      "or"."client_order_id" as "clientOrderId",
      "or"."created_at" as "dateOrder",
      "or"."meta" as "orderMeta",
      "or"."total" as "value",
      "or"."status",
      "or"."test_mode" as "testMode",
      "cli"."name" as "clientName",
      "cv"."name" as "campaignVersionName",
      "sua"."meta" as "sharedUrlAccessMeta",
      "sua"."created_at" as "dateSharedUrlAccess",
      "usr"."email",
      "su"."short_url" as "shortUrl",
      "su"."meta" as "sharedUrlMeta",
      "su"."created_at" as "dateSharedUrl",
      "su"."meta" -> 'ipAddress' as "sharedUrlIpAddress",
      "su"."meta" -> 'userAgent' as "sharedUrlBrowser",
      "sua"."meta" -> 'ipAddress' as "sharedUrlAccessIpAddress",
      "sua"."meta" -> 'userAgent' as "sharedUrlAccessBrowser"
    FROM 
      reverb."order" as "or"
      left join reverb."shared_url_access" as "sua"
      on "sua"."_id" = "or"."shared_url_access_id"
      left join reverb."shared_url" as "su"
      on "su"."_id" = "sua"."shared_url_id"
      left join reverb."campaign_version" as "cv"
      on "cv"."_id" = "su"."campaign_version_id"
      left join reverb."user" as "usr"
      on "usr"."_id" = "su"."user_id"
      left join reverb."client" as "cli"
      on "cli"."_id" = "su"."client_id"
  `);
};
