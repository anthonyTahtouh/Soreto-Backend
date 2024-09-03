exports.up = function(knex) {
  var query = `
    -- create campaign version
  CREATE TABLE reverb.campaign_version
  (
    _id text NOT NULL DEFAULT reverb.generate_object_id(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    campaign_id text,
    name text,
    type text,
    reward_pool_id text,
    exposure smallint,
    active boolean,
    CONSTRAINT campaign_version_pkey PRIMARY KEY (_id),
    CONSTRAINT campaign_id_fkey FOREIGN KEY (campaign_id)
        REFERENCES reverb.campaign (_id) MATCH SIMPLE
        ON UPDATE NO ACTION ON DELETE NO ACTION
  );


  --put existing campaign in campaign version
  insert INTO reverb.campaign_version (campaign_id, name, type, exposure, active)
  select _id, 'Default', 'ORIGINAL', 100, true
  from reverb.campaign;

  -- drop display block
  DROP VIEW reverb.display_block_js;

  -- add campaign version_id to display Block
  ALTER TABLE reverb.display_block
    ADD COLUMN campaign_version_id text;

  -- add fkey constraint
  ALTER TABLE reverb.display_block
    ADD CONSTRAINT campaign_version_id_fkey FOREIGN KEY (campaign_version_id)
    REFERENCES reverb.campaign_version (_id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE NO ACTION;



  -- updates the campaign ids to campaign version Ids
  update reverb.display_block d
  set campaign_version_id = cv._id
  from reverb.campaign_version cv
  where cv.campaign_id = d.campaign_id;




  DROP VIEW reverb.agg_displayblock_js;

  DROP VIEW reverb.agg_codeblock_js;



  ALTER TABLE reverb.display_block
    DROP CONSTRAINT campaign_id_fkey;


  ALTER TABLE reverb.display_block
    DROP COLUMN campaign_id;


  select reverb.create_view_table_js('reverb.display_block');


  CREATE OR REPLACE VIEW reverb.agg_displayblock_js AS
      select
          displayBlock._id,
          displayBlock.created_at as "createdAt",
          displayBlock.updated_at as "updatedAt",
          displayBlock.active,
          displayBlock.name,
          displayBlock.type,
          campaignVersion.name as "campaignVersionName",
          campaign.description as "campaignName",
          client.name as "clientName"
      from
          reverb.display_block displayBlock
          join reverb.campaign_version campaignVersion
              on displayBlock.campaign_version_id = campaignVersion._id
          join reverb.campaign campaign
              on campaignVersion.campaign_id = campaign._id
          join reverb.client client
              on campaign.client_id = client._id;


  CREATE OR REPLACE VIEW reverb.agg_codeblock_js AS
  SELECT codeblock._id,
      codeblock.created_at AS "createdAt",
      codeblock.updated_at AS "updatedAt",
      codeblock.active,
      codeblock.name,
      campaignVersion.name as "campaignVersionName",
      displayblock.name AS "displayBlockName",
      campaign.description AS "campaignName",
      client.name AS "clientName"
    FROM reverb.code_block codeblock
      JOIN reverb.display_block displayblock ON codeblock.display_block_id = displayblock._id
      join reverb.campaign_version campaignVersion on displayBlock.campaign_version_id = campaignVersion._id
      join reverb.campaign campaign on campaignVersion.campaign_id = campaign._id
      JOIN reverb.client client ON campaign.client_id = client._id;
  `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
  `;
  return knex.schema.raw(query);
};