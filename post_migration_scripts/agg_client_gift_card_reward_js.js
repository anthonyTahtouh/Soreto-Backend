exports.seed = function (knex) {
  return knex.raw(`
  DROP VIEW IF EXISTS reverb.agg_client_gift_card_reward_js;
  CREATE OR REPLACE VIEW reverb.agg_client_gift_card_reward_js AS
  SELECT 
  c."_id" as "_id",
  c."name" as "name"
  FROM reverb.client c
  LEFT JOIN reverb.reward_pool rp on rp.client_id = c."_id"
  INNER JOIN reverb.reward r on r."_id" = rp.advocate_post_conversion_reward_id or r."_id" = rp.friend_post_reward_id
  WHERE r.gift_card_reward = true
  GROUP BY c."_id" , c."name"
  `);
};
