export function up(knex) {
  var query = `
            ALTER TABLE reverb.reward_pool
            ADD COLUMN post_reward_per_user INT;
            
            select reverb.create_view_table_js('reverb.reward_pool');
      
            `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
            DROP VIEW reverb.reward_pool;
      
            ALTER TABLE reverb.reward_pool
            DROP COLUMN IF EXISTS post_reward_per_user;
      
            select reverb.create_view_table_js('reverb.reward_pool');
          `;
  return knex.schema.raw(query);
}