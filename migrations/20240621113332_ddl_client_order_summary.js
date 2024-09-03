exports.up = function (knex) {
  const query = `
    
        ----
        ---- CREATE TABLE
        ----
        CREATE TABLE reverb.client_order_summary (
            "_id" text NOT NULL DEFAULT reverb.generate_object_id(),
            order_date date NOT NULL,
            client_id text NOT NULL REFERENCES reverb.client("_id"),
            currency text null,
            order_count integer not null,
            total numeric NOT null,
            PRIMARY KEY ("_id")
        );

        CREATE UNIQUE INDEX client_order_summary_unique ON reverb.client_order_summary (order_date, client_id, currency) WHERE currency IS NOT NULL;

        CREATE UNIQUE INDEX client_order_summary_unique_2 ON reverb.client_order_summary (order_date, client_id) WHERE currency IS NULL;

        ----
        ---- CREATE TABLE VIEW
        ----
        SELECT reverb.create_view_table_js('reverb.client_order_summary');

        ----
        ---- CREATE TRIGGER FUNCTION
        ----
        CREATE OR REPLACE FUNCTION summarize_client_order ()
        RETURNS TRIGGER AS
        $$
                DECLARE 
                summary_row_id text;
                BEGIN
                
                    --
                    -- 	THIS FUNCTION IS TRIGGERED ON EVERY CLIENT ORDER ROW INSERTION
                    --	IT MUST ADD THE ROW TO THE SUMMARIZED TABLE	"client_order_summary"
                    --
                
                    -- check if the record is not zero amount or test mode
                    IF NEW.order_total > 0 AND NEW.test_mode = false
                    THEN

                        --
                        -- try to take an existing row for the client, date and currency
                        --
                        
                        -- does the record have a currency?
                        IF NEW.currency IS NOT NULL
                        THEN
                            -- with currency
                            SELECT _id INTO summary_row_id FROM reverb.client_order_summary WHERE order_date = NEW.created_at::date AND client_id = NEW.client_id AND currency = NEW.currency LIMIT 1;
                        ELSE 
                            -- without currency
                            select _id INTO summary_row_id FROM reverb.client_order_summary WHERE order_date = NEW.created_at::date AND client_id = NEW.client_id AND currency IS NULL LIMIT 1;
                        END IF;

                        -- was an existing row found?
                        IF summary_row_id IS NULL THEN
                            
                            --
                            -- create a new row
                            --
                            INSERT INTO reverb.client_order_summary values (default, NEW.created_at, NEW.client_id, NEW.currency, 1, NEW.order_total);

                        ELSE

                            --
                            -- update existing row
                            -- 
                            UPDATE reverb.client_order_summary SET total =  total + NEW.order_total, order_count = order_count + 1 WHERE _id = summary_row_id;

                        END IF;

                    END IF;
                
                RETURN NULL;
            
            EXCEPTION
                WHEN OTHERS THEN
                RAISE NOTICE 'THERE WAS AN ERROR';
                RETURN NULL;
            END;
        $$ LANGUAGE 'plpgsql';

        ----
        ---- CREATE TRIGGER
        ----
        CREATE TRIGGER summarize_client_order
            AFTER INSERT ON reverb.client_order
            FOR EACH ROW EXECUTE PROCEDURE summarize_client_order ();
    
    `;
  return knex.schema.raw(query);
};

exports.down = function (knex) {
  const query = `
    
        ----
        ---- DROP TRIGGER
        ----
        DROP TRIGGER summarize_client_order ON reverb.client_order;

        ----
        ---- DROP FUNCTION
        ----
        DROP FUNCTION summarize_client_order;

        ----
        ---- DROP TABLE VIEW
        ----
        DROP VIEW IF EXISTS reverb.client_order_summary_js;

        ----
        ---- DROP TABLE
        ----
        DROP TABLE IF EXISTS reverb.client_order_summary;
    
    `;
  return knex.schema.raw(query);
};
