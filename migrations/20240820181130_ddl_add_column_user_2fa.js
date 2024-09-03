
exports.up = function (knex) {
  var query = `
        ALTER TABLE reverb.user
        ADD COLUMN two_factor_auth_enabled boolean NOT NULL DEFAULT FALSE;
      
        select reverb.create_view_table_js('reverb.user');`;
  return knex.schema.raw(query);
};

exports.down = function (knex) {
  var query = `
        DROP VIEW reverb.reverb.user_js;

        ALTER TABLE reverb.user
        DROP COLUMN IF EXISTS two_factor_auth_enabled;
        
        select reverb.create_view_table_js('reverb.user');
      `;
  return knex.schema.raw(query);
};