export function up(knex) {
  var query = `
          CREATE TABLE reverb.external_order_untracked
          (
              _id text NOT NULL DEFAULT reverb.generate_object_id(),
              created_at timestamp with time zone NOT NULL DEFAULT now(),
              updated_at timestamp with time zone NOT NULL DEFAULT now(),
              fallback_type text,
              fallback_reason text,
              publisher_url text,

              holder_id text NOT NULL,
              holder_type text NOT NULL,
              holder_transaction_id text,
              origin_status text,
              meta jsonb DEFAULT '{}'::jsonb,	

              advertiser_id text, 
              client_id text, 
              shared_url_access_id text,
              CONSTRAINT external_order_untracked_pkey PRIMARY KEY (_id)
          );
          
          SELECT reverb.create_view_table_js('reverb.external_order_untracked');
        `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
          DROP VIEW reverb.external_order_untracked_js;
          DROP TABLE reverb.external_order_untracked;  
        `;
  return knex.schema.raw(query);
}