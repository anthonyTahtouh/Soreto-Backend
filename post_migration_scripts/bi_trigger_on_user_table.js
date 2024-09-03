exports.seed = function (knex) {
  const script = `
  drop trigger if exists send_change_event on reverb."user";

  create or replace function on_user_change() returns trigger as $$
  declare 
    routing_key text;
    row record;
    changed_user record;
    old_name text;
   	sales_role_id text;
    roles text [];
    sales boolean;
  begin
    routing_key := 'row_change.' || 'responsible'::text || '.' || 'update';

    if (tg_op = 'DELETE') then
      row := OLD;
      old_name = concat(OLD.first_name, ' ', old.last_name);      
    elsif (tg_op = 'UPDATE') then
      row := NEW;
      old_name = concat(OLD.first_name, ' ', old.last_name);
    elsif (tg_op = 'INSERT') then
      row := NEW;
    end if;
	
	select _id from reverb."role" where name = 'sales' limit 1 into sales_role_id;
	select array(select jsonb_array_elements_text(row.roles)) into roles;
	select sales_role_id = any (roles) into sales;
   
	if (sales) then
	    select row._id
	      , row.created_at as "createdAt"
	      , row.updated_at as "updatedAt"
	      , concat(row.first_name, ' ', row.last_name) as "name"
	      , row.roles 
	      , row.client_id as "clientId" 
	      , tg_op as "operation"
	      , old_name as "_old_name"
	      , 'client' as "entityName"         
	    into changed_user;
   
    perform pg_notify('cdc_table_changes', routing_key || '|' || row_to_json(changed_user)::text);
	end if;

    return null;
  end;
  $$ stable language plpgsql;

  --- Trigger
  CREATE TRIGGER 
    SEND_CHANGE_EVENT AFTER INSERT OR UPDATE OR DELETE 
    ON reverb."user" FOR EACH ROW 
    EXECUTE PROCEDURE on_user_change();
    `;
  return knex.schema.raw(script);
};
