export function up(knex) {
  var query = `
    ALTER TABLE REVERB.REWARD_POOL
    ADD COLUMN "name" TEXT NOT NULL DEFAULT 'Default Reward Pool'
    `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
    ALTER TABLE REVERB.REWARD_POOL
    DROP COLUMN "name"
    `;
  return knex.schema.raw(query);
}