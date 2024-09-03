exports.up = function(knex) {
  var query = `
  ALTER TABLE reverb.shared_url
  ADD COLUMN campaign_version_id text;


  ALTER TABLE reverb.shared_url
  ADD CONSTRAINT shared_url_campaign_version_id_fkey FOREIGN KEY (campaign_version_id)
      REFERENCES reverb."campaign_version" (_id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE NO ACTION;


  select reverb.create_view_table_js('reverb.shared_url');
  `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
  `;
  return knex.schema.raw(query);
};