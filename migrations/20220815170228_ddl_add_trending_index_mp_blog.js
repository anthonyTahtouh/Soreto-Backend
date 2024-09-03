export function up(knex) {
  var query = `
  DROP VIEW IF EXISTS reverb.agg_mp_blog_js;
  DROP VIEW IF EXISTS reverb.mp_blog_js;
 
    ALTER TABLE reverb.mp_blog
      ADD COLUMN trending_index INTEGER;

    SELECT reverb.create_view_table_js('reverb.mp_blog');
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
    DROP VIEW IF EXISTS reverb.agg_mp_blog_js;
    DROP VIEW IF EXISTS reverb.mp_blog_js;
  
      ALTER TABLE reverb.mp_blog
        DROP COLUMN trending_index;
    
    SELECT reverb.create_view_table_js('reverb.mp_blog');
  `;
  return knex.schema.raw(query);
}