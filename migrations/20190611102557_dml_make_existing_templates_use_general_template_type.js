export function up(knex) {
  var query = `
  UPDATE reverb.email_template
  SET email_template_type_id = '5caebad5f19d3a010266626f'
  WHERE email_template_type_id is null;
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ``;
  return knex.schema.raw(query);
}