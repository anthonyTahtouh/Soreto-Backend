export function up(knex) {
  var query = `
  CREATE TABLE reverb.shared_url_access_user_info
  (
    _id text COLLATE pg_catalog."default" NOT NULL DEFAULT reverb.generate_object_id(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    email text COLLATE pg_catalog."default" NOT NULL,
    shared_url_id text COLLATE pg_catalog."default",
    CONSTRAINT shared_url_access_user_info_pkey PRIMARY KEY (_id),
    CONSTRAINT shared_url_access_user_info_shared_url_id_fkey FOREIGN KEY (shared_url_id)
        REFERENCES reverb.shared_url (_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
  );

  select reverb.create_view_table_js('reverb.shared_url_access_user_info');
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
  
  `;
  return knex.schema.raw(query);
}