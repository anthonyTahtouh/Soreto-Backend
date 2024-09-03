exports.seed = function(knex) {
  let script = `
  drop trigger if exists send_change_event on reverb.assoc_affiliate_merchant_client;

  create or replace function on_assoc_affiliate_merchant_client_change() returns trigger as $$
  declare
    routing_key text;
    row record;
    changed_assoc_affiliate_merchant_client record;
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
      , row.affiliate_Id as "affiliateId"
      , row.merchant_id as "merchantId"
      , row.client_id as "clientId"
      , row.country_id as "countryId"
      , row.connected_at as "connectedAt"
      , row.disconnected_at as "disconnectedAt"
      , row.report_order_source as "reportOrderSource"
      , row.report_click_source as "reportClickSource"
      , tg_op as "operation"
      , 'assoc_afffiliate_merchant' as "entityName"
    into changed_assoc_affiliate_merchant_client;
    
    perform pg_notify('cdc_table_changes', routing_key || '|' || row_to_json(changed_assoc_affiliate_merchant_client)::text);
  
    return null;
  end;
  $$ stable language plpgsql;
  
  --- Trigger
  create trigger send_change_event after insert or update or delete on reverb.assoc_affiliate_merchant_client for each row execute procedure on_assoc_affiliate_merchant_client_change();
  `;
  return knex.schema.raw(script);
};