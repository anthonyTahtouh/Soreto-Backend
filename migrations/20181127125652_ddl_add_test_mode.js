export function up(knex) {
  var query = `
    CREATE OR REPLACE FUNCTION reverb.create_view_columns(
        schematblname text)
        RETURNS text
        LANGUAGE 'sql'

        COST 100
        VOLATILE
    AS $BODY$
        SELECT string_agg
        ( concat(a.attname,' AS ',
            case when left(a.attname,1)='_'
            then quote_ident(concat('_',lower(left(replace(initcap(replace(a.attname,'_',' ')),' ',''),1)),right(replace(initcap(replace(a.attname,'_',' ')),' ',''),length(replace(initcap(replace(a.attname,'_',' ')),' ',''))-1)))
            else quote_ident(concat(lower(left(replace(initcap(replace(a.attname,'_',' ')),' ',''),1)),right(replace(initcap(replace(a.attname,'_',' ')),' ',''),length(replace(initcap(replace(a.attname,'_',' ')),' ',''))-1)))
        end ), ',')
            AS field
            FROM pg_attribute a, pg_class c, pg_namespace n
            WHERE
                a.attnum > 0
                AND a.attrelid = c.oid
                AND n.oid = c.relnamespace
                AND c.relname = split_part(schematblName, '.', 2)
                AND n.nspname = split_part(schematblName, '.', 1)
                AND a.attisdropped = false;
        $BODY$;


    ALTER TABLE reverb.shared_url
        ADD COLUMN test_mode BOOLEAN DEFAULT FALSE;

    select reverb.create_view_table_js('reverb.shared_url');

    ALTER TABLE reverb.order
        ADD COLUMN test_mode BOOLEAN DEFAULT FALSE;

    DROP VIEW reverb.agg_client_traction_by_date_js;
    DROP VIEW reverb.order_js;
    select reverb.create_view_table_js('reverb.order');

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

    ALTER TABLE reverb.tracking_event_history
        ADD COLUMN test_mode BOOLEAN DEFAULT FALSE;

    select reverb.create_view_table_js('reverb.tracking_event_history');
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ``;
  return knex.schema.raw(query);
}