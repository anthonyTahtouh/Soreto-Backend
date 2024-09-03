exports.seed = function(knex) {
  let script = `
  drop trigger if exists send_change_event on reverb.shared_url;

  create or replace function on_shared_url_change() returns trigger as $$
  declare 
    routing_key text;
    row record;
    changed_shared_url record;
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
		, row.user_id as "userId"
		, row.client_id as "clientId"
		, row.meta ->> 'userAgent' as "userAgent"
		, row.campaign_version_id as "campaignVersionId"
		, row.test_mode as "testMode"
		, row.type
    , row.shared_url_group_id as "sharedUrlGroupId"
    , tg_op as "operation"
    , 'shared_url' as "entityName"
    into changed_shared_url;  
  
    perform pg_notify('cdc_table_changes', routing_key || '|' || row_to_json(changed_shared_url)::text);
  
    return null;
  end;
  $$ stable language plpgsql;
  
  --- Trigger
  create trigger send_change_event after insert or update or delete on reverb.shared_url for each row execute procedure on_shared_url_change();
  `;

  return knex.schema.raw(script);
};