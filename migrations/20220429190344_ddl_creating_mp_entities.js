
exports.up = function (knex) {
  let query = `
      CREATE TABLE reverb.mp_category(
          _id TEXT NOT NULL DEFAULT reverb.generate_object_id() UNIQUE PRIMARY KEY
          ,name TEXT NOT NULL UNIQUE
          ,static_id TEXT NOT NULL UNIQUE
          ,url_id TEXT NOT NULL UNIQUE
          ,active BOOLEAN NOT NULL
          ,show_header_menu_index INTEGER NOT NULL
          ,show_on_header_menu BOOLEAN NOT NULL
          ,show_tab_panel_menu_index INTEGER NOT NULL
          ,show_on_tab_panel_menu BOOLEAN NOT NULL
          ,show_category_menu_index INTEGER NOT NULL -- show_category_page_menu_index
          ,show_on_category_menu BOOLEAN NOT NULL --show_on_category_page_menu
          ,show_footer_menu_index INTEGER NOT NULL
          ,show_on_footer_menu BOOLEAN NOT NULL
          ,created_at DATE NOT NULL
          ,updated_at DATE NOT NULL
      );
  
      CREATE TABLE reverb.mp_brand(
          _id TEXT NOT NULL DEFAULT reverb.generate_object_id() UNIQUE PRIMARY KEY
          ,client_id TEXT NOT NULL UNIQUE REFERENCES reverb.client
          ,name TEXT NOT NULL UNIQUE
          ,short_name TEXT NOT NULL
          ,active BOOLEAN NOT NULL
          ,short_url TEXT NOT NULL
          ,brand_description TEXT NOT NULL
          ,card_image_url TEXT NOT NULL
          ,logo_image_url TEXT NOT NULL
          ,cover_image_url TEXT NOT NULL
          ,url_id TEXT NOT NULL UNIQUE
          ,trending_index INTEGER
          ,created_at DATE NOT NULL
          ,updated_at DATE NOT NULL
      );
    
      CREATE TABLE reverb.mp_offer (
          _id TEXT NOT NULL DEFAULT reverb.generate_object_id() UNIQUE PRIMARY KEY
          ,campaign_version_id TEXT NOT NULL REFERENCES reverb.campaign_version
          ,name TEXT NOT NULL
          ,active BOOLEAN
          ,start_date DATE 
          ,end_date DATE
          ,card_image_url TEXT
          ,share_hero_image_url TEXT
          ,type reverb.mp_offer_type
          ,card_description VARCHAR(500)
          ,offer_condition VARCHAR(500)
          ,url_id TEXT NOT NULL
          ,trending_index INTEGER
          ,tracking_link TEXT
          ,created_at DATE NOT NULL
          ,updated_at DATE NOT NULL
          ,UNIQUE(campaign_version_id, active)
          ,UNIQUE(url_id, active)
      );
  
      CREATE TABLE reverb.mp_brand_category(
          _id TEXT NOT NULL DEFAULT reverb.generate_object_id() UNIQUE PRIMARY KEY
          ,mp_brand_id TEXT NOT NULL REFERENCES reverb.mp_brand
          ,mp_category_id TEXT NOT NULL REFERENCES reverb.mp_category
          ,UNIQUE (mp_brand_id, mp_category_id)
      );
  
      CREATE TABLE reverb.mp_offer_category(
          _id TEXT NOT NULL DEFAULT reverb.generate_object_id() UNIQUE PRIMARY KEY
          ,mp_offer_id TEXT NOT NULL REFERENCES reverb.mp_offer
          ,mp_category_id TEXT NOT NULL REFERENCES reverb.mp_category
          ,UNIQUE (mp_offer_id, mp_category_id)
      );
  
      CREATE TABLE reverb.mp_banner (
          _id TEXT NOT NULL DEFAULT reverb.generate_object_id() UNIQUE PRIMARY KEY
          ,name TEXT
          ,start_date DATE 
          ,end_date DATE
          ,title VARCHAR(500)
          ,description VARCHAR(500)
          ,button_label VARCHAR(300)
          ,active BOOLEAN
          ,cover_image_url TEXT
          ,tag VARCHAR(100)
          ,target_mp_offer_id TEXT null REFERENCES reverb.mp_offer (_id)
          ,target_mp_brand_id TEXT null REFERENCES reverb.mp_brand (_id)
          ,target_mp_category_id TEXT null REFERENCES reverb.mp_category (_id)
          ,created_at DATE NOT NULL
          ,updated_at DATE NOT NULL
      --	,CHECK ( 
      --		NOT(target_mp_offer_id IS NULL AND target_mp_brand_id IS NULL AND target_mp_category_id IS NULL)
      --		AND (
      --			(target_mp_offer_id IS NULL AND target_mp_brand_id IS NULL) OR
      --			(target_mp_offer_id is NULL AND target_mp_category_id is NULL) OR 
      --			(target_mp_brand_id IS NULL AND target_mp_category_id is NULL)
      --		)
      --	)
      );
  
      CREATE TABLE reverb.mp_blog (
          _id TEXT NOT NULL DEFAULT reverb.generate_object_id() UNIQUE PRIMARY KEY
          ,name TEXT NOT NULL
          ,title TEXT NOT NULL
          ,description TEXT NOT NULL
          ,active BOOLEAN DEFAULT FALSE NOT NULL
          ,published_date DATE
          ,card_image_url TEXT NOT NULL
          ,url_id TEXT NOT NULL UNIQUE
          ,cover_title TEXT NOT NULL
          ,cover_description TEXT NOT NULL
          ,cover_image_url TEXT NOT NULL
          ,body_source_url TEXT NULL
          ,brand_id TEXT NULL REFERENCES reverb.mp_brand(_id)
          ,created_at DATE not null
          ,updated_at DATE not null
          ,body_content TEXT NULL
      );
  
      CREATE TABLE reverb.mp_notification(
          _id TEXT NOT NULL DEFAULT reverb.generate_object_id() UNIQUE PRIMARY KEY
          ,created_at TIMESTAMP NOT NULL DEFAULT now()
          ,updated_at TIMESTAMP NOT NULL DEFAULT now()
          ,published_at TIMESTAMP NULL
          ,message TEXT NOT NULL
          ,type TEXT NOT null
          ,redirect_url TEXT NULL
          ,target_mp_offer_id TEXT null REFERENCES reverb.mp_offer("_id")
          ,target_mp_brand_id TEXT null REFERENCES reverb.mp_brand ("_id")
          ,target_mp_category_id TEXT null REFERENCES reverb.mp_category("_id")   
      );
  
      select reverb.create_view_table_js('reverb.mp_notification');
      select reverb.create_view_table_js('reverb.mp_offer');
      select reverb.create_view_table_js('reverb.mp_category');
      select reverb.create_view_table_js('reverb.mp_brand');
      select reverb.create_view_table_js('reverb.mp_banner');
      select reverb.create_view_table_js('reverb.mp_blog');
      select reverb.create_view_table_js('reverb.mp_offer_category');
      select reverb.create_view_table_js('reverb.mp_brand_category');
               `;
  return knex.schema.raw(query);
};

