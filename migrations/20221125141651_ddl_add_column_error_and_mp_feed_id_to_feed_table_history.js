export function up(knex) {
  var query = `
    -- Add column mp_affiliate_feed_0ffer_id

    ALTER TABLE reverb.mp_affiliate_feed_offer_history
    ADD COLUMN error TEXT;
    
    ALTER TABLE reverb.mp_affiliate_feed_offer_history
      ADD COLUMN mp_affiliate_feed_offer_id TEXT;
    
    UPDATE reverb.mp_affiliate_feed_offer_history set mp_affiliate_feed_offer_id = ("meta"->>'feedId'); 

    ALTER TABLE reverb.mp_affiliate_feed_offer_history
      ADD CONSTRAINT mp_affiliate_feed_offer_id_fkey FOREIGN KEY (mp_affiliate_feed_offer_id)
      REFERENCES reverb.mp_affiliate_feed_offer (_id); 
    
    select reverb.create_view_table_js('reverb.mp_affiliate_feed_offer_history');

    -- Add column mp_affiliate_feed_Brand_id

    ALTER TABLE reverb.mp_affiliate_feed_brand_history
      ADD COLUMN error TEXT;
    
    ALTER TABLE reverb.mp_affiliate_feed_brand_history
      ADD COLUMN mp_affiliate_feed_brand_id TEXT;

    UPDATE reverb.mp_affiliate_feed_brand_history set mp_affiliate_feed_brand_id = ("meta"->>'feedId'); 
    
    ALTER TABLE reverb.mp_affiliate_feed_brand_history
      ADD CONSTRAINT mp_affiliate_feed_brand_id_fkey FOREIGN KEY (mp_affiliate_feed_brand_id)
      REFERENCES reverb.mp_affiliate_feed_advertiser (_id); 
      
    select reverb.create_view_table_js('reverb.mp_affiliate_feed_brand_history');
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
    -- Drop column mp_affiliate_feed_0ffer_id

    DROP VIEW reverb.mp_affiliate_feed_offer_history_js;

    ALTER TABLE reverb.mp_affiliate_feed_offer_history
      DROP CONSTRAINT mp_affiliate_feed_offer_id_fkey;
    
    ALTER TABLE reverb.mp_affiliate_feed_offer_history
      DROP COLUMN error;
      
    ALTER TABLE reverb.mp_affiliate_feed_offer_history
      DROP COLUMN mp_affiliate_feed_offer_id ;
      
    select reverb.create_view_table_js('reverb.mp_affiliate_feed_offer_history');

    -- Drop column mp_affiliate_feed_Brand_id

    DROP VIEW reverb.mp_affiliate_feed_brand_history_js;

    ALTER TABLE reverb.mp_affiliate_feed_brand_history
      DROP CONSTRAINT mp_affiliate_feed_brand_id_fkey;
      
    ALTER TABLE reverb.mp_affiliate_feed_brand_history
      DROP COLUMN error;
        
    ALTER TABLE reverb.mp_affiliate_feed_brand_history
      DROP COLUMN mp_affiliate_feed_brand_id ;
        
    select reverb.create_view_table_js('reverb.mp_affiliate_feed_brand_history');
  `;
  return knex.schema.raw(query);
}