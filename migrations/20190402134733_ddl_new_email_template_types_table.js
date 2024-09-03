export function up(knex) {
  var query = `
  CREATE TABLE reverb.email_template_type(
    _id text NOT NULL DEFAULT reverb.generate_object_id(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    value text NOT NULL,
    CONSTRAINT email_template_type_pkey PRIMARY KEY (_id)
    );
  
    SELECT reverb.create_view_table_js('reverb.email_template_type');
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ``;
  return knex.schema.raw(query);
}


