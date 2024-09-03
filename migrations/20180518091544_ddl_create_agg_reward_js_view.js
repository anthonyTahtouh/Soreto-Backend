export function up(knex) {
  var query = `
  CREATE OR REPLACE VIEW reverb.agg_reward_js AS 
    select
        reward._id,
        reward.created_at as "createdAt",
        reward.updated_at as "updatedAt",            
        reward.name,
        reward.type,
        reward.client_id as "clientId",            
        client.name as "clientName"
    from
        reverb.reward reward            
        join reverb.client client
            on reward.client_id = client._id;
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
    DROP VIEW reverb.agg_reward_js;
  `;
  return knex.schema.raw(query);
}