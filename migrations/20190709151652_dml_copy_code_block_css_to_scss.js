export function up(knex) {
  var query = `
    update reverb.code_block
    set scss = css;
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ``;
  return knex.schema.raw(query);
}