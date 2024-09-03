
exports.up = function(knex) {
  var query = `
    
    CREATE TABLE reverb.mp_affiliate_feed_offer_history (
        _id text NOT NULL DEFAULT reverb.generate_object_id() PRIMARY KEY,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now(),
        status varchar(50) NOT NULL,
        user_id TEXT NULL references reverb.user("_id"),
        meta JSONB
    );

  SELECT reverb.create_view_table_js('reverb.mp_affiliate_feed_offer_history');
`;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = ` 
      
      DROP VIEW IF EXISTS reverb.mp_affiliate_feed_offer_history_js;

      DROP TABLE reverb.mp_affiliate_feed_offer_history;
    `;
  return knex.schema.raw(query);
};
