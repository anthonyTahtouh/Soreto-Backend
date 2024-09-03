exports.seed = function (knex) {
  const script = `

      drop trigger if exists send_change_event on reverb.currency;

      create or replace function on_currency_change() returns trigger as $$

      declare 
        routing_key text;
        row record;
        changed_currency record;
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
          , row.name
          , row.currency_sign as "currencySign"
          , row.currency_code as "currencyCode"  
        INTO changed_currency;

        perform pg_notify('cdc_table_changes', routing_key || '|' || row_to_json(changed_currency)::text);

        return null;
      end;
      $$ stable language plpgsql;

      --- Trigger
      CREATE TRIGGER 
        SEND_CHANGE_EVENT AFTER INSERT OR UPDATE OR DELETE 
        ON reverb.currency FOR EACH ROW 
        EXECUTE PROCEDURE on_currency_change();
    `;

  return knex.schema.raw(script);
};
