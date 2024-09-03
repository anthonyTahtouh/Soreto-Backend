export function up(knex) {
  var query = `
        ALTER TABLE reverb.email_template_type
        ADD CONSTRAINT value_unique UNIQUE (value);`;

  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
        ALTER TABLE reverb.email_template_type
        DROP CONSTRAINT value_unique;`;

  return knex.schema.raw(query);
}