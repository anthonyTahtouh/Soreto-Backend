exports.seed = function(knex) {
  let script = `
  drop trigger if exists send_change_event on reverb.campaign;

  create or replace function on_campaign_change() returns trigger as $$
  declare
    routing_key text;
    row record;
    changed_campaign record;
    old_name text;
  begin
    routing_key := 'row_change.' || tg_table_name::text || '.' || 'update';
  
    if (tg_op = 'DELETE') then
      row := OLD;
      old_name = OLD.description;
    elsif (tg_op = 'UPDATE') then
      row := NEW;
      old_name = OLD.description;
    elsif (tg_op = 'INSERT') then
      row := NEW;
    end if;
  
    select row._id
      , row.created_at as "createdAt"
      , row.updated_at as "updatedAt"
      , row.client_id as "clientId"
      , row.expiry
      , row.description
      , row.start_date as "startDate"
      , row.active
      , row.direct_share as "directShare"
      , row.soreto_tag as "soretoTag"
      , row.archived 
      , row.order_origin_currency as "orderOriginCurrency"
      , row.external_order_origin_currency as "externalOrderOriginCurrency"
      , tg_op as "operation"
      , old_name as "_old_name"
      , 'campaign' as "entityName"
      , row.country_id as "countryId"
    into changed_campaign;

    perform pg_notify('cdc_table_changes', routing_key || '|' || row_to_json(changed_campaign)::text);
  
    return null;
  end;
  $$ stable language plpgsql;
  
  --- Trigger
  create trigger send_change_event after insert or update or delete on reverb.campaign for each row execute procedure on_campaign_change();
  `;
  return knex.schema.raw(script);
};