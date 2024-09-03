
exports.up = function(knex) {
  var query = `
    DROP VIEW IF EXISTS reverb.mp_affiliate_feed_advertiser_js;

    ALTER TABLE reverb.mp_affiliate_feed_advertiser
    ADD COLUMN automatic boolean DEFAULT true;
  
    select reverb.create_view_table_js('reverb.mp_affiliate_feed_advertiser');
    `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
    DROP VIEW IF EXISTS reverb.mp_affiliate_feed_advertiser_js;
   
    ALTER TABLE reverb.mp_affiliate_feed_advertiser
    DROP COLUMN automatic;
    
    select reverb.create_view_table_js('reverb.mp_affiliate_feed_advertiser');
    `;
  return knex.schema.raw(query);
};
