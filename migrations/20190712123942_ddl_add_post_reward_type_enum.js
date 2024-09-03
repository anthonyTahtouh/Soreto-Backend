export function up(knex) {
  var query = `CREATE TYPE reverb.POST_REWARD_TYPE AS ENUM ('SHARER', 'FRIEND');`;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `DROP TYPE reverb.POST_REWARD_TYPE;`;
  return knex.schema.raw(query);
}