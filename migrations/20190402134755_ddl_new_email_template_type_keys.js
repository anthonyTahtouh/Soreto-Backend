export function up(knex) {
  var query = `
  CREATE TABLE reverb.key_email_template_type(
  _id text NOT NULL DEFAULT reverb.generate_object_id(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  email_template_type_id text,
  input_type text,
  label text,
  default_value text,
  required boolean,
  template_key text,
  name text,

  CONSTRAINT key_email_template_type_pkey PRIMARY KEY (_id),
  CONSTRAINT email_template_type_fk FOREIGN KEY (email_template_type_id) REFERENCES reverb.email_template_type (_id)
  );


  SELECT reverb.create_view_table_js('reverb.key_email_template_type');
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ``;
  return knex.schema.raw(query);
}
