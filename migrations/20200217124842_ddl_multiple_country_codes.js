export function up(knex) {
  var query = `
      
        CREATE TABLE reverb.country_code (
            "_id" text NOT NULL DEFAULT reverb.generate_object_id(),
            country_id text references reverb.country(_id),
            code text not null,
            CONSTRAINT country_code_type_pkey PRIMARY KEY (_id),
            unique(country_id, code)
        );

        -- insert all the code values from country to country codes
        INSERT INTO reverb.country_code (country_id, code) (SELECT c._id, c.code from reverb.country c);

        -- create js view
        select reverb.create_view_table_js('reverb.country_code');

        -- drop dependency views
        DROP VIEW IF EXISTS reverb.country_js;
        DROP VIEW IF EXISTS reverb.agg_campaign_active_js;

        -- drop code column from country
        ALTER TABLE reverb.country 
            DROP COLUMN code;

        -- update js view with no column
        select reverb.create_view_table_js('reverb.country');
    `;

  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `  
        -- add code column back
        ALTER TABLE reverb.country
            ADD COLUMN code text;

        -- update js view with the column back
        select reverb.create_view_table_js('reverb.country');

        -- ad the country codes back to the original table
        UPDATE reverb.country c set code = (select code from reverb.country_code where country_id = c."_id" order by created_at asc limit 1);

        -- drop dependency views
        DROP VIEW IF EXISTS reverb.country_code_js;
        DROP VIEW IF EXISTS reverb.agg_country_js;
        DROP VIEW IF EXISTS reverb.agg_campaign_active_js;

        -- drop country code table
        DROP TABLE reverb.country_code;    
    `;

  return knex.schema.raw(query);
}