
exports.up = function(knex) {
  var query = `
  DROP VIEW IF EXISTS reverb.agg_mp_blog_js;
  DROP VIEW IF EXISTS reverb.mp_blog_js;

  UPDATE reverb.mp_blog SET trending_index = 0 WHERE trending_index is null;
  ALTER TABLE reverb.mp_blog ALTER COLUMN trending_index SET NOT NULL;

    SELECT reverb.create_view_table_js('reverb.mp_blog');
  `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
    DROP VIEW IF EXISTS reverb.agg_mp_blog_js;
    DROP VIEW IF EXISTS reverb.mp_blog_js;
  
    ALTER TABLE reverb.mp_blog ALTER COLUMN trending_index DROP NOT NULL;
    
    SELECT reverb.create_view_table_js('reverb.mp_blog');
  `;
  return knex.schema.raw(query);
};
