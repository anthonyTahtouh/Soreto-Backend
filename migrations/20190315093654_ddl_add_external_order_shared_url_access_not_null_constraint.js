
exports.up = function(knex) {
  let sqlScript = `
        ALTER TABLE reverb.external_order ALTER COLUMN shared_url_access_id SET NOT NULL
  `;

  return knex.schema.raw(sqlScript);
};

exports.down = function(knex) {
  return knex.schema.raw('');
};
