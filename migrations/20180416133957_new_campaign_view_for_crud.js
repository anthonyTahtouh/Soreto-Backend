exports.up = function(knex) {
  var query = `
    CREATE OR REPLACE VIEW reverb.agg_campaign_js AS
        select
            campaign._id,
            campaign.created_at as "createdAt",
            campaign.updated_at as "updatedAt",
            campaign.client_id as "clientId",
            client.name as "clientName",
            campaign.type,
            campaign.sub_type as "subType",
            campaign.value_type as "valueType",
            campaign.value_amount as "valueAmount",
            campaign.expiry,
            campaign.description
        from
            reverb.campaign campaign
            join reverb.client client
                on campaign.client_id = client._id;
      `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
    DROP VIEW reverb.agg_campaign_js;

      `;
  return knex.schema.raw(query);
};
