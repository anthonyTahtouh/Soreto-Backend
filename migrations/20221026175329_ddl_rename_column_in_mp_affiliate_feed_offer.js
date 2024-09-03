
exports.up = function(knex) {
  var query = ` 
    DROP VIEW IF EXISTS reverb.mp_affiliate_feed_offer_js;

    ALTER TABLE reverb.mp_affiliate_feed_offer RENAME COLUMN meta to revision_form;

    select reverb.create_view_table_js('reverb.mp_affiliate_feed_offer');
    `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = ` 
    DROP VIEW IF EXISTS reverb.mp_affiliate_feed_offer_js;

    ALTER TABLE reverb.mp_affiliate_feed_offer RENAME COLUMN revision_form to meta;

    select reverb.create_view_table_js('reverb.mp_affiliate_feed_offer');
    `;
  return knex.schema.raw(query);
};
