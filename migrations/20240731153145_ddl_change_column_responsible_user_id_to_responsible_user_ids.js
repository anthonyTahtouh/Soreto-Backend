
exports.up = function(knex) {
  var query = `   
      DROP VIEW IF EXISTS reverb.ab_test_js;
      DROP VIEW IF EXISTS reverb.agg_ab_test_js;
  
      ALTER TABLE reverb.ab_test ADD COLUMN responsible_user_ids text[] NOT NULL DEFAULT '{}';
  
      UPDATE reverb.ab_test SET responsible_user_ids = ARRAY[responsible_user_id::text];
  
      ALTER TABLE reverb.ab_test DROP COLUMN responsible_user_id;
  
      select reverb.create_view_table_js('reverb.ab_test');
    `;

  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `   
      DROP VIEW IF EXISTS reverb.ab_test_js;
      DROP VIEW IF EXISTS reverb.agg_ab_test_js;
  
      ALTER TABLE reverb.ab_test ADD COLUMN responsible_user_id text NULL;
  
      UPDATE reverb.ab_test SET responsible_user_id = (responsible_user_ids[1]::text);
  
      ALTER TABLE reverb.ab_test DROP COLUMN responsible_user_ids;
  
      select reverb.create_view_table_js('reverb.ab_test');
    `;
  return knex.raw(query);
};
