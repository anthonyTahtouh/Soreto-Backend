exports.seed = function(knex) {
  let script = `
  drop trigger if exists send_change_event on reverb.campaign_version;

  create or replace function on_campaign_version_change() returns trigger as $$
  declare
    routing_key text;
    row record;
    changed_campaign_version record;
    old_name text;
  begin
    routing_key := 'row_change.' || tg_table_name::text || '.' || 'update';

    if (tg_op = 'DELETE') then
      row := OLD;
      old_name = OLD."name";
    elsif (tg_op = 'UPDATE') then
      row := NEW;
      old_name = OLD."name";
    elsif (tg_op = 'INSERT') then
      row := NEW;
    end if;

    select row._id
    , row.created_at as "createdAt"
    , row.updated_at as "updatedAt"
    , row.campaign_id as "campaignId"
    , row."name"
    , row.reward_pool_id as "rewardPoolId"
    , row.exposure
    , row.active
    , row.link_expiry_days as "linkExpiryDays"
    , row.private_link_expiry_days as "privateLinkExpiryDays"
    , row.alias 
    , row.archived
    , tg_op as "operation"
    , old_name as "_old_name"
    , 'campaign_version' as "entityName"   
  into changed_campaign_version;
  
    perform pg_notify('cdc_table_changes', routing_key || '|' || row_to_json(changed_campaign_version)::text);
  
    return null;
  end;
  $$ stable language plpgsql;
  
  --- Trigger
  create trigger send_change_event after insert or update or delete on reverb.campaign_version for each row execute procedure on_campaign_version_change();
  `;
  return knex.schema.raw(script);
};