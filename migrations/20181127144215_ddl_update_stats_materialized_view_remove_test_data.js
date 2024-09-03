export function up(knex) {
  var query = `

  DROP MATERIALIZED VIEW reverb.agg_campaign_version_stats_daily_js;

  CREATE MATERIALIZED VIEW reverb.agg_campaign_version_stats_daily_js
  TABLESPACE pg_default
  AS
   SELECT dates.date,
      client.name AS "clientName",
      client._id AS "clientId",
      client.active AS "clientActive",
      COALESCE(campaign._id, 'No Campaign'::text) AS "campaignId",
      campaign.description AS "campaignName",
      COALESCE(campaign_version._id, 'No Version'::text) AS "campaignVersionId",
      campaign_version.name AS "campaignVersionName",
      sum(COALESCE(shared_url_order.countsales, 0::bigint)) AS "countSoretoSales",
      sum(COALESCE(shared_url_order.countsalespending, 0::bigint)) AS "countSoretoSalesPending",
      sum(COALESCE(shared_url_order.countsalespaid, 0::bigint)) AS "countSoretoSalesPaid",
      sum(COALESCE(shared_url_order.countsalesdeclined, 0::bigint)) AS "countSoretoSalesDeclined",
      sum(COALESCE(shared_url_order.totalsales, 0::bigint::numeric)) AS "totalValueSoretoSales",
      sum(COALESCE(shared_url_order.totalsalespending, 0::bigint::numeric)) AS "totalValueSoretoSalesPending",
      sum(COALESCE(shared_url_order.totalsalespaid, 0::bigint::numeric)) AS "totalValueSoretoSalesPaid",
      sum(COALESCE(shared_url_order.totalsalesdeclined, 0::bigint::numeric)) AS "totalValueSoretoSalesDeclined",
      sum(COALESCE(shared_url_order.totalcommission, 0::bigint::numeric)) AS "totalValueSoretoCommission",
      sum(COALESCE(shared_url_order.totalcommissionpending, 0::bigint::numeric)) AS "totalValueSoretoCommissionPending",
      sum(COALESCE(shared_url_order.totalcommissionpaid, 0::bigint::numeric)) AS "totalValueSoretoCommissionPaid",
      sum(COALESCE(shared_url_order.totalcommissiondeclined, 0::bigint::numeric)) AS "totalValueSoretoCommissionDeclined",
      max(tracking_event_history.interstitial_loaded) AS clicks,
      sum(COALESCE(social_post.shares, 0::bigint)) AS shares,
      max(tracking_event_history.lightbox_load) AS "clientSales",
      max(tracking_event_history.lightbox_clickone_cta) AS "offerClicks",
      max(tracking_event_history.interstitial_cta) AS "soretoTraffic"
     FROM reverb.shared_url shared_url
       JOIN reverb.value_date dates ON 1 = 1
       LEFT JOIN reverb.client client ON shared_url.client_id = client._id
       LEFT JOIN reverb.campaign campaign ON client._id = campaign.client_id
       JOIN reverb.campaign_version campaign_version ON campaign._id = campaign_version.campaign_id AND shared_url.campaign_version_id = campaign_version._id
       LEFT JOIN ( SELECT tracking_event_history_1.created_at::date AS created_at,
              tracking_event_history_1.client_id,
              tracking_event_history_1.campaign_id,
              tracking_event_history_1.campaign_version_id,
              sum(
                  CASE tracking_event_history_1.type
                      WHEN 'interstitial-cta'::text THEN 1
                      ELSE 0
                  END) AS interstitial_cta,
              sum(
                  CASE tracking_event_history_1.type
                      WHEN 'lightbox-clickone-cta'::text THEN 1
                      ELSE 0
                  END) AS lightbox_clickone_cta,
              sum(
                  CASE tracking_event_history_1.type
                      WHEN 'lightbox-load'::text THEN 1
                      ELSE 0
                  END) AS lightbox_load,
              sum(
                  CASE tracking_event_history_1.type
                      WHEN 'interstitial-loaded'::text THEN 1
                      ELSE 0
                  END) AS interstitial_loaded
             FROM reverb.tracking_event_history tracking_event_history_1
             WHERE tracking_event_history_1.test_mode = false
            GROUP BY (tracking_event_history_1.created_at::date), tracking_event_history_1.client_id, tracking_event_history_1.campaign_id, tracking_event_history_1.campaign_version_id) tracking_event_history ON shared_url.client_id = tracking_event_history.client_id AND (shared_url.campaign_id = tracking_event_history.campaign_id OR tracking_event_history.campaign_id IS NULL) AND (shared_url.campaign_version_id = tracking_event_history.campaign_version_id OR tracking_event_history.campaign_version_id IS NULL) AND tracking_event_history.created_at = dates.date
       LEFT JOIN ( SELECT sum(
                  CASE
                      WHEN orders.status = 'PENDING'::text OR orders.status <> 'VOID'::text THEN 1
                      ELSE 0
                  END) AS countsales,
              sum(
                  CASE
                      WHEN orders.status = 'PENDING'::text OR orders.status = 'THIRD_PARTY_PENDING'::text THEN 1
                      ELSE 0
                  END) AS countsalespending,
              sum(
                  CASE
                      WHEN orders.status = 'PAID'::text THEN 1
                      ELSE 0
                  END) AS countsalespaid,
              sum(
                  CASE
                      WHEN orders.status = 'CANCELLED'::text THEN 1
                      ELSE 0
                  END) AS countsalesdeclined,
              sum(
                  CASE
                      WHEN orders.status = 'PENDING'::text OR orders.status <> 'VOID'::text THEN orders.commission
                      ELSE 0::numeric
                  END) AS totalcommission,
              sum(
                  CASE
                      WHEN orders.status = 'PENDING'::text OR orders.status = 'THIRD_PARTY_PENDING'::text THEN orders.commission
                      ELSE 0::numeric
                  END) AS totalcommissionpending,
              sum(
                  CASE
                      WHEN orders.status = 'PAID'::text THEN orders.commission
                      ELSE 0::numeric
                  END) AS totalcommissionpaid,
              sum(
                  CASE
                      WHEN orders.status = 'CANCELLED'::text THEN orders.commission
                      ELSE 0::numeric
                  END) AS totalcommissiondeclined,
              sum(
                  CASE
                      WHEN orders.status = 'PENDING'::text OR orders.status <> 'VOID'::text THEN COALESCE(orders.total, orders.sub_total)
                      ELSE 0::numeric
                  END) AS totalsales,
              sum(
                  CASE
                      WHEN orders.status = 'PENDING'::text OR orders.status = 'THIRD_PARTY_PENDING'::text THEN COALESCE(orders.total, orders.sub_total)
                      ELSE 0::numeric
                  END) AS totalsalespending,
              sum(
                  CASE
                      WHEN orders.status = 'PAID'::text THEN COALESCE(orders.total, orders.sub_total)
                      ELSE 0::numeric
                  END) AS totalsalespaid,
              sum(
                  CASE
                      WHEN orders.status = 'CANCELLED'::text THEN COALESCE(orders.total, orders.sub_total)
                      ELSE 0::numeric
                  END) AS totalsalesdeclined,
              orders.meta ->> 'sharedUrlId'::text AS shared_url_id,
              orders.created_at::date AS created_at
             FROM reverb."order" orders
            GROUP BY (orders.meta ->> 'sharedUrlId'::text), (orders.created_at::date)) shared_url_order ON shared_url._id = shared_url_order.shared_url_id AND shared_url_order.created_at = dates.date
       LEFT JOIN ( SELECT count(social_post_1._id) AS shares,
              social_post_1.shared_url_id,
              social_post_1.created_at::date AS created_at
             FROM reverb.social_post social_post_1
            GROUP BY social_post_1.shared_url_id, (social_post_1.created_at::date)) social_post ON shared_url._id = social_post.shared_url_id AND social_post.created_at = dates.date
    WHERE client.name <> 'UNREGISTERED'::text
      and shared_url.test_mode = false
    GROUP BY dates.date, client._id, campaign._id, campaign_version._id, tracking_event_history.campaign_id
    ORDER BY dates.date, client.name
  WITH NO DATA;

  CREATE UNIQUE INDEX index_agg_campaign_version_stats_daily_js ON reverb.agg_campaign_version_stats_daily_js (date, "clientId", "campaignId", "campaignVersionId");

    `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ``;
  return knex.schema.raw(query);
}