export function up(knex) {
  var query = `
      ALTER TABLE reverb.reward_pool
      ADD COLUMN client_id text;
    
      select reverb.create_view_table_js('reverb.reward_pool');`;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
      DROP VIEW reverb.reverb.reward_pool_js;

      ALTER TABLE reverb.reward_pool
      DROP COLUMN IF EXISTS client_id;
      
      select reverb.create_view_table_js('reverb.reward_pool');
    `;
  return knex.schema.raw(query);
}