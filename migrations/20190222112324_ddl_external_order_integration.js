export function up(knex) {
  var query = `
        CREATE TABLE reverb.external_order
        (
            _id text NOT NULL DEFAULT reverb.generate_object_id(),
            created_at timestamp with time zone NOT NULL DEFAULT now(),
            updated_at timestamp with time zone NOT NULL DEFAULT now(),
            publisher_url text,
            paid_to_publisher boolean,
            holder_id text NOT NULL,
            holder_type text NOT NULL,
            holder_transaction_id text,
            total numeric(15,6),
            currency text,
            commission numeric(15,6) DEFAULT 0.000000,
            status text NOT NULL,
            clicked_at timestamp with time zone,
            transacted_at timestamp with time zone,
            meta jsonb DEFAULT '{}'::jsonb,	
            advertiser_id text,
            client_id text NOT NULL, 
            client_country text, 
            customer_country text,
            shared_url_access_id text,
            CONSTRAINT external_order_pkey PRIMARY KEY (_id),
            CONSTRAINT external_order_client_id_fkey FOREIGN KEY (client_id)
              REFERENCES reverb.client (_id) MATCH SIMPLE
              ON UPDATE NO ACTION
              ON DELETE NO ACTION,
            CONSTRAINT external_order_shared_url_access_id_fkey FOREIGN KEY (shared_url_access_id)
              REFERENCES reverb.shared_url_access (_id) MATCH SIMPLE
              ON UPDATE NO ACTION
              ON DELETE NO ACTION
        );
        
        SELECT reverb.create_view_table_js('reverb.external_order');
      `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
        DROP VIEW reverb.external_order_js;
        DROP TABLE reverb.external_order;  
      `;
  return knex.schema.raw(query);
}