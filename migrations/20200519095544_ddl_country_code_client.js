
exports.up = function(knex) {

  let query = `
    
        ALTER TABLE reverb.country_code add column client_id text REFERENCES reverb.client("_id");

        ALTER TABLE reverb.country_code DROP CONSTRAINT country_code_country_id_code_key;
        ALTER TABLE reverb.country_code ADD CONSTRAINT country_code_country_id_code_key UNIQUE (country_id, code, client_id);   
    `;


  return knex.schema.raw(query);
};

exports.down = function(knex) {

  let query = `

        DROP VIEW IF EXISTS reverb.agg_campaign_active_js;
        ALTER TABLE reverb.country_code drop column client_id;

        ALTER TABLE reverb.country_code DROP CONSTRAINT IF EXISTS country_code_country_id_code_key;
        ALTER TABLE reverb.country_code ADD CONSTRAINT country_code_country_id_code_key UNIQUE (country_id, code);
    `;

  return knex.schema.raw(query);

};
