export function up(knex) {
  var query = `
    CREATE OR REPLACE FUNCTION reverb.client_stats_per_channel_by_period_js(
        date,
        date,
        text)
        RETURNS TABLE("socialPlatform" text, shares numeric, clicks numeric, "soretoSales" numeric)
        LANGUAGE 'sql'

        COST 100
        VOLATILE
        ROWS 1000
    AS $BODY$
        SELECT
            SOCIAL_PLATFORM.social_platform AS "socialPlatform",
            sum(COALESCE(SP.shares, 0::bigint)) AS shares,
            COALESCE(sum(tracking_event_history.interstitial_loaded),0::bigint) AS clicks,
            sum(COALESCE(SUO.countsales, 0::bigint)) AS "countSoretoSales"

        FROM
            reverb.shared_url SU
            LEFT JOIN
            (SELECT shared_url_id, social_platform
                FROM   (
                    SELECT shared_url_id, social_platform
                        , row_number() OVER(PARTITION BY shared_url_id ORDER BY created_at asc) AS rn
                    FROM   reverb.social_post
                    ) sub
                WHERE  rn = 1) SOCIAL_PLATFORM
            on SU._id = SOCIAL_PLATFORM.shared_url_id
            JOIN reverb.value_date DATES ON 1 = 1

            LEFT JOIN (
              SELECT
                tracking_event_history_1.created_at::date AS created_at,
                tracking_event_history_1.client_id,
                max(tracking_event_history_1.meta->>'sharedUrlId') as shared_url_id,
                sum(
                  CASE tracking_event_history_1.type
                    WHEN 'interstitial-loaded'::text THEN 1
                    ELSE 0
                  END) AS interstitial_loaded
              FROM reverb.tracking_event_history tracking_event_history_1
              WHERE tracking_event_history_1.test_mode = false
              GROUP BY (tracking_event_history_1.created_at::date), tracking_event_history_1.client_id, tracking_event_history_1.meta->>'sharedUrlId') tracking_event_history ON SU.client_id = tracking_event_history.client_id AND SU._id = tracking_event_history.shared_url_id AND tracking_event_history.created_at = DATES.date
            LEFT JOIN
                (SELECT sum(
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
                        END) AS totalsales,
                    sum(
                        CASE
                            WHEN orders.status = 'PENDING'::text OR orders.status = 'THIRD_PARTY_PENDING'::text THEN orders.commission
                            ELSE 0::numeric
                        END) AS totalsalespending,
                    sum(
                        CASE
                            WHEN orders.status = 'PAID'::text THEN orders.commission
                            ELSE 0::numeric
                        END) AS totalsalespaid,
                    sum(
                        CASE
                            WHEN orders.status = 'CANCELLED'::text THEN orders.commission
                            ELSE 0::numeric
                        END) AS totalsalesdeclined,
                    orders.meta ->> 'sharedUrlId'::text AS shared_url_id,
                    orders.created_at::date AS created_at
                    FROM reverb."order" orders
                    GROUP BY (orders.meta ->> 'sharedUrlId'::text), (orders.created_at::date))
                SUO
            ON SU._id = SUO.shared_url_id AND SUO.created_at = DATES.date
            LEFT JOIN
                (SELECT count(social_post_1._id) AS shares,
                    social_post_1.shared_url_id,
                    social_post_1.created_at::date AS created_at
                    FROM reverb.social_post social_post_1
                    GROUP BY social_post_1.shared_url_id, (social_post_1.created_at::date))
                SP
            ON SU._id = SP.shared_url_id AND SP.created_at = DATES.date
        WHERE
            SOCIAL_PLATFORM.social_platform is not null
            AND DATES.date >= $1
            AND DATES.date <= $2
            AND SU.client_id = $3
            AND SU.campaign_version_id is not null
            AND SU.test_mode = false
        GROUP BY
            SOCIAL_PLATFORM.social_platform
        $BODY$;
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ``;
  return knex.schema.raw(query);
}