
exports.seed = function(knex) {
  return knex.raw(`
    
    DROP VIEW IF EXISTS reverb.agg_process_post_conversion_reward_user_email_js;
  
    CREATE OR REPLACE VIEW reverb.agg_process_post_conversion_reward_user_email_js AS

    SELECT process_post_conversion_reward.process_id AS "processId",
        process_post_conversion_reward.created_at AS "createdAt",
        process_post_conversion_reward.reward_id AS "rewardId",
        process_post_conversion_reward.order_id AS "orderId",
        process_post_conversion_reward.external_order_id AS "externalOrderId",
        process_post_conversion_reward.process_status AS "processStatus",
        process_post_conversion_reward.meta,
        process_post_conversion_reward.target_user_id AS "targetUserId",
        process_post_conversion_reward.target_email AS "targetEmail",
        process_post_conversion_reward.target_user_name AS "targetUserName",
        process_post_conversion_reward.type AS "type",
        userx.email,
        shared_url.campaign_version_id AS "campaignVersionId",
        userx._id AS "sharerId",
        userx.first_name AS "sharerFirstName",
        shared_url._id AS "sharedUrlId",
        shared_url.client_id AS "clientId"
    FROM reverb.process_post_conversion_reward
        LEFT JOIN reverb.shared_url shared_url ON shared_url._id = process_post_conversion_reward.shared_url_id
        LEFT JOIN reverb."user" userx ON userx._id = shared_url.user_id;
  
    `);
};
