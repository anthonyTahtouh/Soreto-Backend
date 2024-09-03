exports.seed = function(knex) {
  return knex.raw(
    `
        DROP FUNCTION IF EXISTS reverb.total_client_stats_by_period_js(date,date,text);
    
        CREATE OR REPLACE FUNCTION reverb.total_client_stats_by_period_js(
            date,
            date,
            text)
            RETURNS TABLE(shares numeric, "countSales" numeric,"countSoretoSales" numeric, "countSoretoSalesExternal" numeric, "countSoretoSalesJoined" numeric, "externalMerchantHolderConfigured" boolean,"externalMerchantHolderConnectedAt" date, "externalMerchantHolderDisconnectedAt" date)
            LANGUAGE 'sql'
        
            COST 100
            VOLATILE
            ROWS 1000
            AS $BODY$
                SELECT
                  sum(COALESCE(SP.shares, 0::numeric)) AS shares,

                  CASE 
                    WHEN (max(assoc.report_order_source) is null) OR (max(assoc.report_order_source) = 'SORETO')
                        THEN sum(COALESCE(SUO.countsales, 0::numeric)) 
                    WHEN max(assoc.report_order_source) = 'EXTERNAL-AFFILIATE'
                        THEN sum(COALESCE(SUEO.countsales, 0::numeric))
                    WHEN max(assoc.report_order_source) = 'JOINED'
                        THEN sum(COALESCE(SUEO.countsalesjoined, 0::numeric)) + sum(COALESCE(SUO.countsalesjoined, 0::numeric))
                  END AS "countSales",

                  sum(COALESCE(SUO.countsales, 0::numeric)) AS "countSoretoSales",
                  sum(COALESCE(SUEO.countsales, 0::numeric)) AS "countSoretoSalesExternal",
                  sum(COALESCE(SUEO.countsalesjoined, 0::numeric)) + sum(COALESCE(SUO.countsalesjoined, 0::numeric)) AS "countSoretoSalesJoined",
                  
                  (CASE WHEN (max(assoc.client_id) is not null) THEN true ELSE false END) as "externalMerchantHolderConfigured",
                  (CASE WHEN (max(assoc.connected_at) is not null) THEN max(assoc.connected_at) ELSE null END) as "externalMerchantHolderConnectedAt",
                  (CASE WHEN (max(assoc.disconnected_at) is not null) THEN max(assoc.disconnected_at) ELSE null END) as "externalMerchantHolderDisconnectedAt"
                FROM
                  reverb.shared_url SU
      
                  JOIN reverb.value_date DATES ON 1 = 1
                  LEFT JOIN reverb.assoc_affiliate_merchant_client assoc ON SU.client_id = assoc.client_id
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
      
                  ----------------------------------------
                  -- ORDERS
                  ----------------------------------------
                  LEFT JOIN
                      (SELECT sum(
                              CASE
                                  WHEN orders.status = 'PENDING'::text OR orders.status <> 'VOID'::text THEN 1
                                  ELSE 0
                              END) AS countsales,
                            sum(
                                CASE
                                    WHEN (orders.status = 'PENDING'::text OR orders.status <> 'VOID'::text)
                                            AND (
                                                    assoc_soreto.connected_at is null
                                                OR
                                                    NOT ( orders.created_at::date >= assoc_soreto.connected_at::date and orders.created_at::date <= COALESCE(assoc_soreto.disconnected_at::date,'3000-01-01'::date) )
                                                )
                                        THEN 1
                                    ELSE 0
                                END) AS countsalesjoined,			    
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
                        LEFT JOIN
                            reverb.assoc_affiliate_merchant_client assoc_soreto ON assoc_soreto.client_id = orders.client_id
                      GROUP BY (orders.meta ->> 'sharedUrlId'::text), (orders.created_at::date))
                      SUO
                  ON SU._id = SUO.shared_url_id AND SUO.created_at = DATES.date
      
                  ----------------------------------------
                  -- EXTERNAL ORDERS
                  ----------------------------------------
                  LEFT JOIN
      
                      (SELECT 
                          shared_url_access.shared_url_id as shared_url_id,
                          eo.transacted_at::date AS transacted_at,
                          sum(
                              CASE
                                  WHEN eo.status = 'PENDING'::text OR eo.status <> 'VOID'::text THEN 1
                                  ELSE 0
                              END) AS countsales,
                            sum(
                                CASE
                                    WHEN (eo.status = 'PENDING'::text OR eo.status <> 'VOID'::text)
                                            AND ( eo.transacted_at::date >= assoc_external.connected_at::date and eo.transacted_at::date <= COALESCE(assoc_external.disconnected_at::date,'3000-01-01'::date) )
                                        THEN 1
                                    ELSE 0
                                END) AS countsalesjoined,			    
                          sum(
                              CASE
                                  WHEN eo.status = 'PENDING'::text OR eo.status = 'THIRD_PARTY_PENDING'::text THEN 1
                                  ELSE 0
                              END) AS countsalespending,
                          sum(
                              CASE
                                  WHEN eo.status = 'PAID'::text THEN 1
                                  ELSE 0
                              END) AS countsalespaid,
                          sum(
                              CASE
                                  WHEN eo.status = 'CANCELLED'::text THEN 1
                                  ELSE 0
                              END) AS countsalesdeclined,
                          sum(
                              CASE
                                  WHEN eo.status = 'PENDING'::text OR eo.status <> 'VOID'::text THEN eo.commission
                                  ELSE 0::numeric
                              END) AS totalsales,
                          sum(
                              CASE
                                  WHEN eo.status = 'PENDING'::text OR eo.status = 'THIRD_PARTY_PENDING'::text THEN eo.commission
                                  ELSE 0::numeric
                              END) AS totalsalespending,
                          sum(
                              CASE
                                  WHEN eo.status = 'PAID'::text THEN eo.commission
                                  ELSE 0::numeric
                              END) AS totalsalespaid,
                          sum(
                              CASE
                                  WHEN eo.status = 'CANCELLED'::text THEN eo.commission
                                  ELSE 0::numeric
                              END) AS totalsalesdeclined
                      FROM 
                          reverb.external_order eo
                      LEFT JOIN
      
                          reverb.shared_url_access shared_url_access
                          ON
                          eo.shared_url_access_id = shared_url_access._id
      
                        LEFT JOIN
                            reverb.assoc_affiliate_merchant_client assoc_external
                            ON
                            assoc_external.client_id = eo.client_id
                      GROUP BY
                          eo.transacted_at::date, shared_url_id
                  )SUEO
                  ON 
                  SU._id = SUEO.shared_url_id AND SUEO.transacted_at = DATES.date
      
                  ----------------------------------------
                  -- SOCIAL POST
                  ----------------------------------------
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
                  AND SU.campaign_version_id is not null
                  AND SU.test_mode = false
          $BODY$;
      `);
};