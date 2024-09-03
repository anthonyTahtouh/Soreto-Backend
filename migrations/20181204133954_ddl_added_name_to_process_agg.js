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
    userx.email,
    shared_url.campaign_version_id AS "campaignVersionId",
    orderx.sharer_id AS "sharerId",
	userx.first_name AS "firstName"
   FROM reverb.process_post_conversion_reward
     LEFT JOIN reverb."order" orderx ON orderx._id = process_post_conversion_reward.order_id
     LEFT JOIN reverb."user" userx ON userx._id = orderx.sharer_id
     LEFT JOIN reverb.shared_url shared_url ON (orderx.meta ->> 'sharedUrlId'::text) = shared_url._id;
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
  CREATE OR REPLACE VIEW reverb.agg_process_post_conversion_reward_user_email_js AS
  SELECT process_post_conversion_reward._id,
    process_post_conversion_reward.process_id AS "processId",
    process_post_conversion_reward.created_at AS "createdAt",
    process_post_conversion_reward.reward_id AS "rewardId",
    process_post_conversion_reward.order_id AS "orderId",
    process_post_conversion_reward.process_status AS "processStatus",
    process_post_conversion_reward.meta,
    userx.email,
    shared_url.campaign_version_id AS "campaignVersionId",
    orderx.sharer_id AS "sharerId"
   FROM reverb.process_post_conversion_reward
     LEFT JOIN reverb."order" orderx ON orderx._id = process_post_conversion_reward.order_id
     LEFT JOIN reverb."user" userx ON userx._id = orderx.sharer_id
     LEFT JOIN reverb.shared_url shared_url ON (orderx.meta ->> 'sharedUrlId'::text) = shared_url._id;
  `;
  return knex.schema.raw(query);
}

