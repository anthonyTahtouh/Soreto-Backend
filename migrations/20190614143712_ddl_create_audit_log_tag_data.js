export function up(knex) {
  var query = `
  CREATE TABLE reverb.audit_log_tag_data
    (
        _id text COLLATE pg_catalog."default" NOT NULL DEFAULT reverb.generate_object_id(),
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now(),
        meta jsonb NOT NULL DEFAULT '{}'::jsonb,
        CONSTRAINT audit_log_tag_data_pkey PRIMARY KEY (_id)
    );
    
    select reverb.create_view_table_js('reverb.audit_log_tag_data');
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ``;
  return knex.schema.raw(query);
}