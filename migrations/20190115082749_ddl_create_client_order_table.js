export function up(knex) {
  var query = `
    CREATE TABLE reverb.client_order
    (
        client_order_id text NOT NULL,
        client_id text NOT NULL,
        order_total numeric(15,6),
        buyer_email text,
        currency text,
        ip text,
        test_mode boolean,
        shared_url_id text,
        meta jsonb,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        PRIMARY KEY (client_order_id, client_id),
        FOREIGN KEY (client_id) REFERENCES reverb.client (_id),
        FOREIGN KEY (shared_url_id) REFERENCES reverb.shared_url (_id)
    );
        
    SELECT reverb.create_view_table_js('reverb.client_order');
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
    DROP VIEW reverb.client_order_js;
    DROP TABLE reverb.client_order;  
  `;
  return knex.schema.raw(query);
}