exports.down = function (knex) {
  let query = `

      DROP VIEW IF EXISTS reverb.agg_mp_blog_js;
      DROP VIEW IF EXISTS reverb.agg_mp_banner_js;
      DROP VIEW IF EXISTS reverb.agg_mp_offer_js;

      DROP VIEW IF EXISTS reverb.mp_notification_js;
      DROP TABLE IF EXISTS reverb.mp_notification;
    
      DROP VIEW IF EXISTS reverb.mp_brand_category_js;
      DROP TABLE IF EXISTS reverb.mp_brand_category;

      DROP VIEW IF EXISTS reverb.mp_top_offer_js;
      DROP TABLE IF EXISTS reverb.mp_top_offer;
      
      DROP VIEW IF EXISTS reverb.mp_top_brand_js;
      DROP TABLE IF EXISTS mp_top_brand;
      
      DROP VIEW IF EXISTS reverb.mp_banner_js;
      DROP TABLE IF EXISTS reverb.mp_banner;
      
      DROP VIEW IF EXISTS reverb.mp_offer_category_js;
      DROP TABLE IF EXISTS reverb.mp_offer_category;

      DROP VIEW IF EXISTS reverb.mp_offer_js;
      DROP TABLE IF EXISTS reverb.mp_offer;
      
      DROP VIEW IF EXISTS reverb.mp_blog_js;
      DROP TABLE IF EXISTS reverb.mp_blog;
      
      DROP VIEW IF EXISTS reverb.mp_brand_js;
      DROP TABLE IF EXISTS reverb.mp_brand;
      
      DROP VIEW IF EXISTS reverb.mp_category_js;
      DROP TABLE IF EXISTS reverb.mp_category;
      
      DROP TYPE IF EXISTS reverb.mp_offer_type;
      
    `;
  return knex.schema.raw(query);
};
