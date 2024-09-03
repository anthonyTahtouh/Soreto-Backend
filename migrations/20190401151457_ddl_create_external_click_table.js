
exports.up = function(knex) {

  let script = `

    CREATE TABLE reverb.external_click
    (
        _id text NOT NULL DEFAULT reverb.generate_object_id(),
        date date NOT NULL,
        client_id text NOT NULL, 
        holder_id text NOT NULL,
        clicks bigint NOT NULL,
        shared_url_access_id text NULL DEFAULT NULL,
            CONSTRAINT external_click_pkey PRIMARY KEY (_id),
        CONSTRAINT external_click_unique UNIQUE (date, client_id, holder_id, shared_url_access_id),
            CONSTRAINT external_click_client_id_fkey FOREIGN KEY (client_id)
                REFERENCES reverb.client (_id) MATCH SIMPLE
                ON UPDATE NO ACTION
                ON DELETE NO ACTION
    );
    
    SELECT reverb.create_view_table_js('reverb.external_click');
  `;

  return knex.schema.raw(script);
};

exports.down = function(knex) {

  let script = `
  
    DROP VIEW reverb.external_click_js;
    DROP TABLE reverb.external_click;
  `;
  return knex.schema.raw(script);
};
