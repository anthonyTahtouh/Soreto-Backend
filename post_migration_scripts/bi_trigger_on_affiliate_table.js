exports.seed = function(knex) {
  let script = `
  drop trigger if exists send_change_event on reverb.affiliate;

  create or replace function on_affiliate_change() returns trigger as $$
  declare
    routing_key text;
    row record;
    changed_affiliate record;
    old_name text;
  begin
    routing_key := 'row_change.' || tg_table_name::text || '.' || 'update';
  
    if (tg_op = 'DELETE') then
      row := OLD;
      old_name := OLD.name;
    elsif (tg_op = 'UPDATE') then
      row := NEW;
      old_name := OLD.name;
    elsif (tg_op = 'INSERT') then
      row := NEW;
    end if;

    select row._id
      , row.created_at as "createdAt"
      , row.updated_at as "updatedAt"
      , row.name 
      , tg_op as "operation"
      , old_name as "_old_name"
      , 'affiliate' as "entityName"
    into changed_affiliate;
  
    perform pg_notify('cdc_table_changes', routing_key || '|' || row_to_json(changed_affiliate)::text);
  
    return null;
  end;
  $$ stable language plpgsql;
  
  --- Trigger
  create trigger send_change_event after insert or update or delete on reverb.affiliate for each row execute procedure on_affiliate_change();
  `;
  return knex.schema.raw(script);
};
