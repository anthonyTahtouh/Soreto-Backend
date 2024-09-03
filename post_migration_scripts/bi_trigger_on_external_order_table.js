exports.seed = function(knex) {
  let script = `
  drop trigger if exists send_change_event on reverb.external_order;

  create or replace function on_external_order_change() returns trigger as $$
  declare
    routing_key text;
    row record;
    changed_external_order record;
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
      , row.paid_to_publisher as "paidToPublisher"
      , row.holder_id as "holderId"
      , row.holder_type as "holderType"
      , row.holder_transaction_id as "holderTransactionId"
      , row.total
      , row.client_id as "clientId"
      , row.currency
      , row.commission
      , row.status
      , row.clicked_at as "clickedAt"
      , row.transacted_at as "transactedAt"
      , row.advertiser_id as "advertiser_id"
      , row.customer_country as "customerCountry"
      , row.shared_url_access_id as "sharedUrlAccessId"
      , row.transaction_completed as "transactionCompleted"
      , row.locked_at as "lockedAt"
      , row.match_rule as "matchRule"
      , row.completion_rule as "completionRule"		
      , row.client_order_id as "clientOrderId"
      , tg_op as "operation"
      , 'external_order' as "entityName"
    into changed_external_order;
  
    perform pg_notify('cdc_table_changes', routing_key || '|' || row_to_json(changed_external_order)::text);
  
    return null;
  end;
  $$ stable language plpgsql;
  
  --- Trigger
  create trigger send_change_event after insert or update or delete on reverb.external_order for each row execute procedure on_external_order_change();
  `;
  return knex.schema.raw(script);
};