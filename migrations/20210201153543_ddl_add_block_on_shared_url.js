exports.up = function (knex) {
  let query = `

    ALTER TABLE reverb.shared_url
    ADD COLUMN "blocked" BOOLEAN;
    
    ALTER TABLE reverb.shared_url
    ADD COLUMN "blocked_reason" TEXT;
    
    SELECT reverb.create_view_table_js('reverb.shared_url');
  `;
  return knex.schema.raw(query);
};

exports.down = function (knex) {

  let query = `

    DROP VIEW reverb.agg_client_traction_by_date_js;
    DROP VIEW reverb.agg_shared_url_post_js;

    DROP VIEW reverb.shared_url_js;
    
    ALTER TABLE reverb.shared_url DROP COLUMN "blocked";
    ALTER TABLE reverb.shared_url DROP COLUMN "blocked_reason";
    
    SELECT reverb.create_view_table_js('reverb.shared_url');
    `;

  return knex.schema.raw(query);
};