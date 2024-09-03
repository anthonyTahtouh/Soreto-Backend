exports.up = function(knex) {

  let script = `
  
    DROP VIEW IF EXISTS reverb.agg_campaign_version_stats_daily_js;
    
    DROP MATERIALIZED VIEW IF EXISTS reverb.agg_campaign_version_stats_daily_latest_js;

    CREATE MATERIALIZED VIEW reverb.agg_campaign_version_stats_daily_latest_js
    
    TABLESPACE
    
        pg_default
    
    AS
    
    SELECT
    
    dates.date,
    
    -- CLIENT
    client.name AS "clientName",
    client._id AS "clientId",
    client.active AS "clientActive",
    (CASE WHEN (max(assoc.client_id) = client._id) THEN true ELSE false END) as "externalMerchantHolderConfigured",
    (CASE WHEN (max(assoc.connected_at) is not null) THEN max(assoc.connected_at) ELSE null END) as "externalMerchantHolderConnectedAt",
    (CASE WHEN (max(assoc.disconnected_at) is not null) THEN max(assoc.disconnected_at) ELSE null END) as "externalMerchantHolderDisconnectedAt",
    (CASE WHEN (dates.date >= max(assoc.connected_at) and dates.date <= COALESCE(max(assoc.disconnected_at),'3000-01-01'::date) ) THEN true ELSE false END) as "externalMerchantHolderConnected",
    MAX(assoc.report_click_source) as "reportClickSource",
    MAX(assoc.report_order_source) as "reportOrderSource",
    
    -- CAMPAIGN
    COALESCE(campaign._id, 'No Campaign'::text) AS "campaignId",
    campaign.description AS "campaignName",
    COALESCE(campaign_version._id, 'No Version'::text) AS "campaignVersionId",
    campaign_version.name AS "campaignVersionName",
    
    -- SHARED URL ORDER
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
    
    -- EXTERNAL ORDERS
    sum(COALESCE(external_order.countsales, 0::bigint)) AS "countSoretoSalesExternal",
    sum(COALESCE(external_order.countsalespending, 0::bigint)) AS "countSoretoSalesPendingExternal",
    sum(COALESCE(external_order.countsalespaid, 0::bigint)) AS "countSoretoSalesPaidExternal",
    sum(COALESCE(external_order.countsalesdeclined, 0::bigint)) AS "countSoretoSalesDeclinedExternal",
    sum(COALESCE(external_order.totalsales, 0::bigint::numeric)) AS "totalValueSoretoSalesExternal",
    sum(COALESCE(external_order.totalsalespending, 0::bigint::numeric)) AS "totalValueSoretoSalesPendingExternal",
    sum(COALESCE(external_order.totalsalespaid, 0::bigint::numeric)) AS "totalValueSoretoSalesPaidExternal",
    sum(COALESCE(external_order.totalsalesdeclined, 0::bigint::numeric)) AS "totalValueSoretoSalesDeclinedExternal",
    sum(COALESCE(external_order.totalcommission, 0::bigint::numeric)) AS "totalValueSoretoCommissionExternal",
    sum(COALESCE(external_order.totalcommissionpending, 0::bigint::numeric)) AS "totalValueSoretoCommissionPendingExternal",
    sum(COALESCE(external_order.totalcommissionpaid, 0::bigint::numeric)) AS "totalValueSoretoCommissionPaidExternal",
    sum(COALESCE(external_order.totalcommissiondeclined, 0::bigint::numeric)) AS "totalValueSoretoCommissionDeclinedExternal",
    
    -- EXTERNAL JOINED
    
    CASE WHEN (dates.date >= max(assoc.connected_at) and dates.date <= COALESCE(max(assoc.disconnected_at),'3000-01-01'::date) )
        THEN sum(COALESCE(external_order.countsales, 0::bigint)) ELSE sum(COALESCE(shared_url_order.countsales, 0::bigint)) END AS "countSoretoSalesJoined",
    
    CASE WHEN (dates.date >= max(assoc.connected_at) and dates.date <= COALESCE(max(assoc.disconnected_at),'3000-01-01'::date) )
        THEN sum(COALESCE(external_order.countsalespending, 0::bigint)) ELSE sum(COALESCE(shared_url_order.countsalespending, 0::bigint)) END AS "countSoretoSalesPendingJoined",
    
    CASE WHEN (dates.date >= max(assoc.connected_at) and dates.date <= COALESCE(max(assoc.disconnected_at),'3000-01-01'::date) )
        THEN sum(COALESCE(external_order.countsalespaid, 0::bigint)) ELSE sum(COALESCE(shared_url_order.countsalespaid, 0::bigint)) END AS "countSoretoSalesPaidJoined",
    
    CASE WHEN (dates.date >= max(assoc.connected_at) and dates.date <= COALESCE(max(assoc.disconnected_at),'3000-01-01'::date) )
        THEN sum(COALESCE(external_order.countsalesdeclined, 0::bigint)) ELSE sum(COALESCE(shared_url_order.countsalesdeclined, 0::bigint)) END AS "countSoretoSalesDeclinedJoined",
    
    CASE WHEN (dates.date >= max(assoc.connected_at) and dates.date <= COALESCE(max(assoc.disconnected_at),'3000-01-01'::date) )
        THEN sum(COALESCE(external_order.totalsales, 0::bigint)) ELSE sum(COALESCE(shared_url_order.totalsales, 0::bigint)) END AS "totalValueSoretoSalesJoined",
    
    CASE WHEN (dates.date >= max(assoc.connected_at) and dates.date <= COALESCE(max(assoc.disconnected_at),'3000-01-01'::date) )
        THEN sum(COALESCE(external_order.totalsalespending, 0::bigint)) ELSE sum(COALESCE(shared_url_order.totalsalespending, 0::bigint)) END AS "totalValueSoretoSalesPendingJoined",
    
    CASE WHEN (dates.date >= max(assoc.connected_at) and dates.date <= COALESCE(max(assoc.disconnected_at),'3000-01-01'::date) )
        THEN sum(COALESCE(external_order.totalsalespaid, 0::bigint)) ELSE sum(COALESCE(shared_url_order.totalsalespaid, 0::bigint)) END AS "totalValueSoretoSalesPaidJoined",
    
    CASE WHEN (dates.date >= max(assoc.connected_at) and dates.date <= COALESCE(max(assoc.disconnected_at),'3000-01-01'::date) )
        THEN sum(COALESCE(external_order.totalsalesdeclined, 0::bigint)) ELSE sum(COALESCE(shared_url_order.totalsalesdeclined, 0::bigint)) END AS "totalValueSoretoSalesDeclinedJoined",
    
    CASE WHEN (dates.date >= max(assoc.connected_at) and dates.date <= COALESCE(max(assoc.disconnected_at),'3000-01-01'::date) )
        THEN sum(COALESCE(external_order.totalcommission, 0::bigint)) ELSE sum(COALESCE(shared_url_order.totalcommission, 0::bigint)) END AS "totalValueSoretoCommissionJoined",
    
    CASE WHEN (dates.date >= max(assoc.connected_at) and dates.date <= COALESCE(max(assoc.disconnected_at),'3000-01-01'::date) )
        THEN sum(COALESCE(external_order.totalcommissionpending, 0::bigint)) ELSE sum(COALESCE(shared_url_order.totalcommissionpending, 0::bigint)) END AS "totalValueSoretoCommissionPendingJoined",
    
    CASE WHEN (dates.date >= max(assoc.connected_at) and dates.date <= COALESCE(max(assoc.disconnected_at),'3000-01-01'::date) )
        THEN sum(COALESCE(external_order.totalcommissionpaid, 0::bigint)) ELSE sum(COALESCE(shared_url_order.totalcommissionpaid, 0::bigint)) END AS "totalValueSoretoCommissionPaidJoined",
    
    CASE WHEN (dates.date >= max(assoc.connected_at) and dates.date <= COALESCE(max(assoc.disconnected_at),'3000-01-01'::date) )
        THEN sum(COALESCE(external_order.totalcommissiondeclined, 0::bigint)) ELSE sum(COALESCE(shared_url_order.totalcommissiondeclined, 0::bigint)) END AS "totalValueSoretoCommissionDeclinedJoined",
    
    -- MIXED SOURCE
    CASE 
        WHEN (max(assoc.report_order_source) is null) OR (MAX(assoc.report_order_source) = 'SORETO')
            THEN sum(COALESCE(shared_url_order.countsales, 0::bigint))
        WHEN (MAX(assoc.report_order_source) = 'EXTERNAL-AFFILIATE')
            THEN sum(COALESCE(external_order.countsales, 0::bigint))
        WHEN (MAX(assoc.report_order_source) = 'JOINED')
            THEN 
                CASE WHEN (dates.date >= max(assoc.connected_at) and dates.date <= COALESCE(max(assoc.disconnected_at),'3000-01-01'::date) )
                    THEN sum(COALESCE(external_order.countsales, 0::bigint)) ELSE sum(COALESCE(shared_url_order.countsales, 0::bigint)) END
                    
    END AS "countSales",
    
    -- COUNT SALES PENDING
    CASE 
        WHEN (max(assoc.report_order_source) is null) OR (MAX(assoc.report_order_source) = 'SORETO')
            THEN sum(COALESCE(shared_url_order.countsalespending, 0::bigint))
        WHEN (MAX(assoc.report_order_source) = 'EXTERNAL-AFFILIATE')
            THEN sum(COALESCE(external_order.countsalespending, 0::bigint))
        WHEN (MAX(assoc.report_order_source) = 'JOINED')
            THEN 
                CASE WHEN (dates.date >= max(assoc.connected_at) and dates.date <= COALESCE(max(assoc.disconnected_at),'3000-01-01'::date) )
                    THEN sum(COALESCE(external_order.countsalespending, 0::bigint)) ELSE sum(COALESCE(shared_url_order.countsalespending, 0::bigint)) END
                    
    END AS "countSalesPending",
    
    -- COUNT SALES PAID
    CASE 
        WHEN (max(assoc.report_order_source) is null) OR (MAX(assoc.report_order_source) = 'SORETO')
            THEN sum(COALESCE(shared_url_order.countsalespaid, 0::bigint))
        WHEN (MAX(assoc.report_order_source) = 'EXTERNAL-AFFILIATE')
            THEN sum(COALESCE(external_order.countsalespaid, 0::bigint))
        WHEN (MAX(assoc.report_order_source) = 'JOINED')
            THEN 
                CASE WHEN (dates.date >= max(assoc.connected_at) and dates.date <= COALESCE(max(assoc.disconnected_at),'3000-01-01'::date) )
                    THEN sum(COALESCE(external_order.countsalespaid, 0::bigint)) ELSE sum(COALESCE(shared_url_order.countsalespaid, 0::bigint)) END
                    
    END AS "countSalesPaid",
    
    -- COUNT SALES DECLINED
    CASE 
        WHEN (max(assoc.report_order_source) is null) OR (MAX(assoc.report_order_source) = 'SORETO')
            THEN sum(COALESCE(shared_url_order.countsalesdeclined, 0::bigint))
        WHEN (MAX(assoc.report_order_source) = 'EXTERNAL-AFFILIATE')
            THEN sum(COALESCE(external_order.countsalesdeclined, 0::bigint))
        WHEN (MAX(assoc.report_order_source) = 'JOINED')
            THEN 
                CASE WHEN (dates.date >= max(assoc.connected_at) and dates.date <= COALESCE(max(assoc.disconnected_at),'3000-01-01'::date) )
                    THEN sum(COALESCE(external_order.countsalesdeclined, 0::bigint)) ELSE sum(COALESCE(shared_url_order.countsalesdeclined, 0::bigint)) END
                    
    END AS "countSalesDeclined",
    
    -- TOTAL VALUE SALES
    CASE 
        WHEN (max(assoc.report_order_source) is null) OR (MAX(assoc.report_order_source) = 'SORETO')
            THEN sum(COALESCE(shared_url_order.totalsales, 0::bigint::numeric))
        WHEN (MAX(assoc.report_order_source) = 'EXTERNAL-AFFILIATE')
            THEN sum(COALESCE(external_order.totalsales, 0::bigint::numeric))
        WHEN (MAX(assoc.report_order_source) = 'JOINED')
            THEN 
                CASE WHEN (dates.date >= max(assoc.connected_at) and dates.date <= COALESCE(max(assoc.disconnected_at),'3000-01-01'::date) )
                    THEN sum(COALESCE(external_order.totalsales, 0::bigint)) ELSE sum(COALESCE(shared_url_order.totalsales, 0::bigint)) END
                    
    END AS "totalValueSales",
    
    -- TOTAL VALUE SALES PENDING
    CASE 
        WHEN (max(assoc.report_order_source) is null) OR (MAX(assoc.report_order_source) = 'SORETO')
            THEN sum(COALESCE(shared_url_order.totalsalespending, 0::bigint::numeric))
        WHEN (MAX(assoc.report_order_source) = 'EXTERNAL-AFFILIATE')
            THEN sum(COALESCE(external_order.totalsalespending, 0::bigint::numeric))
        WHEN (MAX(assoc.report_order_source) = 'JOINED')
            THEN 
                CASE WHEN (dates.date >= max(assoc.connected_at) and dates.date <= COALESCE(max(assoc.disconnected_at),'3000-01-01'::date) )
                    THEN sum(COALESCE(external_order.totalsalespending, 0::bigint)) ELSE sum(COALESCE(shared_url_order.totalsalespending, 0::bigint)) END
            
    END AS "totalValueSalesPending",
    
    -- TOTAL VALUE SALES PAID
    CASE 
        WHEN (max(assoc.report_order_source) is null) OR (MAX(assoc.report_order_source) = 'SORETO')
            THEN sum(COALESCE(shared_url_order.totalsalespaid, 0::bigint::numeric))
        WHEN (MAX(assoc.report_order_source) = 'EXTERNAL-AFFILIATE')
            THEN sum(COALESCE(external_order.totalsalespaid, 0::bigint::numeric))
        WHEN (MAX(assoc.report_order_source) = 'JOINED')
            THEN
                CASE WHEN (dates.date >= max(assoc.connected_at) and dates.date <= COALESCE(max(assoc.disconnected_at),'3000-01-01'::date) )
                    THEN sum(COALESCE(external_order.totalsalespaid, 0::bigint)) ELSE sum(COALESCE(shared_url_order.totalsalespaid, 0::bigint)) END
                    
    END AS "totalValueSalesPaid",
    
    -- TOTAL VALUE SALES DECLINED
    CASE 
        WHEN (max(assoc.report_order_source) is null) OR (MAX(assoc.report_order_source) = 'SORETO')
            THEN sum(COALESCE(shared_url_order.totalsalesdeclined, 0::bigint::numeric))
        WHEN (MAX(assoc.report_order_source) = 'EXTERNAL-AFFILIATE')
            THEN sum(COALESCE(external_order.totalsalesdeclined, 0::bigint::numeric))
        WHEN (MAX(assoc.report_order_source) = 'JOINED')
            THEN 
                CASE WHEN (dates.date >= max(assoc.connected_at) and dates.date <= COALESCE(max(assoc.disconnected_at),'3000-01-01'::date) )
                    THEN sum(COALESCE(external_order.totalsalesdeclined, 0::bigint)) ELSE sum(COALESCE(shared_url_order.totalsalesdeclined, 0::bigint)) END
                    
    END AS "totalValueSalesDeclined",
    
    -- TOTAL VALUE COMMISSION
    CASE 
        WHEN (max(assoc.report_order_source) is null) OR (MAX(assoc.report_order_source) = 'SORETO')
            THEN sum(COALESCE(shared_url_order.totalcommission, 0::bigint::numeric))
        WHEN (MAX(assoc.report_order_source) = 'EXTERNAL-AFFILIATE')
            THEN sum(COALESCE(external_order.totalcommission, 0::bigint::numeric))
        WHEN (MAX(assoc.report_order_source) = 'JOINED')
            THEN 
                CASE WHEN (dates.date >= max(assoc.connected_at) and dates.date <= COALESCE(max(assoc.disconnected_at),'3000-01-01'::date) )
                    THEN sum(COALESCE(external_order.totalcommission, 0::bigint)) ELSE sum(COALESCE(shared_url_order.totalcommission, 0::bigint)) END
            
    END AS "totalValueCommission",
    
    -- TOTAL VALUE COMMISSION PENDING
    CASE 
        WHEN (max(assoc.report_order_source) is null) OR (MAX(assoc.report_order_source) = 'SORETO')
            THEN sum(COALESCE(shared_url_order.totalcommissionpending, 0::bigint::numeric))
        WHEN (MAX(assoc.report_order_source) = 'EXTERNAL-AFFILIATE')
            THEN sum(COALESCE(external_order.totalcommissionpending, 0::bigint::numeric))
        WHEN (MAX(assoc.report_order_source) = 'JOINED')
            THEN 
                CASE WHEN (dates.date >= max(assoc.connected_at) and dates.date <= COALESCE(max(assoc.disconnected_at),'3000-01-01'::date) )
                    THEN sum(COALESCE(external_order.totalcommissionpending, 0::bigint)) ELSE sum(COALESCE(shared_url_order.totalcommissionpending, 0::bigint)) END
                    
    END AS "totalValueCommissionPending",
    
    -- TOTAL VALUE COMMISSION PAID
    CASE 
        WHEN (max(assoc.report_order_source) is null) OR (MAX(assoc.report_order_source) = 'SORETO')
            THEN sum(COALESCE(shared_url_order.totalcommissionpaid, 0::bigint::numeric))
        WHEN (MAX(assoc.report_order_source) = 'EXTERNAL-AFFILIATE')
            THEN sum(COALESCE(external_order.totalcommissionpaid, 0::bigint::numeric))
        WHEN (MAX(assoc.report_order_source) = 'JOINED')
            THEN
                CASE WHEN (dates.date >= max(assoc.connected_at) and dates.date <= COALESCE(max(assoc.disconnected_at),'3000-01-01'::date) )
                    THEN sum(COALESCE(external_order.totalcommissionpaid, 0::bigint)) ELSE sum(COALESCE(shared_url_order.totalcommissionpaid, 0::bigint)) END
                    
    END AS "totalValueCommissionPaid",
    
    -- TOTAL VALUE COMMISSION DECLINED
    CASE 
        WHEN (max(assoc.report_order_source) is null) OR (MAX(assoc.report_order_source) = 'SORETO')
            THEN sum(COALESCE(shared_url_order.totalcommissiondeclined, 0::bigint::numeric))
        WHEN (MAX(assoc.report_order_source) = 'EXTERNAL-AFFILIATE')
            THEN sum(COALESCE(external_order.totalcommissiondeclined, 0::bigint::numeric))
        WHEN (MAX(assoc.report_order_source) = 'JOINED')
            THEN
                CASE WHEN (dates.date >= max(assoc.connected_at) and dates.date <= COALESCE(max(assoc.disconnected_at),'3000-01-01'::date) )
                    THEN sum(COALESCE(external_order.totalcommissiondeclined, 0::bigint)) ELSE sum(COALESCE(shared_url_order.totalcommissiondeclined, 0::bigint)) END
                    
    END AS "totalValueCommissionDeclined",
    
    -- CLICKS
    CASE 
        WHEN (max(assoc.report_click_source) is null) OR (MAX(assoc.report_click_source) = 'SORETO')
            THEN COALESCE(max(tracking_event_history.interstitial_loaded), 0)
        WHEN (MAX(assoc.report_click_source) = 'EXTERNAL-AFFILIATE')
            THEN 
                CASE
                WHEN ROW_NUMBER() OVER ( PARTITION BY dates.date, client._id ORDER BY dates.date, client.name NULLS LAST) = 1
                    THEN COALESCE(sum(EC.clicks), 0) + COALESCE(max(ECU.clicks),0)		                   
                        ELSE COALESCE(sum(EC.clicks), 0)
                    END
        WHEN (MAX(assoc.report_click_source) = 'JOINED')
            THEN 
                CASE
                WHEN ROW_NUMBER() OVER ( PARTITION BY dates.date, client._id ORDER BY dates.date, client.name NULLS LAST) = 1
                    THEN
                        CASE WHEN (dates.date >= max(assoc.connected_at) and dates.date <= COALESCE(max(assoc.disconnected_at),'3000-01-01'::date) )
                            THEN COALESCE(sum(EC.clicks), 0) + COALESCE(max(ECU.clicks),0)
                            ELSE max(tracking_event_history.interstitial_loaded)
                        END
                ELSE
                    CASE WHEN (dates.date >= max(assoc.connected_at) and dates.date <= COALESCE(max(assoc.disconnected_at),'3000-01-01'::date) )
                        THEN COALESCE(sum(EC.clicks), 0)
                        ELSE max(tracking_event_history.interstitial_loaded)
                    END
                    END
    END AS "clicks",
                
    -- SORETO CLICKS
    max(tracking_event_history.interstitial_loaded) AS "clicksSoreto",
    
    -- EXTERNAL TRACKED CLICKS
    sum(EC.clicks) AS "clicksTrackedExternal",
    
    -- EXTERNAL UNTRACKED CLICKS
    CASE
        WHEN ROW_NUMBER() OVER ( PARTITION BY dates.date, client._id ORDER BY dates.date, client.name NULLS LAST) = 1
            THEN COALESCE(max(ECU.clicks),0)
        ELSE NULL
    END AS "clicksUntrackedExternal",
    
    -- EXTERNAL JOINED Clicks
    CASE
        WHEN ROW_NUMBER() OVER ( PARTITION BY dates.date, client._id ORDER BY dates.date, client.name NULLS LAST) = 1
            THEN
                CASE WHEN (dates.date >= max(assoc.connected_at) and dates.date <= COALESCE(max(assoc.disconnected_at),'3000-01-01'::date) )
                    THEN COALESCE(sum(EC.clicks), 0) + COALESCE(max(ECU.clicks),0)
                    ELSE max(tracking_event_history.interstitial_loaded)
                END
        ELSE
            CASE WHEN (dates.date >= max(assoc.connected_at) and dates.date <= COALESCE(max(assoc.disconnected_at),'3000-01-01'::date) )
                THEN COALESCE(sum(EC.clicks), 0)
                ELSE max(tracking_event_history.interstitial_loaded)
            END
    END AS "clicksJoined",
    
    -- EXTERNAL JOINED UNTRACKED Clicks
    CASE WHEN (dates.date >= max(assoc.connected_at) and dates.date <= COALESCE(max(assoc.disconnected_at),'3000-01-01'::date) )
                THEN
                        (
                            CASE
                            WHEN ROW_NUMBER() OVER ( PARTITION BY dates.date, client._id ORDER BY dates.date, client.name NULLS LAST) = 1
                                THEN COALESCE(max(ECU.clicks),0)
                            ELSE NULL
                        END
                    )
    
                ELSE NULL
        END AS "clicksJoinedUntracked",
    
    -- TRACKING EVENT HISTORY
    max(tracking_event_history.lightbox_load) AS "clientSales",
    max(tracking_event_history.lightbox_clickone_cta) AS "offerClicks",
    max(tracking_event_history.interstitial_cta) AS "soretoTraffic",
    
    -- SOCIAL POST
    sum(COALESCE(social_post.shares, 0::bigint)) AS shares
    
    FROM
    reverb.shared_url shared_url
    
    JOIN
    reverb.value_date dates
    ON
    dates.date >= (cast(date_trunc('week', (NOW() - INTERVAL '61 day')) as date) + 1) and dates.date <= (NOW()::date + INTERVAL '1 day')
    
    LEFT JOIN
    reverb.client client
    ON
    shared_url.client_id = client._id
    
    LEFT JOIN reverb.assoc_affiliate_merchant_client assoc ON client._id = assoc.client_id
    LEFT JOIN
    reverb.campaign campaign
    ON
    client._id = campaign.client_id
    
    JOIN
    reverb.campaign_version campaign_version
    ON
    campaign._id = campaign_version.campaign_id
    AND
    shared_url.campaign_version_id = campaign_version._id
    
    ------------------------------------------------
    -- TRACK EVENT HISTORY
    ------------------------------------------------
    LEFT JOIN
    
    (
        SELECT
    
            tracking_event_history_1.created_at::date AS created_at,
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
    
        FROM
            reverb.tracking_event_history tracking_event_history_1
        WHERE
            tracking_event_history_1.test_mode = false
        GROUP BY
            (tracking_event_history_1.created_at::date), tracking_event_history_1.client_id, tracking_event_history_1.campaign_id, tracking_event_history_1.campaign_version_id
    
    ) tracking_event_history
    
    ON
        shared_url.client_id = tracking_event_history.client_id
    AND
        (
            shared_url.campaign_id = tracking_event_history.campaign_id
            OR
            tracking_event_history.campaign_id
            IS NULL
        )
    AND
        (
            shared_url.campaign_version_id = tracking_event_history.campaign_version_id
            OR
            tracking_event_history.campaign_version_id IS NULL
        )
    AND
        tracking_event_history.created_at = dates.date
    
    ------------------------------------------------
    -- SHARED URL ORDER (orders related with a shared url)
    ------------------------------------------------
    LEFT JOIN
    
    (
        SELECT
    
            sum(
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
        FROM
            reverb."order" orders
        GROUP BY
            (orders.meta ->> 'sharedUrlId'::text), (orders.created_at::date)
    
    ) shared_url_order
    ON
        shared_url._id = shared_url_order.shared_url_id
    AND
        shared_url_order.created_at = dates.date
    
    ------------------------------------------------
    -- EXTERNAL ORDERS
    ------------------------------------------------
    LEFT JOIN
    
    (
        SELECT
            shared_url_access.shared_url_id as shared_url_id,
            eo.transacted_at::date AS transacted_at,
            sum(
                CASE
                    WHEN eo.status = 'PENDING'::text OR eo.status <> 'VOID'::text THEN 1
                    ELSE 0
                END) AS countsales,
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
                END) AS totalcommission,
            sum(
                CASE
                    WHEN eo.status = 'PENDING'::text OR eo.status = 'THIRD_PARTY_PENDING'::text THEN eo.commission
                    ELSE 0::numeric
                END) AS totalcommissionpending,
            sum(
                CASE
                    WHEN eo.status = 'PAID'::text THEN eo.commission
                    ELSE 0::numeric
                END) AS totalcommissionpaid,
            sum(
                CASE
                    WHEN eo.status = 'CANCELLED'::text THEN eo.commission
                    ELSE 0::numeric
                END) AS totalcommissiondeclined,
            sum(
                CASE
                    WHEN eo.status = 'PENDING'::text OR eo.status <> 'VOID'::text THEN COALESCE(eo.total, eo.total)
                    ELSE 0::numeric
                END) AS totalsales,
            sum(
                CASE
                    WHEN eo.status = 'PENDING'::text OR eo.status = 'THIRD_PARTY_PENDING'::text THEN COALESCE(eo.total, eo.total)
                    ELSE 0::numeric
                END) AS totalsalespending,
            sum(
                CASE
                    WHEN eo.status = 'PAID'::text THEN COALESCE(eo.total, eo.total)
                    ELSE 0::numeric
                END) AS totalsalespaid,
            sum(
                CASE
                    WHEN eo.status = 'CANCELLED'::text THEN COALESCE(eo.total, eo.total)
                    ELSE 0::numeric
                END) AS totalsalesdeclined
    
        FROM
            reverb.external_order eo
    
        LEFT JOIN
    
            reverb.shared_url_access shared_url_access
        ON
            eo.shared_url_access_id = shared_url_access._id
    
        GROUP BY
            eo.transacted_at::date, shared_url_id
    
    ) external_order
    ON
        shared_url._id = external_order.shared_url_id
        AND
        external_order.transacted_at = dates.date
    
    ------------------------------------------------
    -- EXTERNAL CLICKS
    ------------------------------------------------
    LEFT JOIN
    
    (
        select
            external_click.date,
            SUA.shared_url_id,
            sum(external_click.clicks) as clicks,
            external_click.client_id
        FROM
            reverb.external_click AS external_click
    
        INNER JOIN
            reverb.shared_url_access SUA
    
        ON
            SUA._id = external_click.shared_url_access_id
        group by
            external_click.date,
            SUA.shared_url_id,
            external_click.client_id
    
    ) AS EC
    
    ON
        EC.shared_url_id = shared_url._id
        AND
        dates.date = EC.date
    
    ------------------------------------------------
    -- EXTERNAL CLICKS UNTRACKED
    ------------------------------------------------
    LEFT JOIN
    
    (
        select
            external_click.date,
            sum(external_click.clicks) as clicks,
            external_click.client_id
    
        FROM
            reverb.external_click AS external_click
    
        WHERE
            external_click.shared_url_access_id is null
    
        group by
            external_click.date,
            external_click.client_id
    
    ) AS ECU
    
    ON
        ECU.client_id = shared_url.client_id
        AND
        ECU.date = dates.date
    
    ------------------------------------------------
    -- SOCIAL POST
    ------------------------------------------------
    LEFT JOIN
    
    (
        SELECT
            count(social_post_1._id) AS shares,
            social_post_1.shared_url_id,
            social_post_1.created_at::date AS created_at
        FROM
            reverb.social_post social_post_1
        GROUP BY
            social_post_1.shared_url_id, (social_post_1.created_at::date)
    
    ) social_post
    
    ON
        shared_url._id = social_post.shared_url_id
        AND
        social_post.created_at = dates.date
    
    ------------------------------------------------
    -- SQL: MAIN WHERE
    ------------------------------------------------
    WHERE
    
    client.name <> 'UNREGISTERED'::text
    AND
    shared_url.test_mode = false
    
    GROUP BY
    dates.date, client._id, campaign._id, campaign_version._id, tracking_event_history.campaign_id
    
    ORDER BY
    dates.date, client.name, campaign._id, campaign_version._id, tracking_event_history.campaign_id
    
    WITH NO DATA;
    
    CREATE UNIQUE INDEX index_agg_campaign_version_stats_daily_latest_js
    ON
        reverb.agg_campaign_version_stats_daily_latest_js (date, "clientId", "campaignId", "campaignVersionId");    
    `;

  return knex.schema.raw(script);
};

exports.down = function(knex) {

  let script = ``;
  return knex.schema.raw(script);
};