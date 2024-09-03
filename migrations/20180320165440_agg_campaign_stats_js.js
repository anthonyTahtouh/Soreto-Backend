
exports.up = function(knex) {
  var query = `
  CREATE OR REPLACE VIEW reverb.agg_campaign_stats_js AS
  SELECT
    client.name AS "clientName",
    client._id AS "clientId",
    shared_url.campaign_id AS "campaignId",
    dates.date,
    sum(COALESCE(shared_url_order.countSales, 0::bigint)) AS countSoretoSales,
    sum(COALESCE(shared_url_order.countSalesPending, 0::bigint)) AS countSoretoSalesPending,
    sum(COALESCE(shared_url_order.countSalesPaid, 0::bigint)) AS countSoretoSalesPaid,
    sum(COALESCE(shared_url_order.countSalesDeclined, 0::bigint)) AS countSoretoSalesDeclined,
    sum(COALESCE(shared_url_order.totalSales, 0::bigint)) AS totalValueSoretoSales,
    sum(COALESCE(shared_url_order.totalSalesPending, 0::bigint)) AS totalValueSoretoSalesPending,
    sum(COALESCE(shared_url_order.totalSalesPaid, 0::bigint)) AS totalValueSoretoSalesPaid,
    sum(COALESCE(shared_url_order.totalSalesDeclined, 0::bigint)) AS totalValueSoretoSalesDeclined,
    sum(COALESCE(shared_url_access.clicks, 0::bigint)) AS clicks,
    sum(COALESCE(social_post.shares, 0::bigint)) AS shares, -- data not yet available - Second step lightbox click, number of customers who shared the offer.
    CASE
  WHEN sum(COALESCE(shared_url_order.countSales, 0::bigint)) <> 0::numeric THEN sum(social_post.shares) / sum(shared_url_order.countSales)
      ELSE NULL::numeric
    END AS "shareRate",
    CASE
  WHEN sum(COALESCE(social_post.shares, 0::bigint)) <> 0::numeric THEN sum(shared_url_order.countSales) / sum(social_post.shares)
  ELSE NULL::numeric
    END AS "purchaseRate",
    null as "clientSales", -- data not yet available - confirmed sales, for now it is the number of times the confirmation page was fired.
    null as "offerClicks", -- data not yet available - First step lightbox click, number of times a soreto link was clicked - it applies if it is a 2 step lightbox
    null as "soretoTraffic" -- data not yet available - Click to buy inside interstitial page
  FROM reverb.shared_url shared_url
    JOIN reverb.value_date dates ON 1 = 1
    JOIN reverb.client client ON shared_url.client_id = client._id
  LEFT JOIN ( select
      SUM(CASE WHEN (orders.status = 'PENDING' OR orders.status != 'VOID') THEN 1 else 0 END) AS countSales,
      SUM(CASE WHEN (orders.status = 'PENDING' OR orders.status = 'THIRD_PARTY_PENDING') THEN 1 else 0 END) AS countSalesPending,
      SUM(CASE WHEN orders.status = 'PAID' THEN 1 else 0 END) AS countSalesPaid,
      SUM(CASE WHEN orders.status = 'CANCELLED' THEN 1 else 0 END) AS countSalesDeclined,
      SUM(CASE WHEN (orders.status = 'PENDING' OR orders.status != 'VOID') THEN orders.total else 0 END) AS totalSales,
      SUM(CASE WHEN (orders.status = 'PENDING' OR orders.status = 'THIRD_PARTY_PENDING') THEN orders.total else 0 END) AS totalSalesPending,
      SUM(CASE WHEN orders.status = 'PAID' THEN orders.total else 0 END) AS totalSalesPaid,
      SUM(CASE WHEN orders.status = 'CANCELLED' THEN orders.total else 0 END) AS totalSalesDeclined,
      orders.meta ->> 'sharedUrlId'::text AS shared_url_id,
            orders.created_at::date AS created_at
        FROM
      reverb."order" orders
        GROUP BY (orders.meta ->> 'sharedUrlId'::text), (orders.created_at::date)) shared_url_order ON shared_url._id = shared_url_order.shared_url_id AND shared_url_order.created_at = dates.date
    LEFT JOIN ( SELECT count(shared_url_access_1._id) AS clicks,
            shared_url_access_1.shared_url_id,
            shared_url_access_1.created_at::date AS created_at
          FROM reverb.shared_url_access shared_url_access_1
          GROUP BY shared_url_access_1.shared_url_id, (shared_url_access_1.created_at::date)) shared_url_access ON shared_url._id = shared_url_access.shared_url_id AND shared_url_access.created_at = dates.date
    LEFT JOIN ( SELECT count(social_post_1._id) AS shares,
            social_post_1.shared_url_id,
            social_post_1.created_at::date AS created_at
          FROM reverb.social_post social_post_1
          GROUP BY social_post_1.shared_url_id, (social_post_1.created_at::date)) social_post ON shared_url._id = social_post.shared_url_id AND social_post.created_at = dates.date
  WHERE shared_url.campaign_id IS NOT NULL
  GROUP BY client._id, shared_url.campaign_id, dates.date
  ORDER BY dates.date;
  `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
  DROP VIEW reverb.agg_campaign_stats_js;
  `;
  return knex.schema.raw(query);
};
