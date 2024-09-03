exports.up = function(knex) {

  let query = `

        DROP VIEW IF EXISTS reverb.client_js;
        
        DO $$ 
        DECLARE
            declare _gb_country_id varchar;
        BEGIN 
            
          SELECT _id FROM reverb.country WHERE name = 'Global' LIMIT 1 INTO _gb_country_id;

          ALTER TABLE 
            reverb.client
          ADD COLUMN 
            country_id TEXT
          REFERENCES 
            reverb.country("_id");

          UPDATE reverb.client SET country_id = _gb_country_id;
          ALTER TABLE reverb.client ALTER COLUMN country_id SET NOT NULL;
  
        END $$;

        select reverb.create_view_table_js('reverb.client');
      `;

  return knex.schema.raw(query);
};

exports.down = function(knex) {

  let query = `

        DROP VIEW IF EXISTS reverb.client_js;
        
        ALTER TABLE 
          reverb.client
        DROP COLUMN 
          country_id;

        select reverb.create_view_table_js('reverb.client');
      `;
  return knex.schema.raw(query);
};