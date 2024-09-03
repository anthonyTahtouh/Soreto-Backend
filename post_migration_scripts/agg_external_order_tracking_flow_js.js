
exports.seed = function(knex) {
  return knex.raw(`
    DROP VIEW IF EXISTS reverb.agg_external_order_tracking_flow_js;
    CREATE OR REPLACE VIEW reverb.agg_external_order_tracking_flow_js AS
    SELECT 
      eo._id,
      "eo"."transacted_at" as "dateOrder",
      coalesce("eo"."client_order_id",
      "eo"."meta" ->> 'client_order_id', "eo"."meta" ->> 'orderId', "eo"."meta" ->> 'order_id', "eo"."meta" ->> 'orderRef', "eo"."meta" ->> 'Oid', "eo"."meta" ->> 'clientOrderId') as "clientOrderId",
      "eo"."holder_id" as "affiliate",
      "eo"."meta" as "orderMeta",
      "eo"."total" as "value",
      "eo"."status",
      "cv"."name" as "campaignVersionName",
      "cli"."name" as "clientName",
      "sua"."created_at" as "dateSharedUrlAccess",
      "sua"."meta" as "sharedUrlAccessMeta",
      "usr"."email",
      "su"."short_url" as "shortUrl",
      "su"."created_at" as "dateSharedUrl",
      "su"."meta" as "sharedUrlMeta",
      "su"."meta" -> 'ipAddress' as "sharedUrlIpAddress",
      "su"."meta" -> 'userAgent' as "sharedUrlBrowser",
      "sua"."meta" -> 'ipAddress' as "sharedUrlAccessIpAddress",
      "sua"."meta" -> 'userAgent' as "sharedUrlAccessBrowser"
    FROM 
      reverb."external_order" as "eo"
      left join reverb."shared_url_access" as "sua"
      on "sua"."_id" = "eo"."shared_url_access_id"
      left join reverb."shared_url" as "su"
      on "su"."_id" = "sua"."shared_url_id"
      inner join reverb."campaign_version" as "cv"
      on "cv"."_id" = "su"."campaign_version_id"
      left join reverb."user" as "usr"
      on "usr"."_id" = "su"."user_id"
      left join reverb."client" as "cli"
      on "cli"."_id" = "su"."client_id"
     
  `);
};
