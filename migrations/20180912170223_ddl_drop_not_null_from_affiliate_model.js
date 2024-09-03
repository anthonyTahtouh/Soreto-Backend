export function up(knex) {
  var query = `
  ALTER TABLE reverb.affiliate
  alter column "module"
  drop not null;

  ALTER TABLE reverb.affiliate DROP CONSTRAINT affiliate_module_unique;
  ALTER TABLE reverb.affiliate ADD CONSTRAINT affiliate_module_unique UNIQUE (module,Name)
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
  `;
  return knex.schema.raw(query);
}