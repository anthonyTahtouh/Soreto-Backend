export function up(knex) {
  var query = `
  ALTER TABLE reverb.email_template
  ADD COLUMN email_template_type_id text;

  ALTER TABLE reverb.email_template
  ADD CONSTRAINT email_template_type_id_fk FOREIGN KEY (email_template_type_id) REFERENCES reverb.email_template_type (_id);

  DROP VIEW reverb.email_template_js;
  SELECT reverb.create_view_table_js('reverb.email_template');

ALTER TABLE reverb.email_template_type ADD name text;

drop view reverb.email_template_type_js;

SELECT reverb.create_view_table_js('reverb.email_template_type');
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ``;
  return knex.schema.raw(query);
}