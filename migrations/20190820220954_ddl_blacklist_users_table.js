export function up(knex) {
  var query = `
        CREATE TABLE reverb."user_blacklist"
        (	
            _id text NOT NULL DEFAULT reverb.generate_object_id(),
            created_at timestamp with time zone NOT NULL DEFAULT now(),
            updated_at timestamp with time zone NOT NULL DEFAULT now(),
            email text NOT NULL UNIQUE,
            reason text NOT NULL,
            expiry_at timestamp with time zone 
        );

        SELECT reverb.create_view_table_js('reverb.user_blacklist');
      `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
        DROP VIEW reverb.user_blacklist_js;
        DROP TABLE reverb.user_blacklist;  
      `;
  return knex.schema.raw(query);
}