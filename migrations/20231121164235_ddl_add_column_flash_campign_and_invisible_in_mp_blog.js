
export function up(knex) {
  var query = `   
          DROP VIEW IF EXISTS reverb.agg_mp_blog_js;
          DROP VIEW IF EXISTS reverb.mp_blog_js; 
      
          ALTER TABLE reverb.mp_blog ADD COLUMN flash_campaign_ids JSONB;
          ALTER TABLE reverb.mp_blog ADD COLUMN invisible boolean;
      
          SELECT reverb.create_view_table_js('reverb.mp_blog');
          `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `    
        DROP view if exists reverb.agg_mp_blog_js;
        DROP view if exists reverb.mp_blog_js;
      
        ALTER TABLE reverb.mp_blog DROP COLUMN flash_campaign_ids;
        ALTER TABLE reverb.mp_blog DROP COLUMN invisible;
            
        SELECT reverb.create_view_table_js('reverb.mp_blog');
        `;
  return knex.schema.raw(query);
}