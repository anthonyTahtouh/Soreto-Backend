
exports.up = function(knex) {
  var query = `
  CREATE TABLE reverb.tracking_event_history
  (
    _id text NOT NULL DEFAULT reverb.generate_object_id(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    name text,
    type text NOT NULL,
    value text,
    client_id text DEFAULT NULL,
    user_id text DEFAULT NULL,
    campaign_id text DEFAULT NULL,
    display_block_id text DEFAULT NULL,
    code_block_id text DEFAULT NULL,
    meta jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT tracking_event_history_pkey PRIMARY KEY (_id),
    CONSTRAINT client_id_fkey FOREIGN KEY (client_id)
        REFERENCES reverb.client (_id) MATCH SIMPLE
        ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT user_id_fkey FOREIGN KEY (user_id)
        REFERENCES reverb."user" (_id) MATCH SIMPLE
        ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT campaign_id_fkey FOREIGN KEY (campaign_id)
        REFERENCES reverb.campaign (_id) MATCH SIMPLE
        ON UPDATE NO ACTION ON DELETE NO ACTION
  )
  `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
  DROP VIEW reverb.tracking_event_history_js;
  DROP TABLE reverb.tracking_event_history;
  `;
  return knex.schema.raw(query);
};
