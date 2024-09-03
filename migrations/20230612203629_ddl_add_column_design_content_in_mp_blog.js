
exports.up = function(knex) {
  var query = `    
        DROP VIEW IF EXISTS reverb.agg_mp_blog_js;
        DROP VIEW reverb.mp_blog_js;
        ALTER TABLE reverb.mp_blog
            ADD COLUMN design_content TEXT;
                
        SELECT reverb.create_view_table_js('reverb.mp_blog');
        `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `    
        DROP VIEW IF EXISTS reverb.agg_mp_blog_js;
        DROP VIEW reverb.mp_blog_js;
        ALTER TABLE reverb.mp_blog
            DROP COLUMN design_content;
                
        SELECT reverb.create_view_table_js('reverb.mp_blog');
        `;
  return knex.schema.raw(query);
};
