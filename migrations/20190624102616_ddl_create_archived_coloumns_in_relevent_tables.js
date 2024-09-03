export function up(knex) {
  var query = `
  BEGIN;

    CREATE OR REPLACE FUNCTION reverb.create_archived_column(
      schematblname text)
        RETURNS void
        LANGUAGE 'plpgsql'
        COST 100
        VOLATILE 
    AS $BODY$
        BEGIN
              EXECUTE concat('DROP VIEW ', schematblname,'_js');
              EXECUTE concat('ALTER TABLE ', schematblname,' ADD COLUMN archived BOOLEAN');
              EXECUTE concat('UPDATE ', schematblname,' SET archived = FALSE');
              EXECUTE concat('ALTER TABLE ', schematblname,' ALTER COLUMN archived SET NOT NULL');
              EXECUTE concat('ALTER TABLE ', schematblname,' ALTER COLUMN archived SET DEFAULT FALSE');
              PERFORM reverb.create_view_table_js(schematblname);
        END;
    $BODY$;
  
    select reverb.create_archived_column('reverb.campaign');
    select reverb.create_archived_column('reverb.campaign_version');
    select reverb.create_archived_column('reverb.display_block');
    select reverb.create_archived_column('reverb.code_block');
    select reverb.create_archived_column('reverb.assoc_campaigns_email_templates');
    select reverb.create_archived_column('reverb.email_template');
    select reverb.create_archived_column('reverb.reward_pool');

    DROP FUNCTION reverb.create_archived_column(text);

    COMMIT;
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ``;
  return knex.schema.raw(query);
}