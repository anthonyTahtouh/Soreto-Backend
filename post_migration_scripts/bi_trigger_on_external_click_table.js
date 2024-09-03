exports.seed = function(knex) {
  let script = `
  drop trigger if exists send_change_event on reverb.external_click;

  create or replace function on_external_click_change() returns trigger as $$
  declare
    routing_key text;
    row record;
    changed_external_click record;
  begin
    routing_key := 'row_change.' || tg_table_name::text || '.' || 'update';
  
    if (tg_op = 'DELETE') then
      row := OLD;
    elsif (tg_op = 'UPDATE') then
      row := NEW;
    elsif (tg_op = 'INSERT') then
      row := NEW;
    end if;
  
    select row._id
      , row.date as "date"
      , row.client_id as "clientId"
      , row.holder_id as "holderName"
      , row.clicks as "clicks"
      , row.shared_url_access_id as "sharedUrlAccessId"
      , tg_op as "operation"
      , 'external_click' as "entityName"
    into changed_external_click;

    perform pg_notify('cdc_table_changes', routing_key || '|' || row_to_json(changed_external_click)::text);
  
    return null;
  end;
  $$ stable language plpgsql;
  
  --- Trigger
  create trigger send_change_event after insert or update or delete on reverb.external_click for each row execute procedure on_external_click_change();
  `;
  return knex.schema.raw(script);
};