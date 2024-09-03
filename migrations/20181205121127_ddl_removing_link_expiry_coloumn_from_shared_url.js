export function up(knex) {
  var query = `
  DROP VIEW reverb.agg_shared_url_post_js;
  DROP VIEW reverb.agg_client_traction_by_date_js;
  DROP VIEW reverb.shared_url_js;


  ALTER TABLE reverb.shared_url
  DROP COLUMN expiry;


  select reverb.create_view_table_js('reverb.shared_url');



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


CREATE OR REPLACE VIEW reverb.agg_shared_url_post_js AS
 SELECT shared_url._id,
    shared_url.created_at AS "createdAt",
    shared_url.updated_at AS "updatedAt",
    shared_url.user_id AS "userId",
    shared_url.client_id AS "clientId",
    shared_url.product_url AS "productUrl",
    shared_url.short_url AS "shortUrl",
    post.posts
   FROM reverb.shared_url shared_url
     JOIN ( SELECT shared_url_1._id,
            jsonb_agg(( SELECT row_to_json(social_post.*) AS row_to_json)) AS posts
           FROM reverb.shared_url_js shared_url_1
             JOIN reverb.social_post_js social_post ON shared_url_1._id = social_post."sharedUrlId"
          GROUP BY shared_url_1._id) post ON shared_url._id = post._id;
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ``;
  return knex.schema.raw(query);
}