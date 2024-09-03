exports.seed = function (knex) {
  const script = `
      drop trigger if exists send_change_event on reverb.country;

      create or replace function on_country_change() returns trigger as $$
      declare 
        routing_key text;
        row record;
        changed_country record;
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
          , row.name
          , row.currency_id as "currencyId"
          , row.region_level_1 as "regionLevel1"
          , row.region_level_2 as "regionLevel2"      
        INTO changed_country;

        perform pg_notify('cdc_table_changes', routing_key || '|' || row_to_json(changed_country)::text);

        return null;
      end;
      $$ stable language plpgsql;

      --- Trigger
      CREATE TRIGGER 
        SEND_CHANGE_EVENT AFTER INSERT OR UPDATE OR DELETE 
        ON reverb.country FOR EACH ROW 
        EXECUTE PROCEDURE on_country_change();
    `;

  return knex.schema.raw(script);
};
