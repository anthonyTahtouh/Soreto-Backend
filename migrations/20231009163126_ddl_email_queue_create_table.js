exports.up = function(knex) {
  var query = `
        CREATE TABLE
        reverb.email_queue
        (
            _id text UNIQUE NOT NULL DEFAULT reverb.generate_object_id(),
            created_at timestamp with time zone NOT NULL DEFAULT now(),
            updated_at timestamp with time zone NOT NULL DEFAULT now(),
            delay_seconds int DEFAULT 0,
            send_at timestamp with time zone NOT NULL,
            sent_at timestamp WITH time zone,
            "type" text NOT NULL,
            status text NOT NULL DEFAULT 'CREATED',
            provider_id text NOT NULL,
            transaction_id text,
            "data" JSONB,
            object_id text,
            log text,
            PRIMARY KEY ("_id")
        );

        select reverb.create_view_table_js('reverb.email_queue');
      `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
      drop view if exists reverb.email_queue_js;
      drop table reverb.email_queue;
      `;
  return knex.schema.raw(query);
};