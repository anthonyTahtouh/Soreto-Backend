export function up(knex) {
  var query = `
        CREATE TABLE reverb."order_history"
        (	
            object_id text NOT NULL, 
            effectivated_at timestamp with time zone NOT NULL DEFAULT now(),
            user_id text,
            origin_type text NOT NULL,
            object_snapshot jsonb NOT NULL,
            
            CONSTRAINT order_history_pkey PRIMARY KEY (object_id, effectivated_at),	
            CONSTRAINT order_history_unique UNIQUE (object_id, effectivated_at),
            CONSTRAINT order_history_order_id_fkey FOREIGN KEY (object_id)
            REFERENCES reverb."order" (_id) MATCH SIMPLE
                ON UPDATE NO ACTION
                ON DELETE CASCADE,
            CONSTRAINT user_id_fkey FOREIGN KEY (user_id)
            REFERENCES reverb."user" (_id) MATCH SIMPLE
                ON UPDATE NO ACTION
                ON DELETE NO ACTION
        );
          
      DO $$ 
      DECLARE
          adminUser TEXT := (select distinct(_id) from reverb.user where first_name = 'Admin' and last_name = 'User' limit 1);
      BEGIN 
          insert into reverb.order_history(object_id, effectivated_at, user_id, origin_type, object_snapshot)
        select tmp._id, 
          tmp.updated_at, 
          adminUser, 
          'Migration', 
          (select row_to_json("order") from reverb.order where _id = tmp._id ) 
        from reverb.order tmp;
      END $$;
      
      SELECT reverb.create_view_table_js('reverb.order_history');
    `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
      DROP VIEW reverb.order_history_js;
      DROP TABLE reverb.order_history;  
    `;
  return knex.schema.raw(query);
}