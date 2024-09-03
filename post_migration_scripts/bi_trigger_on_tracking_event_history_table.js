exports.seed = function (knex) {
  let script = `
  drop trigger if exists send_change_event on reverb.tracking_event_history;

  create or replace function on_tracking_event_history_change() returns trigger as $$
  declare
    routing_key text;
    row record;
    changed_tracking_event_history record;
  begin
    routing_key := 'row_change.' || tg_table_name::text || '.' || 'update';
  
    if (tg_op = 'UPDATE') then
      row := NEW;
    elsif (tg_op = 'INSERT') then
      row := NEW;
    end if;

    select row._id
      , row.created_at as "createdAt"
      , row.updated_at as "updatedAt"
      , row."type" as "type"
      , row.client_id as "clientId"
      , row.meta ->> 'userAgent' as "userAgent"
      , row.meta ->> 'sharedUrlId' as "sharedUrlId"
      , row.campaign_version_id as "campaignVersionId"
      , row.test_mode as "testMode"
      , tg_op as "operation"
      , 'tracking' as "entityName"      
    into changed_tracking_event_history;
  
    perform pg_notify('cdc_table_changes', routing_key || '|' || row_to_json(changed_tracking_event_history)::text);
  
    return null;
  end;
  $$ stable language plpgsql;
  
  --- Trigger
  create trigger send_change_event after insert or update on reverb.tracking_event_history for each row execute procedure on_tracking_event_history_change();
  `;
  return knex.schema.raw(script);
};