
exports.up = function(knex) {

  let script = `

  DROP MATERIALIZED VIEW IF EXISTS reverb.agg_client_by_channel_stats_legacy_js;

  CREATE MATERIALIZED VIEW reverb.agg_client_by_channel_stats_legacy_js

  TABLESPACE

  pg_default

  AS

  SELECT
      su.client_id,
      (CASE WHEN (max(assoc.client_id) = su.client_id) THEN true ELSE false END) as "externalMerchantHolderConfigured",
      (CASE WHEN (max(assoc.connected_at) is not null) THEN max(assoc.connected_at) ELSE null END) as "externalMerchantHolderConnectedAt",
      (CASE WHEN (max(assoc.disconnected_at) is not null) THEN max(assoc.disconnected_at) ELSE null END) as "externalMerchantHolderDisconnectedAt",
      (CASE WHEN (Dates.date >= max(assoc.connected_at) and Dates.date <= COALESCE(max(assoc.disconnected_at),'3000-01-01'::date) ) THEN true ELSE false END) as "externalMerchantHolderConnected",
      DATES.date,
      SOCIAL_PLATFORM.social_platform AS "socialPlatform",

      -- SORETO SHARES
      (
          CASE SOCIAL_PLATFORM.social_platform
          WHEN 'UNTRACKED'::text then 0
          ELSE sum(COALESCE(SP.shares, 0::bigint))
          END

      ) AS shares,

      -- SORETO CLICKS
      (
          CASE SOCIAL_PLATFORM.social_platform
          WHEN 'UNTRACKED'::text then 0
          ELSE COALESCE(sum(tracking_event_history.interstitial_loaded), 0::bigint)
          END

      ) AS clicks,

      -- CLICKS EXTERNAL
      (
          CASE SOCIAL_PLATFORM.social_platform
          WHEN 'UNTRACKED'::text then max(COALESCE(ECU.clicks, 0::bigint))
          ELSE sum(COALESCE(EC.clicks, 0::bigint))
          END

      ) AS "clicksExternal",

      -- CLICKS JOINED SALES SORETO and AFFILIATE
      (
          CASE SOCIAL_PLATFORM.social_platform
          WHEN 'UNTRACKED'::text
              THEN

                  CASE
                      WHEN ( Dates.date >= max(assoc.connected_at) and Dates.date <= COALESCE(max(assoc.disconnected_at),'3000-01-01'::date) )
                      THEN max(COALESCE(ECU.clicks, 0::bigint))
                      ELSE 0
                  END
              ELSE
                  CASE
                      WHEN ( Dates.date >= max(assoc.connected_at) and Dates.date <= COALESCE(max(assoc.disconnected_at),'3000-01-01'::date) )
                      THEN sum(COALESCE(EC.clicks, 0::bigint))
                      ELSE COALESCE(sum(tracking_event_history.interstitial_loaded), 0::bigint)
                  END
          END

      ) AS "clicksJoined",

      -- SORETO SALES
      (
          CASE SOCIAL_PLATFORM.social_platform
          WHEN 'UNTRACKED'::text then 0
          ELSE sum(COALESCE(SUO.countsales, 0::bigint))
          END

      ) AS "countSoretoSales",

      -- SORETO SALES EXTERNAL
      (
          CASE SOCIAL_PLATFORM.social_platform
          WHEN 'UNTRACKED'::text then 0
          ELSE sum(COALESCE(SUEO.countsales, 0::bigint))
          END

      ) AS "countSoretoSalesExternal",

      -- SORETO JOINED SALES SORETO and AFFILIATE
      (
          CASE SOCIAL_PLATFORM.social_platform
          WHEN 'UNTRACKED'::text then 0
          ELSE
              CASE
                  WHEN ( Dates.date >= max(assoc.connected_at) and Dates.date <= COALESCE(max(assoc.disconnected_at),'3000-01-01'::date) )
                  THEN sum(COALESCE(SUEO.countsales, 0::bigint))
                  ELSE sum(COALESCE(SUO.countsales, 0::bigint))
              END
          END

      ) AS "countSoretoSalesJoined"

  FROM
      reverb.shared_url SU

  JOIN
      reverb.value_date DATES ON dates.date >= '2018-01-01' and dates.date <= (NOW()::date - INTERVAL '61 day')

  LEFT JOIN reverb.assoc_affiliate_merchant_client assoc ON SU.client_id = assoc.client_id

  JOIN reverb.client client ON SU.client_id = client._id

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
          ECU.client_id = SU.client_id
          AND
          ECU.date = dates.date

  -----------------------------------------
  -- SOCIAL PLATFORM
  -----------------------------------------
  LEFT JOIN
  (
      SELECT
          shared_url_id,
          social_platform,
          shared_url_group_id
      FROM
          -- this sub select joins social_post with shared_url to add the "shared_group_id" field
          -- it allows us to bring other rows from shared_url that does not have a related social_post
          -- by linking the registers through "shared_group_id"
          (
              SELECT
                  shared_url_id,
                  social_platform,
                  su_i.shared_url_group_id,
                  row_number() OVER(PARTITION BY sp_i.shared_url_id ORDER BY sp_i.created_at asc) AS rn
              FROM
                  reverb.social_post sp_i
              JOIN
                  reverb.shared_url su_i
                  ON
                  sp_i.shared_url_id = su_i._id
          ) sub
      WHERE
          rn = 1

      UNION
          select
              '',
              'UNTRACKED',
              ''

  ) SOCIAL_PLATFORM

  ON
      (
          SU._id = SOCIAL_PLATFORM.shared_url_id
          OR
          SU.shared_url_group_id = SOCIAL_PLATFORM.shared_url_group_id
      )
      or
      (
          SOCIAL_PLATFORM.social_platform = 'UNTRACKED'
      )

  -----------------------------------------
  -- TRACK EVENT HISTORY
  -----------------------------------------
  LEFT JOIN
  (
      SELECT
          tracking_event_history_1.created_at::date AS created_at,
          tracking_event_history_1.client_id,
          max(tracking_event_history_1.meta->>'sharedUrlId') as shared_url_id,
          sum(
                  CASE tracking_event_history_1.type
                  WHEN 'interstitial-loaded'::text THEN 1
                  ELSE 0
                  END
              ) AS interstitial_loaded
      FROM
          reverb.tracking_event_history tracking_event_history_1
      WHERE
          tracking_event_history_1.test_mode = false
      GROUP BY
      (tracking_event_history_1.created_at::date), tracking_event_history_1.client_id, tracking_event_history_1.meta->>'sharedUrlId'

  ) tracking_event_history

  ON
      SU.client_id = tracking_event_history.client_id
  AND
      SU._id = tracking_event_history.shared_url_id
  AND
      tracking_event_history.created_at = DATES.date

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
          EC.shared_url_id = SU._id
          AND
          DATES.date = EC.date

  -----------------------------------------
  -- ORDERS
  -----------------------------------------
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

      FROM
          reverb."order" orders
      GROUP BY
          (orders.meta ->> 'sharedUrlId'::text), (orders.created_at::date)

  ) SUO
  ON
      SU._id = SUO.shared_url_id
  AND
      SUO.created_at = DATES.date

  -----------------------------------------
  -- EXTERNAL ORDERS
  -----------------------------------------
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

      GROUP BY
          eo.transacted_at::date, shared_url_id

  ) SUEO
  ON
      SU._id = SUEO.shared_url_id
  AND
      SUEO.transacted_at = DATES.date

  -----------------------------------------
  -- SOCIAL POST
  -----------------------------------------
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
  ) SP
  ON
      SU._id = SP.shared_url_id
  AND
      SP.created_at = DATES.date

  -----------------------------------------
  -- MAIN WHERE
  -----------------------------------------
  WHERE
          SOCIAL_PLATFORM.social_platform is not null
      AND
          SU.campaign_version_id is not null
      AND
          SU.test_mode = false
      
  GROUP BY
      su.client_id,
      DATES.date,
      SOCIAL_PLATFORM.social_platform

  WITH NO DATA;

  CREATE UNIQUE INDEX index_agg_client_by_channel_stats_legacy_js ON reverb.agg_client_by_channel_stats_legacy_js (date,client_id,"socialPlatform");
        
  `;

  return knex.schema.raw(script);
};

exports.down = function(knex) {

  let script = ``;
  return knex.schema.raw(script);
};