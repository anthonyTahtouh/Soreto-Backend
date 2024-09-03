exports.seed = function(knex) {
  let script = `
  drop trigger if exists send_change_event on reverb.shared_url_access;

  create or replace function on_shared_url_access_change() returns trigger as $$
  declare
    routing_key text;
    row record;
    changed_shared_url_access record;
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
    , row.created_at as "createdAt"
    , row.updated_at as "updatedAt"
    , row.shared_url_id as "sharedUrlId"
    , row.referer_website as "refererWebsite"
    , row.meta ->> 'userAgent' as "userAgent"
    , row.meta ->> 'placementType' as "placementType"
    , row.access_id as "accessId"
    , row.session_id as "sessionId"
    , tg_op as "operation"
    , 'shared_url_access' as "entityName"
  into changed_shared_url_access;
  
    perform pg_notify('cdc_table_changes', routing_key || '|' || row_to_json(changed_shared_url_access)::text);
  
    return null;
  end;
  $$ stable language plpgsql;
  
  --- Trigger
  create trigger send_change_event after insert or update or delete on reverb.shared_url_access for each row execute procedure on_shared_url_access_change();
  `;
  return knex.schema.raw(script);
};