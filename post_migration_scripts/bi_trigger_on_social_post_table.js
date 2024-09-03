exports.seed = function(knex) {
  let script = `
  drop trigger if exists send_change_event on reverb.social_post;

  create or replace function on_social_post_change() returns trigger as $$
  declare
    routing_key text;
    row record;
    changed_social_post record;
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
      , row.social_platform as "socialPlatform"
      , row.shared_url_id as "sharedUrlId"
      , tg_op as "operation"
      , 'social_post' as "entityName"
    into changed_social_post;

    perform pg_notify('cdc_table_changes', routing_key || '|' || row_to_json(changed_social_post)::text);
  
    return null;
  end;
  $$ stable language plpgsql;
  
  --- Trigger
  create trigger send_change_event after insert or update or delete on reverb.social_post for each row execute procedure on_social_post_change();
  `;
  return knex.schema.raw(script);
};