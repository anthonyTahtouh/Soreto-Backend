exports.up = function(knex) {
  var query = `
            CREATE TABLE
            reverb.ab_test_campaign_version
            (
                ab_test_id text NOT NULL,
                campaign_version_id text NOT NULL,
                CONSTRAINT ab_test_campaign_version_pkey PRIMARY KEY (ab_test_id, campaign_version_id),
                FOREIGN KEY (ab_test_id) REFERENCES reverb.ab_test(_id),
                FOREIGN KEY (campaign_version_id) REFERENCES reverb.campaign_version(_id)
            );
    
            select reverb.create_view_table_js('reverb.ab_test_campaign_version');
          `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
          drop view if exists reverb.ab_test_campaign_version_js;
          drop table reverb.ab_test_campaign_version;
          `;
  return knex.schema.raw(query);
};
