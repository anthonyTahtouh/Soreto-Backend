
exports.up = function(knex) {

  let sql = `

        create TABLE reverb.dynamic_menu (
            "_id" text NOT NULL DEFAULT reverb.generate_object_id(),
            "name" TEXT not null,
            "label" TEXT not null,
            "url_path" TEXT not null,
            "icon_class" TEXT,
            "enabled" BOOLEAN,
            "child_of_id" text REFERENCES reverb.dynamic_menu("_id"),
            CONSTRAINT dynamic_menu_pkey PRIMARY KEY (_id)
        );
        
        create TABLE reverb.dynamic_page (
            "_id" text NOT NULL DEFAULT reverb.generate_object_id(),
            "dynamic_menu_id" TEXT NOT NULL REFERENCES reverb.dynamic_menu("_id"),
            "name" TEXT not null,
            "description" TEXT not null,
            "external_source_url" TEXT,
            "content_width" TEXT,
            "content_height" TEXT,
            CONSTRAINT dynamic_page_pkey PRIMARY KEY (_id)
        );
        
        create TABLE reverb.dynamic_content_role_access (
            "role_id" text NOT NULL REFERENCES reverb."role"("_id"),
            "dynamic_menu_id" TEXT NOT NULL REFERENCES reverb.dynamic_menu("_id"),
            "access_allowed" BOOLEAN NOT NULL,
            CONSTRAINT dynamic_content_role_access_unique UNIQUE ("role_id", "dynamic_menu_id")
        );
        
        select reverb.create_view_table_js('reverb.dynamic_menu');
        select reverb.create_view_table_js('reverb.dynamic_page');
        select reverb.create_view_table_js('reverb.dynamic_content_role_access');`;

  return knex.schema.raw(sql);
};

exports.down = function(knex) {

  let sql = `
    drop view reverb.dynamic_content_role_access_js;
    drop view reverb.dynamic_page_js;
    drop view reverb.dynamic_menu_js;

    drop table reverb.dynamic_content_role_access;
    drop table reverb.dynamic_page;
    drop table reverb.dynamic_menu;`;

  return knex.schema.raw(sql);
};
