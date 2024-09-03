export function up(knex) {
  var query = `
  CREATE OR REPLACE VIEW reverb.agg_process_post_conversion_reward_user_email_js AS
  SELECT process_post_conversion_reward._id,
     process_post_conversion_reward.process_id AS "processId",
     process_post_conversion_reward.created_at AS "createdAt",
     process_post_conversion_reward.reward_id AS "rewardId",
     process_post_conversion_reward.order_id AS "orderId",
     process_post_conversion_reward.process_status AS "processStatus",
     process_post_conversion_reward.meta,
     userX.email as "email",
   shared_url.campaign_version_id as "campaignVersionId",
   orderX.sharer_id as "sharerId"
   
   
     FROM reverb.process_post_conversion_reward
     left join reverb.order as orderX on orderX._id = "order_id"
     left join reverb.user as userX on userX._id = "sharer_id"
   LEFT JOIN reverb.shared_url shared_url ON (orderX.meta ->> 'sharedUrlId'::text) = shared_url._id
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
  DROP VIEW reverb.agg_process_post_conversion_reward_user_email_js;
  `;
  return knex.schema.raw(query);
}