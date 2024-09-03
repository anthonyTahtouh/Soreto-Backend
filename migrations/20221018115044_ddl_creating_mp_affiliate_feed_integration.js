exports.up = function (knex) {
  let query = `
          CREATE TABLE reverb.mp_affiliate_feed_offer (
              _id TEXT NOT NULL
              ,created_at TIMESTAMP with time zone NOT NULL DEFAULT now()
              ,updated_at TIMESTAMP with time zone NOT NULL DEFAULT now()
              ,status TEXT NOT NULL
              
              ,affiliate TEXT NOT NULL
              ,affiliate_brand_name TEXT NOT NULL
              ,affiliate_merchant_id TEXT NOT NULL            
              ,affiliate_promotion_id TEXT NOT NULL        
              ,promotion_type TEXT NOT NULL
              ,promotion_code TEXT
  
              ,promotion_title TEXT
              ,promotion_description TEXT
              ,promotion_terms TEXT
              ,promotion_categories JSONB NOT NULL DEFAULT '{}'::JSONB
              ,promotion_tracking_link TEXT NOT NULL
              
              ,start_date TIMESTAMP with time zone NOT NULL
              ,end_date TIMESTAMP with time zone NOT NULL
              ,published_date TIMESTAMP with time zone NOT NULL
              
              ,affiliate_update_date TIMESTAMP with time zone
              ,affiliate_update_meta JSONB DEFAULT '{}'::JSONB
  
              ,exclusive BOOLEAN
              ,meta JSONB
  
              ,CONSTRAINT mp_affiliate_feed_offer_pkey PRIMARY KEY (_id)
  
          );
    
          select reverb.create_view_table_js('reverb.mp_affiliate_feed_offer');
                   `;
  return knex.schema.raw(query);
};

exports.down = function (knex) {
  let query = `
    
          DROP VIEW IF EXISTS reverb.mp_affiliate_feed_offer_js;
          DROP TABLE IF EXISTS reverb.mp_affiliate_feed_offer;
         
        `;
  return knex.schema.raw(query);
};

