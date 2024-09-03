exports.seed = function(knex) {
  let script = `
  drop trigger if exists send_change_event on reverb."order";

  create or replace function on_order_change() returns trigger as $$
  declare 
    routing_key text;
    row record;
    changed_order record;
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
      , row.client_order_id as "clientOrderId"
      , row.status
      , row.total
      , row.client_id as "clientId"
      , row.sharer_id as "sharerId"
      , row.buyer_id as "buyerId"
      , row.sub_total as "subTotal"
      , row.currency
      , row.commission
      , row.meta ->> 'sharedUrlId' as "sharedUrlId"
      , row.shared_url_access_id as "sharedUrlAccessId"
      , row.test_mode AS "testMode"
      , tg_op as "operation"
      , 'order' as "entityName"
    into changed_order;
  
    perform pg_notify('cdc_table_changes', routing_key || '|' || row_to_json(changed_order)::text);
  
    return null;
  end;
  $$ stable language plpgsql;
  
  --- Trigger
  create trigger send_change_event after insert or update or delete on reverb.order for each row execute procedure on_order_change();
  `;

  return knex.schema.raw(script);
};