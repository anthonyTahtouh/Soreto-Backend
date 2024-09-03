
exports.up = function(knex) {
  var query = `
    DROP VIEW IF EXISTS reverb.mp_affiliate_feed_advertiser_js;

    ALTER TABLE reverb.mp_affiliate_feed_advertiser
    ADD COLUMN revision_form JSONB;
  
    select reverb.create_view_table_js('reverb.mp_affiliate_feed_advertiser');
    `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
    DROP VIEW IF EXISTS reverb.mp_affiliate_feed_advertiser_js;
   
    ALTER TABLE reverb.mp_affiliate_feed_advertiser
    DROP COLUMN revision_form;
  
    select reverb.create_view_table_js('reverb.mp_affiliate_feed_advertiser');
    `;
  return knex.schema.raw(query);
};
