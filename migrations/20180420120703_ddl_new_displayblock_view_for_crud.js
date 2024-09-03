
exports.up = function(knex) {
  var query = `
    CREATE OR REPLACE VIEW reverb.agg_displayblock_js AS
        select
            displayBlock._id,
            displayBlock.created_at as "createdAt",
            displayBlock.updated_at as "updatedAt",
            displayBlock.active,
            displayBlock.name,
            displayBlock.type,
            campaign.description as "campaignName",
            client.name as "clientName"
        from
            reverb.display_block displayBlock
            join reverb.campaign campaign
                on displayBlock.campaign_id = campaign._id
            join reverb.client client
                on campaign.client_id = client._id;
        `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
      DROP VIEW reverb.agg_displayblock_js;
        `;
  return knex.schema.raw(query);
};
