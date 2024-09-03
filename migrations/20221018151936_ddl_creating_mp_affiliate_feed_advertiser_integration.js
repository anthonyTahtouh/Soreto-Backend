exports.up = function (knex) {
  let query = `

    CREATE TABLE reverb.mp_affiliate_feed_advertiser (
        _id TEXT NOT NULL
        ,created_at TIMESTAMP with time zone NOT NULL DEFAULT now()
        ,updated_at TIMESTAMP with time zone NOT NULL DEFAULT now()
        ,status TEXT NOT NULL    
        ,affiliate TEXT NOT null
        ,"name" text not null
        ,description text
        ,site_url text
        ,merchant_id text not null
        ,client_id text references reverb.client("_id")
        ,brand_id text references reverb.mp_brand("_id")
        ,affiliate_status text
        ,affiliate_update_date TIMESTAMP with time zone
        ,affiliate_update_meta JSONB DEFAULT '{}'::JSONB
        ,region_data json

        ,CONSTRAINT mp_affiliate_feed_advertiser_pkey PRIMARY KEY (_id)
    );
    
    select reverb.create_view_table_js('reverb.mp_affiliate_feed_advertiser');
 `;
  return knex.schema.raw(query);
};

exports.down = function (knex) {
  let query = `
      
    DROP VIEW IF EXISTS reverb.mp_affiliate_feed_advertiser_js;
    DROP TABLE IF EXISTS reverb.mp_affiliate_feed_advertiser;
           
          `;
  return knex.schema.raw(query);
};