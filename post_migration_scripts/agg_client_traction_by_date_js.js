exports.seed = function(knex) {

  return knex.raw(`
      
    CREATE OR REPLACE VIEW reverb.agg_client_traction_by_date_js AS
    SELECT metric."createdAt",
        metric."clientId",
        metric.shares,
        metric.clicks,
        metric.revenue,
            CASE COALESCE(metric.clicks, 0::bigint)
                WHEN 0 THEN 0::numeric(15,6)
                ELSE (COALESCE(metric.revenue, 0::bigint::numeric) / metric.clicks::numeric)::numeric(15,6)
            END AS cpc
      FROM ( SELECT COALESCE(share."createdAt", click."createdAt", "order"."createdAt") AS "createdAt",
                COALESCE(share."clientId", click."clientId", "order"."clientId") AS "clientId",
                share.shares,
                click.clicks,
                "order".revenue
              FROM ( SELECT date("sharedUrl"."createdAt") AS "createdAt",
                        "sharedUrl"."clientId",
                        count("sharedUrl"._id) AS shares
                      FROM reverb.shared_url_js "sharedUrl"
                      GROUP BY (date("sharedUrl"."createdAt")), "sharedUrl"."clientId"
                      ORDER BY (date("sharedUrl"."createdAt"))) share
                FULL JOIN ( SELECT date("sharedUrlAccess"."createdAt") AS "createdAt",
                        "sharedUrl"."clientId",
                        count("sharedUrlAccess"._id) AS clicks
                      FROM reverb.shared_url_js "sharedUrl"
                        RIGHT JOIN reverb.shared_url_access_js "sharedUrlAccess" ON "sharedUrl"._id = "sharedUrlAccess"."sharedUrlId"
                      GROUP BY (date("sharedUrlAccess"."createdAt")), "sharedUrl"."clientId"
                      ORDER BY (date("sharedUrlAccess"."createdAt"))) click ON share."createdAt" = click."createdAt" AND share."clientId" = click."clientId"
                FULL JOIN ( SELECT date(order_1."createdAt") AS "createdAt",
                        order_1."clientId",
                        sum(
                            CASE
                                WHEN order_1.total IS NULL OR order_1.total = 0::numeric THEN order_1."subTotal"
                                ELSE order_1.total
                            END) AS revenue
                      FROM reverb.order_js order_1
                      GROUP BY (date(order_1."createdAt")), order_1."clientId"
                      ORDER BY (date(order_1."createdAt"))) "order" ON click."createdAt" = "order"."createdAt" AND click."clientId" = "order"."clientId") metric;  
      `);
};