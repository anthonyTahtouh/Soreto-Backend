
export function up(knex) {
  var query = `
        CREATE FUNCTION reverb.client_stats_per_channel_by_period_js(date,date,text) 
          RETURNS TABLE("socialPlatform" text, "shares" numeric, "clicks" numeric, "soretoSales" numeric)
            AS $$
              SELECT
                  SOCIAL_PLATFORM.social_platform AS "socialPlatform",
                  sum(COALESCE(SP.shares, 0::bigint)) AS shares,
                  sum(COALESCE(SUA.clicks, 0::bigint)) AS clicks,
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
                  LEFT JOIN
                      (SELECT count(shared_url_access_1._id) AS clicks,
                          shared_url_access_1.shared_url_id,
                          shared_url_access_1.created_at::date AS created_at
                        FROM reverb.shared_url_access shared_url_access_1
                        WHERE shared_url_access_1.referer_website !~ (( SELECT shared_url_1.short_url
                                FROM reverb.shared_url shared_url_1
                                WHERE shared_url_1._id = shared_url_access_1.shared_url_id)) OR shared_url_access_1.referer_website IS NULL
                        GROUP BY shared_url_access_1.shared_url_id, (shared_url_access_1.created_at::date))
                          SUA
                  ON SU._id = SUA.shared_url_id AND SUA.created_at = DATES.date
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
              GROUP BY 
                  SOCIAL_PLATFORM.social_platform    
            $$
            LANGUAGE SQL;
  
        
            CREATE FUNCTION reverb.total_client_stats_by_period_js(date,date,text) 
              RETURNS TABLE(shares numeric, clicks numeric, "countSoretoSales" numeric)
                AS $$    
                    SELECT
                        sum(COALESCE(SP.shares, 0::numeric)) AS shares,
                        sum(COALESCE(SUA.clicks, 0::numeric)) AS clicks,
                        sum(COALESCE(SUO.countsales, 0::numeric)) AS "countSoretoSales"
                    FROM
                        reverb.shared_url SU
            
                        JOIN reverb.value_date DATES ON 1 = 1
                        LEFT JOIN
                            (SELECT count(shared_url_access_1._id) AS clicks,
                                shared_url_access_1.shared_url_id,
                                shared_url_access_1.created_at::date AS created_at
                              FROM reverb.shared_url_access shared_url_access_1
                              WHERE shared_url_access_1.referer_website !~ (( SELECT shared_url_1.short_url
                                      FROM reverb.shared_url shared_url_1
                                      WHERE shared_url_1._id = shared_url_access_1.shared_url_id)) OR shared_url_access_1.referer_website IS NULL
                              GROUP BY shared_url_access_1.shared_url_id, (shared_url_access_1.created_at::date))
                                SUA
                        ON SU._id = SUA.shared_url_id AND SUA.created_at = DATES.date
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
                        DATES.date >= $1
                        AND DATES.date <= $2
                        AND SU.client_id = $3
                $$
                LANGUAGE SQL;    
  
      `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
        --DROP FUNCTION reverb.client_stats_per_channel_by_period_js;
        --DROP FUNCTION reverb.total_client_stats_by_period_js;
      `;
  return knex.schema.raw(query);
}
