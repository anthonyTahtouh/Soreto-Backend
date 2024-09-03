export function up(knex) {
  var query = `
  UPDATE reverb.campaign_version SET reward_pool_id = null WHERE reward_pool_id = '';
  UPDATE reverb.campaign_version SET reward_pool_id = null WHERE reward_pool_id = ' ';

  ALTER TABLE reverb.campaign_version
  ADD CONSTRAINT rewards_pool_id_fkey FOREIGN KEY (reward_pool_id)
  REFERENCES reverb.reward_pool (_id) MATCH SIMPLE
  ON UPDATE NO ACTION
  ON DELETE NO ACTION;
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ``;
  return knex.schema.raw(query);
}