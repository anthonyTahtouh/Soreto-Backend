export function up(knex) {
  var query = `
  update reverb."reward" 
  set type = 'batch-discount' 
  where _id = '5b34bbf072abb013ded1fadc'
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ``;
  return knex.schema.raw(query);
}