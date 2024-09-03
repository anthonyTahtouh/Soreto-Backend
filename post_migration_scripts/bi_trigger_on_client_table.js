exports.seed = function (knex) {
  const script = `
  drop trigger if exists send_change_event on reverb.client;

  create or replace function on_client_change() returns trigger as $$
  declare 
    routing_key text;
    row record;
    changed_client record;
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
      , row.name
      , row.active 
      , row.country_id as "countryId" 
      , row.responsible_id as "responsibleId" 
      , row.percent_commission ->> 'default' as "percentCommission"
      , tg_op as "operation"
      , old_name as "_old_name"
      , 'client' as "entityName"         
    INTO changed_client;

    perform pg_notify('cdc_table_changes', routing_key || '|' || row_to_json(changed_client)::text);

    return null;
  end;
  $$ stable language plpgsql;

  --- Trigger
  CREATE TRIGGER 
    SEND_CHANGE_EVENT AFTER INSERT OR UPDATE OR DELETE 
    ON reverb.client FOR EACH ROW 
    EXECUTE PROCEDURE on_client_change();
    `;
  return knex.schema.raw(script);
};
