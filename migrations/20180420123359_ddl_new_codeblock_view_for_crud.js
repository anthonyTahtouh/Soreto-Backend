
exports.up = function(knex) {
  var query = `
      CREATE OR REPLACE VIEW reverb.agg_codeblock_js AS
        select
            codeBlock._id,
            codeBlock.created_at as "createdAt",
            codeBlock.updated_at as "updatedAt",
            codeBlock.active,
            codeBlock.name,
            displayBlock.name as "displayBlockName",
            campaign.description as "campaignName",
            client.name as "clientName"
        from
            reverb.code_block codeBlock
            join reverb.display_block displayBlock
                on codeBlock.display_block_id = displayBlock._id
            join reverb.campaign campaign
                on displayBlock.campaign_id = campaign._id
            join reverb.client client
                on campaign.client_id = client._id;
          `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
        DROP VIEW reverb.agg_codeblock_js;
          `;
  return knex.schema.raw(query);
};
