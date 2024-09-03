exports.up = function(knex) {
  var query = `
        CREATE TABLE reverb.value_types
        (
            _id text NOT NULL DEFAULT reverb.generate_object_id(),
            type text NOT NULL UNIQUE,
            view_name text NOT NULL UNIQUE,
            expose_to_api boolean NOT NULL DEFAULT true,
            CONSTRAINT value_types_pkey PRIMARY KEY (_id)
        );

        select reverb.create_view_table_js('reverb.value_types');

        insert into reverb.value_types (type, view_name, expose_to_api) values ('ORDER_STATUS', 'value_orderstatus_js', true);
        insert into reverb.value_types (type, view_name, expose_to_api) values ('PROCESS_STATUS', 'value_processstatus_js', true);
        insert into reverb.value_types (type, view_name, expose_to_api) values ('SOCIAL_PLATFORM', 'value_socialplatform_js', true);
        insert into reverb.value_types (type, view_name, expose_to_api) values ('TRACK_TYPE', 'value_tracktype_js', true);

        CREATE OR REPLACE FUNCTION reverb.agg_type_values_js(_type text)
        RETURNS TABLE ("value" text) AS
        $func$
        DECLARE
        _view_name text;
        BEGIN
            select view_name into _view_name from reverb.value_types where type = _type and expose_to_api = true;
            IF _view_name is null or _view_name = '' THEN
                RAISE EXCEPTION 'Type %s is not valid!', _type;
            ELSE
                RETURN QUERY EXECUTE format(
                    'SELECT t.value
                        FROM   reverb.%s t'
                    , _view_name);
            END IF;
        END
        $func$ LANGUAGE plpgsql;
        `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
        drop view reverb.value_types_js;
        drop table reverb.value_types;
        drop function reverb.agg_type_values_js
        `;
  return knex.schema.raw(query);
};