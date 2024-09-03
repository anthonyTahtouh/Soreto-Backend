
exports.up = function(knex) {
  var query = `
        CREATE TYPE reverb.flow_type AS ENUM ('sharer_triggered_reward', 'friend_triggered_reward', 'both_triggered_reward', 'advertisement');
        ALTER TABLE reverb.campaign_version ADD COLUMN flow_type reverb.flow_type;
        select reverb.create_view_table_js('reverb.campaign_version');`;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
        DROP VIEW reverb.campaign_version_js;
        ALTER TABLE reverb.campaign_version DROP COLUMN flow_type;
        DROP TYPE reverb.flow_type;
        select reverb.create_view_table_js('reverb.campaign_version');`;
  return knex.schema.raw(query);
};