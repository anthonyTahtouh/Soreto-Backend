export function up(knex) {
  var query = `
        CREATE TABLE reverb.mp_flash_campaign
        (
            _id TEXT NOT NULL DEFAULT reverb.generate_object_id() UNIQUE PRIMARY KEY,
            active BOOLEAN NOT NULL,
            name TEXT NOT NULL,
            menu_label TEXT NOT NULL,
            url_id TEXT NOT NULL,
            start_date DATE,
            end_date DATE,
            logo_image_url TEXT NOT NULL,
            title TEXT NOT NULL,
            description_small TEXT NOT NULL,
            description_medium TEXT NOT NULL,
            description TEXT NOT NULL,
            cover_image_url TEXT NOT NULL,
            custom_settings JSONB,
            meta JSONB,
            created_at DATE NOT NULL,
            updated_at DATE NOT NULL
        );
            
        SELECT reverb.create_view_table_js('reverb.mp_flash_campaign');
      `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
        DROP VIEW reverb.mp_flash_campaign_js;
        DROP TABLE reverb.mp_flash_campaign;  
      `;
  return knex.schema.raw(query);
}