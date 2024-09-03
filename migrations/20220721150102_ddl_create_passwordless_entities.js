export function up(knex) {
  var query = `
    
        CREATE TABLE reverb.passwordless_token(
            _id text NOT NULL DEFAULT reverb.generate_object_id() PRIMARY KEY,
            created_at timestamp with time zone NOT NULL DEFAULT now(),
            expires_at timestamp with time zone NOT NULL,
            type varchar(50) NOT NULL,
            user_id TEXT NOT NULL references reverb.user("_id"),
            token TEXT NOT NULL
        );

      SELECT reverb.create_view_table_js('reverb.passwordless_token');
    `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ` 
      
      DROP VIEW IF EXISTS reverb.passwordless_token_js;

      DROP TABLE reverb.passwordless_token;
    `;
  return knex.schema.raw(query);
}