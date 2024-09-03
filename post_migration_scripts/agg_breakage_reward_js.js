exports.seed = function (knex) {
  return knex.raw(`
  DROP VIEW IF EXISTS reverb.agg_breakage_reward_js;
  CREATE OR REPLACE VIEW reverb.agg_breakage_reward_js AS
  SELECT
    cli."name" as "clientName",
    cli."_id" as "clientId",
    co."name" as "countryName",
    r."_id",
    r."name" as "rewardName",
    eo.status,
    to_char(eo.transacted_at, 'YYYY-MM') as "month",  
    count(eo._id) as total,  
    SUM( CASE
      WHEN opr.processed = true and opr.status = 'DONE' THEN 1
      ELSE 0
      END) as "GiftCardEmailSent",
    SUM( CASE
      WHEN ( su.meta->>'assignedCodeId' is null and su.created_at >= (CURRENT_DATE::date - cv.link_expiry_days)) = true THEN 1
      ELSE 0
      END) as "GiftCardPending", -- Código que as pessoas Não pegaram
    SUM( CASE
      WHEN su.meta->>'assignedCodeId' is not null THEN 1
      ELSE 0
      END) as "GiftCardReedemed", -- Código que as pessoas pegaram
    SUM( CASE
      WHEN ( su.meta->>'assignedCodeId' is null and su.created_at < (CURRENT_DATE::date - cv.link_expiry_days)) = true THEN 1
      ELSE 0
      END) as "GiftCardExpired",
    SUM( CASE
      WHEN ( opr.status = 'NO_DISCOUNT_CODE_AVAILABLE') THEN 1
      ELSE 0
      END) as "LackOfCodes",
    SUM( CASE
      WHEN ( opr.status = 'BLOCKED_CIRCULAR_REWARD') THEN 1
      ELSE 0
      END) as "CircularReward"
  FROM 
    reverb.external_order eo 
    LEFT JOIN
      reverb.order_post_reward opr on eo."_id" = opr.external_order_id
    LEFT JOIN
      reverb.shared_url su on su."_id" = opr.shared_url_id
    LEFT JOIN
      reverb.shared_url_access sua on sua."_id" = eo.shared_url_access_id
    LEFT JOIN
      reverb.shared_url suo on suo."_id" = sua.shared_url_id
    LEFT JOIN
      reverb.campaign_version cv on cv."_id" = suo.campaign_version_id
    INNER JOIN
      reverb.campaign c on cv.campaign_id = c._id
    INNER JOIN
      reverb.country co on co."_id" = c.country_id
    INNER JOIN
      reverb.client cli on cli."_id" = c.client_id
    LEFT JOIN 
      reverb.reward_pool rp on cv.reward_pool_id = rp."_id"
    INNER JOIN 
      reverb.reward r on r."_id" = rp.advocate_post_conversion_reward_id or r."_id" = rp.friend_post_reward_id
  WHERE
    r.gift_card_reward = true
  group by 1,2,3,4,5,6, 7
  `);
};
