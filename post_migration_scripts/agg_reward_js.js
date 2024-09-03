
exports.seed = function(knex) {

  return knex.raw(`
  
    DROP VIEW IF EXISTS reverb.agg_reward_js;

    CREATE VIEW reverb.agg_reward_js AS
    select
        reward._id,
        reward.created_at as "createdAt",
        reward.updated_at as "updatedAt",
        reward.name,
        reward.type,
        reward.client_id as "clientId",
        client.name as "clientName",
        reward.meta
    from
        reverb.reward reward
        join reverb.client client on reward.client_id = client._id;
    `);
};
