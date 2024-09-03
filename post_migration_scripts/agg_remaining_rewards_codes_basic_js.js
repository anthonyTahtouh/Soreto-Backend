exports.seed = function(knex) {
  return knex.raw(`
  DROP VIEW IF EXISTS reverb.agg_remaining_rewards_codes_basic_js;
  CREATE OR REPLACE VIEW reverb.agg_remaining_rewards_codes_basic_js 
  AS 
  SELECT rdc.reward_id AS "rewardId", r.name AS "rewardName", c.name AS "clientName", count(rdc.code) AS  "remainingCodes" , c.active AS "clientActive"
  FROM reverb.reward r
      INNER JOIN reverb.client c ON r.client_id  = c."_id" 
      INNER JOIN reverb.reward_discount_code rdc ON r."_id" = rdc.reward_id 
      WHERE rdc.attributed_user_id IS NULL AND rdc.active_from <= now() AND (rdc.active_to is null OR rdc.active_to >= now()) AND rdc.active ='true' AND r.type = 'batch-discount'
      GROUP BY (rdc.reward_id, r.name, c."name", c.active )`
  );
};

