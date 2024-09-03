export function up(knex) {
  var query = `
  DROP VIEW reverb.paid_orders_with_oustanding_rewards_js;

CREATE OR REPLACE VIEW reverb.paid_orders_with_oustanding_rewards_js AS
 SELECT users.email,
    rewards.type,
    rewards._id AS "rewardId",
    orders._id AS "orderId",
    campaign_version._id AS "campaignVersionId"
   FROM reverb."order" orders
     LEFT JOIN reverb.shared_url shared_urls ON (orders.meta ->> 'sharedUrlId'::text) = shared_urls._id
     LEFT JOIN reverb."user" users ON users._id = orders.sharer_id
     LEFT JOIN reverb.campaign_version campaign_version ON campaign_version._id = shared_urls.campaign_version_id
     LEFT JOIN reverb.reward_pool reward_pool ON campaign_version.reward_pool_id = reward_pool._id
     JOIN reverb.reward rewards ON rewards._id = reward_pool.advocate_post_conversion_reward_id
  WHERE orders.status = 'PAID'::text AND NOT (orders._id IN ( SELECT process_post_conversion_reward.order_id
           FROM reverb.process_post_conversion_reward
          WHERE process_post_conversion_reward.process_status = 'process-complete'::text AND process_post_conversion_reward.order_id IS NOT NULL));
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ``;
  return knex.schema.raw(query);
}