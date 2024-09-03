
export function up(knex) {
  var query = `
    CREATE OR REPLACE VIEW reverb.agg_reward_pool_js AS 
      select
          reward_pool._id,
          reward_pool.created_at as "createdAt",
          reward_pool.updated_at as "updatedAt",  
          reward_pool.advocate_pre_conversion_reward_id as "advocatePreConversionRewardId",
          reward_pool.advocate_post_conversion_reward_id as "advocatePostConversionRewardId", 
          reward_pool.referee_reward_id as "refereeRewardId",         
          reward_pool.client_id as "clientId",            
          client.name as "clientName"
      from
          reverb.reward_pool reward_pool            
          join reverb.client client
              on reward_pool.client_id = client._id;
    `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
      DROP VIEW reverb.agg_reward_pool_js;
    `;
  return knex.schema.raw(query);
}
