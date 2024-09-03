exports.up = function up(knex) {
  return knex.schema.raw(`
     alter table reverb.mp_affiliate_feed_offer add column mp_offer_id text references reverb.mp_offer("_id");
     select reverb.create_view_table_js('reverb.mp_affiliate_feed_offer');
  `);
};

exports.down = function (knex) {
  return knex.schema.raw(`
    drop view if exists reverb.mp_affiliate_feed_offer_js;
    alter table reverb.mp_affiliate_feed_offer drop column mp_offer_id;
    select reverb.create_view_table_js('reverb.mp_affiliate_feed_offer');
  `);
};
