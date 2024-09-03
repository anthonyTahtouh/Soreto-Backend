--
-- PostgreSQL database dump
--

-- Dumped from database version 9.5.6
-- Dumped by pg_dump version 9.5.5

-- Started on 2018-03-09 18:07:53 GMT

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 3132 (class 1262 OID 85704)
-- Name: reverb; Type: DATABASE; Schema: -; Owner: postgres
--

CREATE DATABASE reverb WITH TEMPLATE = template0 ENCODING = 'UTF8' LC_COLLATE = 'C' LC_CTYPE = 'C';


ALTER DATABASE reverb OWNER TO postgres;

\connect reverb

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 9 (class 2615 OID 85705)
-- Name: reverb; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA reverb;


ALTER SCHEMA reverb OWNER TO postgres;

--
-- TOC entry 1 (class 3079 OID 12361)
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- TOC entry 3135 (class 0 OID 0)
-- Dependencies: 1
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


--
-- TOC entry 3 (class 3079 OID 85706)
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- TOC entry 3136 (class 0 OID 0)
-- Dependencies: 3
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- TOC entry 2 (class 3079 OID 85757)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA reverb;


--
-- TOC entry 3137 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET search_path = reverb, pg_catalog;

--
-- TOC entry 745 (class 1247 OID 85794)
-- Name: email_address; Type: DOMAIN; Schema: reverb; Owner: postgres
--

CREATE DOMAIN email_address AS text
	CONSTRAINT email_address_check CHECK ((VALUE ~ '[A-Za-z0-9._%-]+@[A-Za-z0-9._%-]+\.[A-Za-z0-9]{2,10}'::text));


ALTER DOMAIN email_address OWNER TO postgres;

--
-- TOC entry 377 (class 1255 OID 85796)
-- Name: assign_discount_code(text, text); Type: FUNCTION; Schema: reverb; Owner: postgres
--

CREATE FUNCTION assign_discount_code(p_user_id text, p_campaign_id text) RETURNS json
    LANGUAGE plpgsql
    AS $$    DECLARE
        discount_code_rec RECORD;
        available_code_rec RECORD;
        
    BEGIN
	SELECT discount_code._id,
	    discount_code.created_at,
	    discount_code.updated_at,
	    discount_code.meta,
	    discount_code.campaign_id,
	    discount_code.text,
	    discount_code.active
	    INTO discount_code_rec
	   FROM reverb."user"
	     LEFT JOIN reverb.user_discount_code ON "user"._id = user_discount_code.user_id
	     LEFT JOIN reverb.discount_code ON user_discount_code.discount_code_id = discount_code._id
	     LEFT JOIN reverb.campaign ON campaign._id = discount_code.campaign_id
	     WHERE campaign._id = p_campaign_id AND "user"._id = p_user_id;


	IF (FOUND) THEN
		return row_to_json(discount_code_rec);
	END IF;

	SELECT discount_code._id,
	    discount_code.created_at,
	    discount_code.updated_at,
	    discount_code.meta,
	    discount_code.campaign_id,
	    discount_code.text,
	    discount_code.active 
	    INTO available_code_rec FROM reverb.discount_code LEFT JOIN reverb.user_discount_code ON discount_code._id = user_discount_code.discount_code_id
	WHERE user_discount_code._id IS NULL AND
	discount_code.campaign_id = campaign_id
	LIMIT 1;

	IF (NOT FOUND) THEN
		return null;
	END IF;

	INSERT INTO reverb.user_discount_code (user_id, discount_code_id) VALUES (p_user_id, available_code_rec._id);

	return row_to_json(available_code_rec);
    RETURN 0;
    END;$$;


ALTER FUNCTION reverb.assign_discount_code(p_user_id text, p_campaign_id text) OWNER TO postgres;

--
-- TOC entry 380 (class 1255 OID 85799)
-- Name: create_js_view(); Type: FUNCTION; Schema: reverb; Owner: postgres
--

CREATE FUNCTION create_js_view() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE r RECORD;
tempT text;
BEGIN
FOR r IN SELECT * FROM pg_event_trigger_ddl_commands() LOOP
	if r.command_tag='CREATE TABLE' then
		select reverb.create_view_columns(r.object_identity) INTO tempT;
		RAISE NOTICE 'CREATE OR REPLACE VIEW %_js AS SELECT % FROM %',r.object_identity,tempT,r.object_identity;
		EXECUTE concat('CREATE OR REPLACE VIEW ',r.object_identity,'_js AS SELECT ',tempT,' FROM ', r.object_identity);
		
	end if;
END LOOP;
END
$$;


ALTER FUNCTION reverb.create_js_view() OWNER TO postgres;

--
-- TOC entry 381 (class 1255 OID 85800)
-- Name: create_view_columns(text); Type: FUNCTION; Schema: reverb; Owner: postgres
--

CREATE FUNCTION create_view_columns(schematblname text) RETURNS text
    LANGUAGE sql
    AS $$
SELECT string_agg
( concat(a.attname,' AS ',
      case when left(a.attname,1)='_'
      then quote_ident(concat('_',lower(left(replace(initcap(replace(a.attname,'_',' ')),' ',''),1)),right(replace(initcap(replace(a.attname,'_',' ')),' ',''),length(replace(initcap(replace(a.attname,'_',' ')),' ',''))-1)))
      else quote_ident(concat(lower(left(replace(initcap(replace(a.attname,'_',' ')),' ',''),1)),right(replace(initcap(replace(a.attname,'_',' ')),' ',''),length(replace(initcap(replace(a.attname,'_',' ')),' ',''))-1)))
	end ), ',')
      AS field
    FROM pg_attribute a, pg_class c, pg_namespace n
    WHERE 
        a.attnum > 0
        AND a.attrelid = c.oid
        AND n.oid = c.relnamespace
        AND c.relname = quote_ident(split_part(schematblName, '.', 2))
        AND n.nspname = quote_ident(split_part(schematblName, '.', 1));
$$;


ALTER FUNCTION reverb.create_view_columns(schematblname text) OWNER TO postgres;

--
-- TOC entry 366 (class 1255 OID 85801)
-- Name: generate_object_id(); Type: FUNCTION; Schema: reverb; Owner: postgres
--

CREATE FUNCTION generate_object_id() RETURNS character varying
    LANGUAGE plpgsql
    AS $$
    DECLARE
        time_component bigint;
        machine_id bigint := FLOOR(random() * 16777215);
        process_id bigint;
        seq_id bigint := FLOOR(random() * 16777215);
        result varchar:= '';
    BEGIN
        SELECT FLOOR(EXTRACT(EPOCH FROM clock_timestamp())) INTO time_component;
        SELECT pg_backend_pid() INTO process_id;

        result := result || lpad(to_hex(time_component), 8, '0');
        result := result || lpad(to_hex(machine_id), 6, '0');
        result := result || lpad(to_hex(process_id), 4, '0');
        result := result || lpad(to_hex(seq_id), 6, '0');
        RETURN result;
    END;
$$;


ALTER FUNCTION reverb.generate_object_id() OWNER TO postgres;

--
-- TOC entry 382 (class 1255 OID 85802)
-- Name: get_shared_daily_traction(text, date, date); Type: FUNCTION; Schema: reverb; Owner: postgres
--

CREATE FUNCTION get_shared_daily_traction(text, date, date) RETURNS TABLE("createdAt" date, "clientId" text, shares bigint, clicks bigint, revenue numeric, cpc numeric)
    LANGUAGE sql
    AS $_$
SELECT to_date(d.date, 'YYYY-MM-DD'), COALESCE(se."clientId",$1), COALESCE(se.shares,0), COALESCE(se.clicks,0), COALESCE(se.revenue,0), COALESCE(se.cpc,0)
	FROM (SELECT to_char(date_trunc('day', ($2 - offs)), 'YYYY-MM-DD') AS date 
	      FROM generate_series(0, ($2::date - $3::date), 1) AS offs
	     ) d LEFT OUTER JOIN
		(select * 
		from reverb.agg_client_traction_by_date_js as foo 
		where foo."clientId" = $1) as se
	    ON d.date = to_char(date_trunc('day', se."createdAt"), 'YYYY-MM-DD')   
	    ORDER BY date DESC NULLS LAST 
	$_$;


ALTER FUNCTION reverb.get_shared_daily_traction(text, date, date) OWNER TO postgres;

--
-- TOC entry 383 (class 1255 OID 90414)
-- Name: global_password_reset(text); Type: FUNCTION; Schema: reverb; Owner: postgres
--

CREATE FUNCTION global_password_reset(pwd text) RETURNS integer
    LANGUAGE plpgsql
    AS $$
    DECLARE
        user_rec RECORD;
    BEGIN
        FOR user_rec IN SELECT * FROM reverb."user" LOOP
		UPDATE reverb."user" AS "user" SET password = reverb.crypt(pwd::text, reverb.gen_salt('bf', 8)) WHERE "user"._id = user_rec._id;
	END LOOP;
	RETURN 0;
    END;
$$;


ALTER FUNCTION reverb.global_password_reset(pwd text) OWNER TO postgres;

--
-- TOC entry 367 (class 1255 OID 85803)
-- Name: merge_order_meta(); Type: FUNCTION; Schema: reverb; Owner: postgres
--

CREATE FUNCTION merge_order_meta() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN
	IF NEW.meta <> OLD.meta THEN
		NEW.meta := OLD.meta || NEW.meta;
	END IF;
	RETURN NEW;
END;
$$;


ALTER FUNCTION reverb.merge_order_meta() OWNER TO postgres;

--
-- TOC entry 384 (class 1255 OID 85804)
-- Name: migrate_order_sharedurl_id(); Type: FUNCTION; Schema: reverb; Owner: postgres
--

CREATE FUNCTION migrate_order_sharedurl_id() RETURNS integer
    LANGUAGE plpgsql
    AS $$
    DECLARE
        order_rec RECORD;
        shared_url_id TEXT;
    BEGIN
        FOR order_rec IN SELECT * FROM reverb.order LOOP
		shared_url_id := NULL;

		SELECT shared_url._id INTO shared_url_id FROM
			reverb."order" AS "order"
			LEFT JOIN reverb.track track ON "order".client_id = track.client_id AND "order".client_order_id = track.ref
			LEFT JOIN reverb.shared_url_access shared_url_access ON shared_url_access._id = track.shared_url_access_id
			LEFT JOIN reverb.shared_url shared_url ON shared_url._id = shared_url_access.shared_url_id
			WHERE "order"._id = order_rec._id;

		UPDATE reverb.order AS "order" SET meta = ('{"sharedUrlId":"' || shared_url_id ||'"}')::jsonb WHERE "order"._id = order_rec._id;
	END LOOP;
	RETURN 0;
    END;
$$;


ALTER FUNCTION reverb.migrate_order_sharedurl_id() OWNER TO postgres;

--
-- TOC entry 368 (class 1255 OID 85805)
-- Name: migrate_sharepopup_fields_to_meta(); Type: FUNCTION; Schema: reverb; Owner: postgres
--

CREATE FUNCTION migrate_sharepopup_fields_to_meta() RETURNS integer
    LANGUAGE plpgsql
    AS $$    DECLARE
        client_rec RECORD;
        meta_json jsonb;
    BEGIN
        FOR client_rec IN SELECT * FROM reverb.client LOOP
        meta_json := '{"title": null, "text1":null, "text2":null, "backgroundImageId": null, "backgroundEnabled": true}'::jsonb;

  IF (client_rec."share_bg_id" is not null) THEN
    meta_json := jsonb_set(meta_json, '{backgroundImageId}', ('"' || client_rec.share_bg_id || '"')::jsonb);
  END IF;

  IF (client_rec."share_text" is not null) THEN
    meta_json := jsonb_set(meta_json, '{text1}', ('"' || client_rec.share_text || '"')::jsonb);
  END IF;

  IF (client_rec."share_bg_enabled" is not TRUE) THEN
    meta_json := jsonb_set(meta_json, '{backgroundEnabled}', ('' || client_rec.share_bg_enabled || '')::jsonb);
  END IF;

  RAISE NOTICE 'TEST:%', jsonb_set('{"sharePopup": null}'::jsonb, '{sharePopup}', meta_json);

  UPDATE reverb.client SET meta = jsonb_set('{"sharePopup": null}'::jsonb, '{sharePopup}', meta_json)
  where client._id = client_rec._id;
    END LOOP;
    RETURN 0;
    END;$$;


ALTER FUNCTION reverb.migrate_sharepopup_fields_to_meta() OWNER TO postgres;

--
-- TOC entry 375 (class 1255 OID 85806)
-- Name: normalise_user_email(); Type: FUNCTION; Schema: reverb; Owner: postgres
--

CREATE FUNCTION normalise_user_email() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.email := lower(NEW.email);
  RETURN NEW;
END;
$$;


ALTER FUNCTION reverb.normalise_user_email() OWNER TO postgres;

--
-- TOC entry 369 (class 1255 OID 85807)
-- Name: notify_new_order(); Type: FUNCTION; Schema: reverb; Owner: postgres
--

CREATE FUNCTION notify_new_order() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    DECLARE
        new_order RECORD;
    BEGIN
    SELECT * INTO new_order FROM reverb.agg_notify_orders_js WHERE _id = NEW._id;
    
        PERFORM pg_notify('new_order', row_to_json(new_order)::text);
        RETURN NULL;
    END; 
$$;


ALTER FUNCTION reverb.notify_new_order() OWNER TO postgres;

--
-- TOC entry 370 (class 1255 OID 85808)
-- Name: notify_new_share(); Type: FUNCTION; Schema: reverb; Owner: postgres
--

CREATE FUNCTION notify_new_share() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    new_share RECORD;
  BEGIN
    SELECT * INTO new_share FROM reverb.agg_notify_sharedurls_js WHERE _id = NEW._id;
    
      PERFORM pg_notify('new_share', row_to_json(new_share)::text);
      RETURN NULL;
  END; 
$$;


ALTER FUNCTION reverb.notify_new_share() OWNER TO postgres;

--
-- TOC entry 371 (class 1255 OID 85809)
-- Name: notify_new_user(); Type: FUNCTION; Schema: reverb; Owner: postgres
--

CREATE FUNCTION notify_new_user() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    new_user RECORD;
  BEGIN
    SELECT * INTO new_user FROM reverb.agg_notify_users_js WHERE _id = NEW._id;
  
      PERFORM pg_notify('new_user', row_to_json(new_user)::text);
      RETURN NULL;
  END; 
$$;


ALTER FUNCTION reverb.notify_new_user() OWNER TO postgres;

--
-- TOC entry 372 (class 1255 OID 85810)
-- Name: order_sub_total_calc(); Type: FUNCTION; Schema: reverb; Owner: postgres
--

CREATE FUNCTION order_sub_total_calc() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    sub_total numeric;
BEGIN
    --SELECT jsonb_array_elements(NEW.line_items) into line_items;
    --NEW.sub_total := SUM(((line_items.value ->> 'price'::text)::numeric) * ((line_items.value ->> 'quantity'::text)::integer)::numeric);

    SELECT sum((item->>'price')::numeric * (item->>'quantity')::integer) as sub_total FROM jsonb_array_elements(NEW.line_items) AS item into sub_total;

    NEW.sub_total := sub_total::numeric;

    RETURN NEW;
END;
$$;


ALTER FUNCTION reverb.order_sub_total_calc() OWNER TO postgres;

--
-- TOC entry 385 (class 1255 OID 85811)
-- Name: process_user_default_meta(); Type: FUNCTION; Schema: reverb; Owner: postgres
--

CREATE FUNCTION process_user_default_meta() RETURNS integer
    LANGUAGE plpgsql
    AS $$
    DECLARE
        user_rec RECORD;
        user_id TEXT;
        password_set BOOLEAN;
    BEGIN
        FOR user_rec IN SELECT * FROM reverb.user LOOP
		user_id := NULL;
		password_set := NULL;

		IF (user_rec.meta->'passwordSet' is null AND user_rec.meta->'socialAuth' is not null) THEN
			password_set := false;
		ELSE
			password_set := true;
		END IF;

		RAISE NOTICE 'META:%', (COALESCE(user_rec.meta, '{}')::jsonb || ('{"passwordSet":' || password_set::text || '}')::jsonb)::jsonb;
		UPDATE reverb.user AS "user" SET meta = (COALESCE(user_rec.meta, '{}')::jsonb || ('{"passwordSet":' || password_set::text || '}')::jsonb)::jsonb WHERE "user"._id = user_rec._id;
	END LOOP;
	RETURN 0;
    END;
$$;


ALTER FUNCTION reverb.process_user_default_meta() OWNER TO postgres;

--
-- TOC entry 386 (class 1255 OID 85812)
-- Name: set_order_commission(); Type: FUNCTION; Schema: reverb; Owner: postgres
--

CREATE FUNCTION set_order_commission() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
row_client RECORD;
calc_commission numeric(15,6) := 0.00;
line_items_arr jsonb;
categories_arr jsonb;
arr_item jsonb;
category jsonb;
commission numeric(15,6) := NULL;
BEGIN
SELECT * INTO row_client FROM reverb.client WHERE _id = NEW.client_id;


IF NEW.commission > 0 THEN NEW.commission := NEW.commission;
ELSIF NEW.total > 0 THEN
NEW.commission := NEW.total::numeric * (((row_client.percent_commission)::jsonb->>'default')::numeric / 100::numeric);
ELSIF NEW.sub_total > 0 THEN
SELECT (NEW.line_items)::jsonb into line_items_arr;
SELECT (((row_client.percent_commission)::jsonb)->'categories')::jsonb into categories_arr;


FOR arr_item IN (SELECT * FROM jsonb_array_elements((line_items_arr)::jsonb))
LOOP
FOR category IN (SELECT * FROM jsonb_array_elements((categories_arr)::jsonb))
LOOP
IF category->>'name' = arr_item->>'category' THEN
commission := category->>'value';
END IF;
END LOOP;


IF arr_item->>'status' = 'CANCELLED' THEN
calc_commission := calc_commission + 0.00;
ELSIF commission >= 0 THEN
calc_commission := calc_commission + (((arr_item->>'quantity')::integer * (arr_item->>'price')::numeric) * commission / 100::numeric);
ELSE
calc_commission := calc_commission + (((arr_item->>'quantity')::integer * (arr_item->>'price')::numeric) * ((row_client.percent_commission)::jsonb->>'default')::numeric / 100::numeric);
END IF;
commission := NULL;
END LOOP;
NEW.commission := calc_commission;
END IF;
RETURN NEW;
END;
$$;


ALTER FUNCTION reverb.set_order_commission() OWNER TO postgres;

--
-- TOC entry 373 (class 1255 OID 85813)
-- Name: set_updated_timestamp(); Type: FUNCTION; Schema: reverb; Owner: postgres
--

CREATE FUNCTION set_updated_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION reverb.set_updated_timestamp() OWNER TO postgres;

--
-- TOC entry 376 (class 1255 OID 85814)
-- Name: set_user_default_meta(); Type: FUNCTION; Schema: reverb; Owner: postgres
--

CREATE FUNCTION set_user_default_meta() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.meta is NULL THEN
    NEW.meta := '{}'::jsonb;
  END IF;
  IF (NEW.meta->'passwordSet' is null) THEN
    NEW.meta := (NEW.meta::jsonb || '{"passwordSet": true}'::jsonb)::jsonb;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION reverb.set_user_default_meta() OWNER TO postgres;

--
-- TOC entry 387 (class 1255 OID 85815)
-- Name: update_user_password_meta(); Type: FUNCTION; Schema: reverb; Owner: postgres
--

CREATE FUNCTION update_user_password_meta() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
	IF (OLD.password <> NEW.password) THEN
		NEW.meta := jsonb_set(NEW.meta, '{passwordSet}', 'true');
	END IF;
	RETURN NEW;
END;
$$;


ALTER FUNCTION reverb.update_user_password_meta() OWNER TO postgres;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- TOC entry 184 (class 1259 OID 85817)
-- Name: _basetable; Type: TABLE; Schema: reverb; Owner: postgres
--

CREATE TABLE _basetable (
    _id text DEFAULT generate_object_id() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE _basetable OWNER TO postgres;

--
-- TOC entry 185 (class 1259 OID 85827)
-- Name: affiliate; Type: TABLE; Schema: reverb; Owner: postgres
--

CREATE TABLE affiliate (
    _id text DEFAULT generate_object_id() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb,
    name text NOT NULL,
    module text NOT NULL,
    image_url text
);


ALTER TABLE affiliate OWNER TO postgres;

--
-- TOC entry 186 (class 1259 OID 85837)
-- Name: affiliate_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW affiliate_js AS
 SELECT affiliate._id,
    affiliate.created_at AS "createdAt",
    affiliate.updated_at AS "updatedAt",
    affiliate.meta,
    affiliate.name,
    affiliate.module,
    affiliate.image_url AS "imageUrl"
   FROM affiliate;


ALTER TABLE affiliate_js OWNER TO postgres;

--
-- TOC entry 187 (class 1259 OID 85841)
-- Name: assoc_affiliate_merchant_client; Type: TABLE; Schema: reverb; Owner: postgres
--

CREATE TABLE assoc_affiliate_merchant_client (
    _id text DEFAULT generate_object_id() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb,
    affiliate_id text,
    merchant_id text,
    client_id text
);


ALTER TABLE assoc_affiliate_merchant_client OWNER TO postgres;

--
-- TOC entry 188 (class 1259 OID 85851)
-- Name: client; Type: TABLE; Schema: reverb; Owner: postgres
--

CREATE TABLE client (
    _id text DEFAULT generate_object_id() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL,
    location text NOT NULL,
    referer jsonb DEFAULT '[]'::jsonb NOT NULL,
    percent_commission jsonb DEFAULT '{"default": 0}'::jsonb NOT NULL,
    secret text NOT NULL,
    image_id text,
    share_bg_id text,
    share_bg_enabled boolean DEFAULT true NOT NULL,
    share_text text,
    website text,
    trading_name text,
    tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    email email_address NOT NULL,
    meta jsonb DEFAULT '{"sharePopup": {}}'::jsonb NOT NULL,
    primary_contact_first_name text,
    primary_contact_last_name text,
    primary_contact_email text,
    primary_contact_phone text,
    primary_contact_address_line_1 text,
    primary_contact_address_line_2 text,
    primary_contact_town_city text,
    primary_contact_area_county text,
    primary_contact_country text,
    primary_contact_post_code text,
    billing_contact_first_name text,
    billing_contact_last_name text,
    billing_contact_email text,
    billing_contact_phone text,
    billing_contact_address_line_1 text,
    billing_contact_address_line_2 text,
    billing_contact_town_city text,
    billing_contact_area_county text,
    billing_contact_country text,
    billing_contact_post_code text
);


ALTER TABLE client OWNER TO postgres;

--
-- TOC entry 189 (class 1259 OID 85865)
-- Name: agg_client_affiliate_assoc_meta_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW agg_client_affiliate_assoc_meta_js AS
 SELECT client._id,
    client.created_at AS "createdAt",
    client.updated_at AS "updatedAt",
    client.name,
    client.location,
    client.email,
    client.referer,
    client.percent_commission AS "percentCommission",
    client.secret,
    client.image_id AS "imageId",
    client.share_bg_id AS "shareBgId",
    client.share_bg_enabled AS "shareBgEnabled",
    client.share_text AS "shareText",
    client.website,
    client.trading_name AS "tradingName",
    client.tags,
    client.meta,
    assoc_affiliate_merchant_client.meta AS "assocMeta"
   FROM (client
     LEFT JOIN assoc_affiliate_merchant_client ON ((assoc_affiliate_merchant_client.client_id = client._id)));


ALTER TABLE agg_client_affiliate_assoc_meta_js OWNER TO postgres;

--
-- TOC entry 190 (class 1259 OID 85870)
-- Name: order; Type: TABLE; Schema: reverb; Owner: postgres
--

CREATE TABLE "order" (
    _id text DEFAULT generate_object_id() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    client_order_id text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    total numeric(15,6),
    client_id text NOT NULL,
    sharer_id text NOT NULL,
    buyer_id text,
    buyer_email email_address,
    line_items jsonb DEFAULT '[]'::jsonb NOT NULL,
    sub_total numeric(15,6),
    currency text,
    commission numeric(15,6) DEFAULT 0.000000,
    meta jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT order_total_check_postitive CHECK ((total > (0)::numeric))
);


ALTER TABLE "order" OWNER TO postgres;

--
-- TOC entry 191 (class 1259 OID 85884)
-- Name: order_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW order_js AS
 SELECT "order"._id,
    "order".created_at AS "createdAt",
    "order".updated_at AS "updatedAt",
    "order".client_order_id AS "clientOrderId",
    "order".status,
    "order".total,
    "order".sub_total AS "subTotal",
    "order".client_id AS "clientId",
    "order".sharer_id AS "sharerId",
    "order".buyer_id AS "buyerId",
    "order".buyer_email AS "buyerEmail",
    "order".line_items AS "lineItems",
    "order".currency,
    "order".commission,
    "order".meta
   FROM "order";


ALTER TABLE order_js OWNER TO postgres;

--
-- TOC entry 192 (class 1259 OID 85888)
-- Name: shared_url; Type: TABLE; Schema: reverb; Owner: postgres
--

CREATE TABLE shared_url (
    _id text DEFAULT generate_object_id() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id text NOT NULL,
    client_id text NOT NULL,
    product_url text NOT NULL,
    short_url text NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb,
    tracking_url text
);


ALTER TABLE shared_url OWNER TO postgres;

--
-- TOC entry 193 (class 1259 OID 85898)
-- Name: shared_url_access; Type: TABLE; Schema: reverb; Owner: postgres
--

CREATE TABLE shared_url_access (
    _id text DEFAULT generate_object_id() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    shared_url_id text NOT NULL,
    referer_website text,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    access_id text
);


ALTER TABLE shared_url_access OWNER TO postgres;

--
-- TOC entry 194 (class 1259 OID 85908)
-- Name: shared_url_access_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW shared_url_access_js AS
 SELECT shared_url_access._id,
    shared_url_access.created_at AS "createdAt",
    shared_url_access.updated_at AS "updatedAt",
    shared_url_access.shared_url_id AS "sharedUrlId",
    shared_url_access.referer_website AS "refererWebsite",
    shared_url_access.meta,
    shared_url_access.access_id AS "accessId"
   FROM shared_url_access;


ALTER TABLE shared_url_access_js OWNER TO postgres;

--
-- TOC entry 195 (class 1259 OID 85912)
-- Name: shared_url_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW shared_url_js AS
 SELECT shared_url._id,
    shared_url.created_at AS "createdAt",
    shared_url.updated_at AS "updatedAt",
    shared_url.user_id AS "userId",
    shared_url.client_id AS "clientId",
    shared_url.product_url AS "productUrl",
    shared_url.short_url AS "shortUrl",
    shared_url.meta,
    shared_url.tracking_url AS "trackingUrl"
   FROM shared_url;


ALTER TABLE shared_url_js OWNER TO postgres;

--
-- TOC entry 196 (class 1259 OID 85916)
-- Name: agg_client_traction_by_date_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW agg_client_traction_by_date_js AS
 SELECT metric."createdAt",
    metric."clientId",
    metric.shares,
    metric.clicks,
    metric.revenue,
        CASE COALESCE(metric.clicks, (0)::bigint)
            WHEN 0 THEN (0)::numeric(15,6)
            ELSE ((COALESCE(metric.revenue, ((0)::bigint)::numeric) / (metric.clicks)::numeric))::numeric(15,6)
        END AS cpc
   FROM ( SELECT COALESCE(share."createdAt", click."createdAt", "order"."createdAt") AS "createdAt",
            COALESCE(share."clientId", click."clientId", "order"."clientId") AS "clientId",
            share.shares,
            click.clicks,
            "order".revenue
           FROM ((( SELECT date("sharedUrl"."createdAt") AS "createdAt",
                    "sharedUrl"."clientId",
                    count("sharedUrl"._id) AS shares
                   FROM shared_url_js "sharedUrl"
                  GROUP BY (date("sharedUrl"."createdAt")), "sharedUrl"."clientId"
                  ORDER BY (date("sharedUrl"."createdAt"))) share
             FULL JOIN ( SELECT date("sharedUrlAccess"."createdAt") AS "createdAt",
                    "sharedUrl"."clientId",
                    count("sharedUrlAccess"._id) AS clicks
                   FROM (shared_url_js "sharedUrl"
                     RIGHT JOIN shared_url_access_js "sharedUrlAccess" ON (("sharedUrl"._id = "sharedUrlAccess"."sharedUrlId")))
                  GROUP BY (date("sharedUrlAccess"."createdAt")), "sharedUrl"."clientId"
                  ORDER BY (date("sharedUrlAccess"."createdAt"))) click ON (((share."createdAt" = click."createdAt") AND (share."clientId" = click."clientId"))))
             FULL JOIN ( SELECT date(order_1."createdAt") AS "createdAt",
                    order_1."clientId",
                    sum(
                        CASE
                            WHEN ((order_1.total IS NULL) OR (order_1.total = (0)::numeric)) THEN order_1."subTotal"
                            ELSE order_1.total
                        END) AS revenue
                   FROM order_js order_1
                  GROUP BY (date(order_1."createdAt")), order_1."clientId"
                  ORDER BY (date(order_1."createdAt"))) "order" ON (((click."createdAt" = "order"."createdAt") AND (click."clientId" = "order"."clientId"))))) metric;


ALTER TABLE agg_client_traction_by_date_js OWNER TO postgres;

--
-- TOC entry 197 (class 1259 OID 85921)
-- Name: user; Type: TABLE; Schema: reverb; Owner: postgres
--

CREATE TABLE "user" (
    _id text DEFAULT generate_object_id(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    meta jsonb DEFAULT '{}'::jsonb,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email email_address NOT NULL,
    password text NOT NULL,
    roles jsonb DEFAULT '[]'::jsonb NOT NULL,
    client_id text,
    primary_wallet text,
    client_wallets jsonb DEFAULT '[]'::jsonb NOT NULL,
    verified_email boolean DEFAULT false NOT NULL,
    image_id text
)
INHERITS (_basetable);


ALTER TABLE "user" OWNER TO postgres;

--
-- TOC entry 290 (class 1259 OID 90415)
-- Name: agg_notify_orders_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW agg_notify_orders_js AS
 SELECT "order"._id,
    "order".created_at AS "createdAt",
    "order".updated_at AS "updatedAt",
    "order".client_order_id AS "clientOrderId",
    (COALESCE("order".total, "order".sub_total))::numeric(15,2) AS "calculatedTotal",
    "order".commission,
    client.name AS "clientName",
    "user".first_name AS "userFirstName",
    "user".last_name AS "userLastName",
    "user".email AS "userEmail"
   FROM (("order"
     LEFT JOIN client client ON ((client._id = "order".client_id)))
     LEFT JOIN "user" "user" ON (("user"._id = "order".sharer_id)))
  ORDER BY "order".created_at DESC;


ALTER TABLE agg_notify_orders_js OWNER TO postgres;

--
-- TOC entry 198 (class 1259 OID 85939)
-- Name: transaction; Type: TABLE; Schema: reverb; Owner: postgres
--

CREATE TABLE transaction (
    _id text DEFAULT generate_object_id() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    type text NOT NULL,
    amount numeric(15,6) DEFAULT 0.00 NOT NULL,
    wallet_id text NOT NULL,
    user_id text NOT NULL,
    reference_id text NOT NULL,
    reference_type text NOT NULL,
    CONSTRAINT transaction_amount_positive_check CHECK ((amount >= (0)::numeric))
);


ALTER TABLE transaction OWNER TO postgres;

--
-- TOC entry 199 (class 1259 OID 85950)
-- Name: agg_shared_url_earning_v2_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW agg_shared_url_earning_v2_js AS
 SELECT ("order".meta ->> 'sharedUrlId'::text) AS "sharedUrlId",
    sum(transaction.amount) AS earnings,
    sum("order".commission) AS "displayEarnings"
   FROM ("order" "order"
     LEFT JOIN transaction transaction ON (((transaction.reference_id = "order"._id) AND (transaction.type = 'CREDIT'::text) AND (("order".meta ->> 'sharedUrlId'::text) <> ''::text))))
  WHERE (("order".status = 'PAID'::text) OR ("order".status = 'PENDING'::text))
  GROUP BY ("order".meta ->> 'sharedUrlId'::text);


ALTER TABLE agg_shared_url_earning_v2_js OWNER TO postgres;

--
-- TOC entry 200 (class 1259 OID 85955)
-- Name: meta_product; Type: TABLE; Schema: reverb; Owner: postgres
--

CREATE TABLE meta_product (
    _id text DEFAULT generate_object_id() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    product_url text NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL
);


ALTER TABLE meta_product OWNER TO postgres;

--
-- TOC entry 201 (class 1259 OID 85965)
-- Name: agg_shared_url_meta_user_v2_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW agg_shared_url_meta_user_v2_js AS
 SELECT shared_url._id,
    shared_url.created_at AS "createdAt",
    shared_url.updated_at AS "updatedAt",
    shared_url.user_id AS "userId",
    shared_url.client_id AS "clientId",
    shared_url.product_url AS "productUrl",
    shared_url.short_url AS "shortUrl",
    meta_product.meta,
    COALESCE(access.clicks, (0)::bigint) AS clicks,
    COALESCE("order".orders, (0)::bigint) AS orders,
    COALESCE(earnings.earnings, 0.00::numeric(15,6)) AS earnings,
    COALESCE("order".orders, (0)::bigint) AS "cntOrders",
    COALESCE((meta_product.meta ->> 'title'::text), shared_url.product_url) AS "productTitle",
    COALESCE((meta_product.meta ->> 'image'::text), NULL::text) AS "productImage",
        CASE COALESCE(access.clicks, (0)::bigint)
            WHEN 0 THEN (0)::numeric(15,6)
            ELSE ((COALESCE(earnings."displayEarnings", 0.00) / (access.clicks)::numeric))::numeric(15,6)
        END AS epc,
    COALESCE(earnings."displayEarnings", 0.00::numeric(15,6)) AS "displayEarnings"
   FROM ((((shared_url shared_url
     LEFT JOIN ( SELECT shared_url_access.shared_url_id AS _id,
            count(*) AS clicks
           FROM shared_url_access
          GROUP BY shared_url_access.shared_url_id) access ON ((shared_url._id = access._id)))
     LEFT JOIN ( SELECT (order_1.meta ->> 'sharedUrlId'::text) AS shared_url_id,
            count(*) AS orders
           FROM "order" order_1
          GROUP BY (order_1.meta ->> 'sharedUrlId'::text)) "order" ON ((shared_url._id = "order".shared_url_id)))
     LEFT JOIN ( SELECT agg_shared_url_earning_v2_js."sharedUrlId",
            agg_shared_url_earning_v2_js.earnings,
            agg_shared_url_earning_v2_js."displayEarnings"
           FROM agg_shared_url_earning_v2_js) earnings ON ((shared_url._id = earnings."sharedUrlId")))
     LEFT JOIN meta_product meta_product ON ((shared_url.product_url = meta_product.product_url)));


ALTER TABLE agg_shared_url_meta_user_v2_js OWNER TO postgres;

--
-- TOC entry 202 (class 1259 OID 85970)
-- Name: agg_notify_sharedurls_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW agg_notify_sharedurls_js AS
 SELECT shared_url._id,
    shared_url."productTitle",
    shared_url."productUrl",
    "user".first_name AS "userFirstName",
    "user".last_name AS "userLastName",
    "user".email AS "userEmail",
    client.name AS "clientName"
   FROM ((agg_shared_url_meta_user_v2_js shared_url
     LEFT JOIN "user" "user" ON ((shared_url."userId" = "user"._id)))
     LEFT JOIN client client ON ((shared_url."clientId" = client._id)))
  ORDER BY shared_url."createdAt" DESC;


ALTER TABLE agg_notify_sharedurls_js OWNER TO postgres;

--
-- TOC entry 203 (class 1259 OID 85975)
-- Name: agg_notify_users_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW agg_notify_users_js AS
 SELECT "user"._id,
    "user".first_name AS "firstName",
    "user".last_name AS "lastName",
    "user".email
   FROM "user"
  ORDER BY "user".created_at DESC;


ALTER TABLE agg_notify_users_js OWNER TO postgres;

--
-- TOC entry 204 (class 1259 OID 85979)
-- Name: track; Type: TABLE; Schema: reverb; Owner: postgres
--

CREATE TABLE track (
    _id text DEFAULT generate_object_id() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id text,
    client_id text,
    shared_url_access_id text,
    type text NOT NULL,
    ref text,
    referer text,
    ip_address text,
    user_agent text
);


ALTER TABLE track OWNER TO postgres;

--
-- TOC entry 205 (class 1259 OID 85988)
-- Name: agg_order_activity_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW agg_order_activity_js AS
 SELECT "order"._id,
    "order".created_at AS "createdAt",
    "order".updated_at AS "updatedAt",
    "order".client_order_id AS "clientOrderId",
    "order".status,
    "order".total,
    "order".sub_total AS "subTotal",
    "order".client_id AS "clientId",
    "order".sharer_id AS "sharerId",
    "order".buyer_id AS "buyerId",
    "order".buyer_email AS "buyerEmail",
    "order".line_items AS "lineItems",
    shared_url.product_url AS "productUrl",
        CASE
            WHEN ("order".total > (0)::numeric) THEN "order".total
            ELSE "order".sub_total
        END AS "calculatedTotal",
    meta_product.meta
   FROM (((("order" "order"
     LEFT JOIN track track ON ((("order".client_id = track.client_id) AND ("order".client_order_id = track.ref))))
     LEFT JOIN shared_url_access shared_url_access ON ((shared_url_access._id = track.shared_url_access_id)))
     LEFT JOIN shared_url shared_url ON ((shared_url._id = shared_url_access.shared_url_id)))
     LEFT JOIN meta_product meta_product ON ((shared_url.product_url = meta_product.product_url)));


ALTER TABLE agg_order_activity_js OWNER TO postgres;

--
-- TOC entry 206 (class 1259 OID 85993)
-- Name: agg_order_activity_v2_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW agg_order_activity_v2_js AS
 SELECT "order"._id,
    "order".created_at AS "createdAt",
    "order".updated_at AS "updatedAt",
    "order".client_order_id AS "clientOrderId",
    "order".status,
    "order".total,
    "order".sub_total AS "subTotal",
    "order".client_id AS "clientId",
    "order".sharer_id AS "sharerId",
    "order".buyer_id AS "buyerId",
    "order".buyer_email AS "buyerEmail",
    "order".line_items AS "lineItems",
    shared_url.product_url AS "productUrl",
        CASE
            WHEN ("order".total > (0)::numeric) THEN "order".total
            ELSE "order".sub_total
        END AS "calculatedTotal",
    (COALESCE(meta_product.meta, '{}'::jsonb) || "order".meta) AS meta,
    COALESCE((meta_product.meta ->> 'title'::text), shared_url.product_url) AS "productTitle",
    COALESCE((meta_product.meta ->> 'image'::text), NULL::text) AS "productImage"
   FROM (("order" "order"
     LEFT JOIN shared_url shared_url ON ((shared_url._id = ("order".meta ->> 'sharedUrlId'::text))))
     LEFT JOIN meta_product meta_product ON ((shared_url.product_url = meta_product.product_url)));


ALTER TABLE agg_order_activity_v2_js OWNER TO postgres;

--
-- TOC entry 207 (class 1259 OID 85998)
-- Name: agg_order_referer_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW agg_order_referer_js AS
 SELECT "order"._id,
    "order".created_at AS "createdAt",
    "order".updated_at AS "updatedAt",
    "order".client_order_id AS "clientOrderId",
    "order".status,
    "order".total,
    "order".sub_total AS "subTotal",
    "order".client_id AS "clientId",
    "order".sharer_id AS "sharerId",
    "order".buyer_id AS "buyerId",
    "order".buyer_email AS "buyerEmail",
    "order".line_items AS "lineItems",
    shared_url.referer_website AS "refererWebsite",
    "order".commission
   FROM (("order" "order"
     LEFT JOIN track track ON (("order".client_order_id = track.ref)))
     LEFT JOIN shared_url_access shared_url ON ((track.shared_url_access_id = shared_url._id)));


ALTER TABLE agg_order_referer_js OWNER TO postgres;

--
-- TOC entry 208 (class 1259 OID 86003)
-- Name: agg_order_user_activity_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW agg_order_user_activity_js AS
 SELECT DISTINCT "order".created_at AS "createdAt",
    shared_url.product_url AS "productUrl",
    meta_product.meta,
    "order".status,
    "order".sharer_id AS "userId",
    "order"._id AS "orderId",
    "order".commission
   FROM ((((("order" "order"
     LEFT JOIN transaction transaction ON ((transaction.reference_id = "order"._id)))
     LEFT JOIN track track ON ((("order".client_id = track.client_id) AND ("order".client_order_id = track.ref))))
     LEFT JOIN shared_url_access shared_url_access ON ((shared_url_access._id = track.shared_url_access_id)))
     LEFT JOIN shared_url shared_url ON ((shared_url._id = shared_url_access.shared_url_id)))
     LEFT JOIN meta_product meta_product ON ((shared_url.product_url = meta_product.product_url)));


ALTER TABLE agg_order_user_activity_js OWNER TO postgres;

--
-- TOC entry 209 (class 1259 OID 86008)
-- Name: agg_order_user_activity_v2_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW agg_order_user_activity_v2_js AS
 SELECT DISTINCT "order".created_at AS "createdAt",
    shared_url.product_url AS "productUrl",
    meta_product.meta,
    "order".status,
    "order".sharer_id AS "userId",
    "order"._id AS "orderId",
    "order".commission,
    COALESCE((meta_product.meta ->> 'title'::text), shared_url.product_url) AS "productTitle",
    COALESCE((meta_product.meta ->> 'image'::text), NULL::text) AS "productImage"
   FROM ((("order" "order"
     LEFT JOIN transaction transaction ON ((transaction.reference_id = "order"._id)))
     LEFT JOIN shared_url shared_url ON ((shared_url._id = ("order".meta ->> 'sharedUrlId'::text))))
     LEFT JOIN meta_product meta_product ON ((shared_url.product_url = meta_product.product_url)));


ALTER TABLE agg_order_user_activity_v2_js OWNER TO postgres;

--
-- TOC entry 210 (class 1259 OID 86013)
-- Name: agg_shared_url_by_access_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW agg_shared_url_by_access_js AS
 SELECT access.shared_url_id AS "sharedUrlId",
    shared_url.user_id AS "userId",
    shared_url.client_id AS "clientId",
    shared_url.product_url AS "productUrl",
    shared_url.short_url AS "shortUrl",
    access._id,
    access.created_at AS "createdAt",
    access.updated_at AS "updatedAt",
    access.referer_website AS "refererWebsite"
   FROM (shared_url shared_url
     LEFT JOIN shared_url_access access ON ((shared_url._id = access.shared_url_id)));


ALTER TABLE agg_shared_url_by_access_js OWNER TO postgres;

--
-- TOC entry 211 (class 1259 OID 86017)
-- Name: agg_shared_url_client_earning_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW agg_shared_url_client_earning_js AS
 SELECT track.shared_url_id AS "sharedUrlId",
    sum(
        CASE
            WHEN ("order".total > (0)::numeric) THEN "order".total
            ELSE "order".sub_total
        END) AS earnings
   FROM ("order" "order"
     JOIN ( SELECT shared_url_access.shared_url_id,
            track_1.ref AS client_order_id
           FROM (track track_1
             JOIN ( SELECT shared_url._id AS shared_url_id,
                    shared_url_access_1._id
                   FROM (shared_url shared_url
                     JOIN shared_url_access shared_url_access_1 ON ((shared_url._id = shared_url_access_1.shared_url_id)))) shared_url_access ON ((track_1.shared_url_access_id = shared_url_access._id)))
          WHERE (track_1.type = 'ORDER'::text)) track ON (("order".client_order_id = track.client_order_id)))
  GROUP BY track.shared_url_id;


ALTER TABLE agg_shared_url_client_earning_js OWNER TO postgres;

--
-- TOC entry 212 (class 1259 OID 86022)
-- Name: agg_shared_url_client_earning_v2_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW agg_shared_url_client_earning_v2_js AS
 SELECT ("order".meta ->> 'sharedUrlId'::text) AS "sharedUrlId",
    sum(
        CASE
            WHEN ("order".total > (0)::numeric) THEN "order".total
            ELSE "order".sub_total
        END) AS earnings
   FROM "order" "order"
  WHERE (("order".meta ->> 'sharedUrlId'::text) <> ''::text)
  GROUP BY ("order".meta ->> 'sharedUrlId'::text);


ALTER TABLE agg_shared_url_client_earning_v2_js OWNER TO postgres;

--
-- TOC entry 213 (class 1259 OID 86026)
-- Name: agg_shared_url_earning_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW agg_shared_url_earning_js AS
 SELECT "order".shared_url_id AS "sharedUrlId",
    sum(transaction.amount) AS earnings
   FROM (transaction transaction
     JOIN ( SELECT track.shared_url_id,
            order_1._id AS order_id
           FROM ("order" order_1
             JOIN ( SELECT shared_url_access.shared_url_id,
                    track_1.ref AS client_order_id
                   FROM (track track_1
                     JOIN ( SELECT shared_url._id AS shared_url_id,
                            shared_url_access_1._id
                           FROM (shared_url shared_url
                             JOIN shared_url_access shared_url_access_1 ON ((shared_url._id = shared_url_access_1.shared_url_id)))) shared_url_access ON ((track_1.shared_url_access_id = shared_url_access._id)))
                  WHERE (track_1.type = 'ORDER'::text)) track ON ((order_1.client_order_id = track.client_order_id)))) "order" ON (("order".order_id = transaction.reference_id)))
  WHERE (transaction.type = 'CREDIT'::text)
  GROUP BY "order".shared_url_id;


ALTER TABLE agg_shared_url_earning_js OWNER TO postgres;

--
-- TOC entry 214 (class 1259 OID 86031)
-- Name: agg_shared_url_meta_client_by_product_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW agg_shared_url_meta_client_by_product_js AS
 SELECT shared_url.product_url AS "productUrl",
    count(shared_url.product_url) AS shares,
    COALESCE((meta_product.meta ->> 'title'::text), shared_url.product_url) AS "productTitle",
    COALESCE((meta_product.meta ->> 'image'::text), NULL::text) AS "productImage",
    sum(COALESCE(access.clicks, (0)::bigint)) AS clicks,
    sum(COALESCE("order".orders, (0)::bigint)) AS orders,
    sum(COALESCE(earnings.earnings, ((0)::bigint)::numeric)) AS earnings,
    shared_url.client_id AS "clientId",
    sum(
        CASE COALESCE(access.clicks, (0)::bigint)
            WHEN 0 THEN (0)::numeric(15,6)
            ELSE ((COALESCE(earnings.earnings, ((0)::bigint)::numeric) / (access.clicks)::numeric))::numeric(15,6)
        END) AS cpc
   FROM ((((shared_url shared_url
     LEFT JOIN ( SELECT shared_url_access.shared_url_id AS _id,
            count(*) AS clicks
           FROM shared_url_access
          GROUP BY shared_url_access.shared_url_id) access ON ((shared_url._id = access._id)))
     LEFT JOIN ( SELECT (order_1.meta ->> 'sharedUrlId'::text) AS shared_url_id,
            count(*) AS orders
           FROM "order" order_1
          GROUP BY (order_1.meta ->> 'sharedUrlId'::text)) "order" ON ((shared_url._id = "order".shared_url_id)))
     LEFT JOIN ( SELECT agg_shared_url_client_earning_v2_js."sharedUrlId",
            agg_shared_url_client_earning_v2_js.earnings
           FROM agg_shared_url_client_earning_v2_js) earnings ON ((shared_url._id = earnings."sharedUrlId")))
     LEFT JOIN meta_product meta_product ON ((shared_url.product_url = meta_product.product_url)))
  GROUP BY shared_url.product_url, meta_product.meta, shared_url.client_id;


ALTER TABLE agg_shared_url_meta_client_by_product_js OWNER TO postgres;

--
-- TOC entry 215 (class 1259 OID 86036)
-- Name: agg_shared_url_order_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW agg_shared_url_order_js AS
 SELECT track.shared_url_id AS "sharedUrlId",
    "order"._id,
    "order".created_at AS "createdAt",
    "order".updated_at AS "updatedAt",
    "order".client_order_id AS "clientOrderId",
    "order".status,
    "order".total,
    "order".sub_total AS "subTotal",
    "order".currency,
    "order".client_id AS "clientId",
    "order".sharer_id AS "sharerId",
    "order".buyer_id AS "buyerId",
    "order".buyer_email AS "buyerEmail",
    "order".line_items AS "lineItems"
   FROM ("order" "order"
     JOIN ( SELECT shared_url_access.shared_url_id,
            track_1.ref AS client_order_id
           FROM (track track_1
             JOIN ( SELECT shared_url._id AS shared_url_id,
                    shared_url_access_1._id
                   FROM (shared_url shared_url
                     JOIN shared_url_access shared_url_access_1 ON ((shared_url._id = shared_url_access_1.shared_url_id)))) shared_url_access ON ((track_1.shared_url_access_id = shared_url_access._id)))
          WHERE (track_1.type = 'ORDER'::text)) track ON (("order".client_order_id = track.client_order_id)));


ALTER TABLE agg_shared_url_order_js OWNER TO postgres;

--
-- TOC entry 216 (class 1259 OID 86041)
-- Name: agg_shared_url_order_json_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW agg_shared_url_order_json_js AS
 SELECT "order"."sharedUrlId",
    jsonb_agg("order"."order") AS orders
   FROM ( SELECT shared_url_order."sharedUrlId",
            row_to_json(shared_url_order.*) AS "order"
           FROM ( SELECT agg_shared_url_order_js."sharedUrlId",
                    agg_shared_url_order_js._id,
                    agg_shared_url_order_js."createdAt",
                    agg_shared_url_order_js."updatedAt",
                    agg_shared_url_order_js."clientOrderId",
                    agg_shared_url_order_js.status,
                    agg_shared_url_order_js.total,
                    agg_shared_url_order_js."subTotal",
                    agg_shared_url_order_js.currency,
                    agg_shared_url_order_js."clientId",
                    agg_shared_url_order_js."sharerId",
                    agg_shared_url_order_js."buyerId",
                    agg_shared_url_order_js."buyerEmail",
                    agg_shared_url_order_js."lineItems"
                   FROM agg_shared_url_order_js) shared_url_order) "order"
  GROUP BY "order"."sharedUrlId";


ALTER TABLE agg_shared_url_order_json_js OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 86045)
-- Name: agg_shared_url_meta_client_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW agg_shared_url_meta_client_js AS
 SELECT shared_url._id,
    shared_url.created_at AS "createdAt",
    shared_url.updated_at AS "updatedAt",
    shared_url.user_id AS "userId",
    shared_url.client_id AS "clientId",
    shared_url.product_url AS "productUrl",
    shared_url.short_url AS "shortUrl",
    meta_product.meta,
    access.accesses,
    access.clicks,
    "order".orders,
    COALESCE(client_earning.earnings, 0.00) AS earnings
   FROM ((((shared_url shared_url
     LEFT JOIN ( SELECT shared_url_1._id,
            count(shared_url_access._id) AS clicks,
            jsonb_agg(( SELECT row_to_json(shared_url_access.*) AS row_to_json)) AS accesses
           FROM (shared_url shared_url_1
             JOIN shared_url_access_js shared_url_access ON ((shared_url_1._id = shared_url_access."sharedUrlId")))
          GROUP BY shared_url_1._id) access ON ((shared_url._id = access._id)))
     LEFT JOIN agg_shared_url_client_earning_js client_earning ON ((shared_url._id = client_earning."sharedUrlId")))
     LEFT JOIN agg_shared_url_order_json_js "order" ON ((shared_url._id = "order"."sharedUrlId")))
     LEFT JOIN meta_product meta_product ON ((shared_url.product_url = meta_product.product_url)));


ALTER TABLE agg_shared_url_meta_client_js OWNER TO postgres;

--
-- TOC entry 218 (class 1259 OID 86050)
-- Name: agg_shared_url_meta_client_v2_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW agg_shared_url_meta_client_v2_js AS
 SELECT shared_url._id,
    shared_url.created_at AS "createdAt",
    shared_url.updated_at AS "updatedAt",
    shared_url.user_id AS "userId",
    shared_url.client_id AS "clientId",
    shared_url.product_url AS "productUrl",
    shared_url.short_url AS "shortUrl",
    meta_product.meta,
    COALESCE(access.clicks, (0)::bigint) AS clicks,
    COALESCE("order".orders, (0)::bigint) AS orders,
    COALESCE(earnings.earnings, 0.00) AS earnings,
    COALESCE("order".orders, (0)::bigint) AS "cntOrders"
   FROM ((((shared_url shared_url
     LEFT JOIN ( SELECT shared_url_access.shared_url_id AS _id,
            count(*) AS clicks
           FROM shared_url_access
          GROUP BY shared_url_access.shared_url_id) access ON ((shared_url._id = access._id)))
     LEFT JOIN ( SELECT (order_1.meta ->> 'sharedUrlId'::text) AS shared_url_id,
            count(*) AS orders
           FROM "order" order_1
          GROUP BY (order_1.meta ->> 'sharedUrlId'::text)) "order" ON ((shared_url._id = "order".shared_url_id)))
     LEFT JOIN ( SELECT agg_shared_url_client_earning_v2_js."sharedUrlId",
            agg_shared_url_client_earning_v2_js.earnings
           FROM agg_shared_url_client_earning_v2_js) earnings ON ((shared_url._id = earnings."sharedUrlId")))
     LEFT JOIN meta_product meta_product ON ((shared_url.product_url = meta_product.product_url)));


ALTER TABLE agg_shared_url_meta_client_v2_js OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 86055)
-- Name: agg_shared_url_meta_user_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW agg_shared_url_meta_user_js AS
 SELECT shared_url._id,
    shared_url.created_at AS "createdAt",
    shared_url.updated_at AS "updatedAt",
    shared_url.user_id AS "userId",
    shared_url.client_id AS "clientId",
    shared_url.product_url AS "productUrl",
    shared_url.short_url AS "shortUrl",
    meta_product.meta,
    access.accesses,
    access.clicks,
    "order".orders,
    COALESCE(jsonb_array_length("order".orders), 0) AS "cntOrders",
    COALESCE(earning.earnings, 0.00) AS earnings
   FROM ((((shared_url shared_url
     LEFT JOIN ( SELECT shared_url_1._id,
            count(shared_url_access._id) AS clicks,
            jsonb_agg(( SELECT row_to_json(shared_url_access.*) AS row_to_json)) AS accesses
           FROM (shared_url shared_url_1
             LEFT JOIN shared_url_access_js shared_url_access ON ((shared_url_1._id = shared_url_access."sharedUrlId")))
          GROUP BY shared_url_1._id) access ON ((shared_url._id = access._id)))
     LEFT JOIN agg_shared_url_earning_js earning ON ((shared_url._id = earning."sharedUrlId")))
     LEFT JOIN agg_shared_url_order_json_js "order" ON ((shared_url._id = "order"."sharedUrlId")))
     LEFT JOIN meta_product meta_product ON ((shared_url.product_url = meta_product.product_url)));


ALTER TABLE agg_shared_url_meta_user_js OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 86060)
-- Name: agg_shared_url_order_v2_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW agg_shared_url_order_v2_js AS
 SELECT ("order".meta ->> 'sharedUrlId'::text) AS "sharedUrlId",
    "order"._id,
    "order".created_at AS "createdAt",
    "order".updated_at AS "updatedAt",
    "order".client_order_id AS "clientOrderId",
    "order".status,
    "order".total,
    "order".sub_total AS "subTotal",
    "order".currency,
    "order".client_id AS "clientId",
    "order".sharer_id AS "sharerId",
    "order".buyer_id AS "buyerId",
    "order".buyer_email AS "buyerEmail",
    "order".line_items AS "lineItems",
    "order".meta
   FROM "order" "order"
  WHERE (("order".meta ->> 'sharedUrlId'::text) <> ''::text);


ALTER TABLE agg_shared_url_order_v2_js OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 86064)
-- Name: agg_shared_url_order_json_v2_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW agg_shared_url_order_json_v2_js AS
 SELECT "order"."sharedUrlId",
    jsonb_agg("order"."order") AS orders
   FROM ( SELECT shared_url_order."sharedUrlId",
            row_to_json(shared_url_order.*) AS "order"
           FROM ( SELECT agg_shared_url_order_js."sharedUrlId",
                    agg_shared_url_order_js._id,
                    agg_shared_url_order_js."createdAt",
                    agg_shared_url_order_js."updatedAt",
                    agg_shared_url_order_js."clientOrderId",
                    agg_shared_url_order_js.status,
                    agg_shared_url_order_js.total,
                    agg_shared_url_order_js."subTotal",
                    agg_shared_url_order_js.currency,
                    agg_shared_url_order_js."clientId",
                    agg_shared_url_order_js."sharerId",
                    agg_shared_url_order_js."buyerId",
                    agg_shared_url_order_js."buyerEmail",
                    agg_shared_url_order_js."lineItems"
                   FROM agg_shared_url_order_v2_js agg_shared_url_order_js) shared_url_order) "order"
  GROUP BY "order"."sharedUrlId";


ALTER TABLE agg_shared_url_order_json_v2_js OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 86068)
-- Name: social_post; Type: TABLE; Schema: reverb; Owner: postgres
--

CREATE TABLE social_post (
    _id text DEFAULT generate_object_id() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id text NOT NULL,
    social_platform text NOT NULL,
    post_id text,
    image_id text,
    file_id text,
    shared_url_id text NOT NULL,
    message text
);


ALTER TABLE social_post OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 86077)
-- Name: social_post_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW social_post_js AS
 SELECT social_post._id,
    social_post.created_at AS "createdAt",
    social_post.updated_at AS "updatedAt",
    social_post.user_id AS "userId",
    social_post.social_platform AS "socialPlatform",
    social_post.post_id AS "postId",
    social_post.image_id AS "imageId",
    social_post.file_id AS "fileId",
    social_post.shared_url_id AS "sharedUrlId",
    social_post.message
   FROM social_post;


ALTER TABLE social_post_js OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 86081)
-- Name: agg_shared_url_post_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW agg_shared_url_post_js AS
 SELECT shared_url._id,
    shared_url.created_at AS "createdAt",
    shared_url.updated_at AS "updatedAt",
    shared_url.user_id AS "userId",
    shared_url.client_id AS "clientId",
    shared_url.product_url AS "productUrl",
    shared_url.short_url AS "shortUrl",
    post.posts
   FROM (shared_url shared_url
     JOIN ( SELECT shared_url_1._id,
            jsonb_agg(( SELECT row_to_json(social_post.*) AS row_to_json)) AS posts
           FROM (shared_url_js shared_url_1
             JOIN social_post_js social_post ON ((shared_url_1._id = social_post."sharedUrlId")))
          GROUP BY shared_url_1._id) post ON ((shared_url._id = post._id)));


ALTER TABLE agg_shared_url_post_js OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 86086)
-- Name: agg_shared_url_trending_products_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW agg_shared_url_trending_products_js AS
 SELECT shared_url._id,
    shared_url.created_at AS "createdAt",
    shared_url.updated_at AS "updatedAt",
    shared_url.user_id AS "userId",
    shared_url.client_id AS "clientId",
    shared_url.product_url AS "productUrl",
    shared_url.short_url AS "shortUrl",
    meta_product.meta,
    COALESCE(access.clicks, (0)::bigint) AS clicks,
    COALESCE("order".orders, (0)::bigint) AS orders,
    COALESCE(earnings.earnings, 0.00::numeric(15,6)) AS earnings,
    COALESCE("order".orders, (0)::bigint) AS "cntOrders",
    COALESCE((meta_product.meta ->> 'title'::text), shared_url.product_url) AS "productTitle",
    COALESCE((meta_product.meta ->> 'image'::text), NULL::text) AS "productImage",
        CASE COALESCE(access.clicks, (0)::bigint)
            WHEN 0 THEN (0)::numeric(15,6)
            ELSE ((COALESCE(earnings."displayEarnings", 0.00) / (access.clicks)::numeric))::numeric(15,6)
        END AS epc,
    COALESCE(earnings."displayEarnings", 0.00::numeric(15,6)) AS "displayEarnings",
    (row_number() OVER (PARTITION BY shared_url.client_id))::integer AS rno
   FROM (((((shared_url shared_url
     LEFT JOIN ( SELECT shared_url_access.shared_url_id AS _id,
            count(*) AS clicks
           FROM shared_url_access
          GROUP BY shared_url_access.shared_url_id) access ON ((shared_url._id = access._id)))
     LEFT JOIN ( SELECT (order_1.meta ->> 'sharedUrlId'::text) AS shared_url_id,
            count(*) AS orders
           FROM "order" order_1
          GROUP BY (order_1.meta ->> 'sharedUrlId'::text)) "order" ON ((shared_url._id = "order".shared_url_id)))
     LEFT JOIN ( SELECT agg_shared_url_earning_v2_js."sharedUrlId",
            agg_shared_url_earning_v2_js.earnings,
            agg_shared_url_earning_v2_js."displayEarnings"
           FROM agg_shared_url_earning_v2_js) earnings ON ((shared_url._id = earnings."sharedUrlId")))
     LEFT JOIN meta_product meta_product ON ((shared_url.product_url = meta_product.product_url)))
     LEFT JOIN client client ON ((shared_url.client_id = client._id)))
  WHERE ((client.name <> 'UNREGISTERED'::text) AND ((meta_product.meta ->> 'image'::text) IS NOT NULL))
  ORDER BY ((row_number() OVER (PARTITION BY shared_url.client_id))::integer), COALESCE(access.clicks, (0)::bigint) DESC;


ALTER TABLE agg_shared_url_trending_products_js OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 86091)
-- Name: track_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW track_js AS
 SELECT track._id,
    track.created_at AS "createdAt",
    track.updated_at AS "updatedAt",
    track.user_id AS "userId",
    track.client_id AS "clientId",
    track.shared_url_access_id AS "sharedUrlAccessId",
    track.type,
    track.ref,
    track.referer,
    track.ip_address AS "ipAddress",
    track.user_agent AS "userAgent"
   FROM track;


ALTER TABLE track_js OWNER TO postgres;

CREATE VIEW user_js AS
 SELECT "user"._id,
    "user".created_at AS "createdAt",
    "user".updated_at AS "updatedAt",
    "user".first_name AS "firstName",
    "user".last_name AS "lastName",
    "user".email,
    "user".password,
    "user".roles,
    "user".client_id AS "clientId",
    "user".primary_wallet AS "primaryWallet",
    "user".client_wallets AS "clientWallets",
    "user".verified_email AS "verifiedEmail",
    "user".image_id AS "imageId",
    "user".meta
   FROM "user";


ALTER TABLE user_js OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 86217)
-- Name: assoc_affiliate_merchant_client_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW assoc_affiliate_merchant_client_js AS
 SELECT assoc_affiliate_merchant_client._id,
    assoc_affiliate_merchant_client.created_at AS "createdAt",
    assoc_affiliate_merchant_client.updated_at AS "updatedAt",
    assoc_affiliate_merchant_client.meta,
    assoc_affiliate_merchant_client.affiliate_id AS "affiliateId",
    assoc_affiliate_merchant_client.merchant_id AS "merchantId",
    assoc_affiliate_merchant_client.client_id AS "clientId"
   FROM assoc_affiliate_merchant_client;


ALTER TABLE assoc_affiliate_merchant_client_js OWNER TO postgres;

--
-- TOC entry 295 (class 1259 OID 90482)
-- Name: assoc_campaigns_email_templates; Type: TABLE; Schema: reverb; Owner: postgres
--

CREATE TABLE assoc_campaigns_email_templates (
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    campaign_id text,
    email_tempate_id text,
    _id text DEFAULT generate_object_id() NOT NULL
);


ALTER TABLE assoc_campaigns_email_templates OWNER TO postgres;

--
-- TOC entry 293 (class 1259 OID 90468)
-- Name: email_template; Type: TABLE; Schema: reverb; Owner: postgres
--

CREATE TABLE email_template (
    _id text DEFAULT generate_object_id() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    name text,
    type text,
    external_template_id text,
    template_values jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE email_template OWNER TO postgres;

--
-- TOC entry 297 (class 1259 OID 90526)
-- Name: assoc_join_campaigns_email_templates_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW assoc_join_campaigns_email_templates_js AS
 SELECT assoc_campaigns_email_templates.campaign_id,
    et._id,
    et.created_at,
    et.updated_at,
    et.name,
    et.type,
    et.external_template_id,
    et.template_values
   FROM (assoc_campaigns_email_templates
     LEFT JOIN email_template et ON ((et._id = assoc_campaigns_email_templates.email_tempate_id)));


ALTER TABLE assoc_join_campaigns_email_templates_js OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 86221)
-- Name: auth_token; Type: TABLE; Schema: reverb; Owner: postgres
--

CREATE TABLE auth_token (
    _id text DEFAULT generate_object_id() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id text NOT NULL,
    type text NOT NULL,
    value text NOT NULL
);


ALTER TABLE auth_token OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 86230)
-- Name: auth_token_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW auth_token_js AS
 SELECT auth_token._id,
    auth_token.created_at AS "createdAt",
    auth_token.updated_at AS "updatedAt",
    auth_token.user_id AS "userId",
    auth_token.type,
    auth_token.value
   FROM auth_token;


ALTER TABLE auth_token_js OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 86104)
-- Name: campaign; Type: TABLE; Schema: reverb; Owner: postgres
--

CREATE TABLE campaign (
    _id text DEFAULT generate_object_id() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb,
    client_id text NOT NULL,
    type text DEFAULT 'discount'::text NOT NULL,
    sub_type text DEFAULT 'single'::text NOT NULL,
    value_type text DEFAULT 'percent'::text NOT NULL,
    value_amount numeric DEFAULT 0.00 NOT NULL,
    expiry timestamp with time zone,
    description text
);


ALTER TABLE campaign OWNER TO postgres;

--
-- TOC entry 246 (class 1259 OID 86234)
-- Name: campaign_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW campaign_js AS
 SELECT campaign._id,
    campaign.created_at AS "createdAt",
    campaign.updated_at AS "updatedAt",
    campaign.meta,
    campaign.client_id AS "clientId",
    campaign.type,
    campaign.sub_type AS "subType",
    campaign.value_type AS "valueType",
    campaign.value_amount AS "valueAmount",
    campaign.expiry,
    campaign.description
   FROM campaign;


ALTER TABLE campaign_js OWNER TO postgres;

--
-- TOC entry 296 (class 1259 OID 90514)
-- Name: campaigns_email_templates_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW campaigns_email_templates_js AS
 SELECT assoc_campaigns_email_templates.created_at AS "createdAt",
    assoc_campaigns_email_templates.updated_at AS "updatedAt",
    assoc_campaigns_email_templates.campaign_id AS "campaignId",
    assoc_campaigns_email_templates.email_tempate_id AS "emailTempateId"
   FROM assoc_campaigns_email_templates;


ALTER TABLE campaigns_email_templates_js OWNER TO postgres;

--
-- TOC entry 298 (class 1259 OID 93818)
-- Name: client_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW client_js AS
 SELECT client._id,
    client.created_at AS "createdAt",
    client.updated_at AS "updatedAt",
    client.name,
    client.location,
    client.email,
    client.referer,
    client.percent_commission AS "percentCommission",
    client.secret,
    client.image_id AS "imageId",
    client.share_bg_id AS "shareBgId",
    client.share_bg_enabled AS "shareBgEnabled",
    client.share_text AS "shareText",
    client.website,
    client.trading_name AS "tradingName",
    client.tags,
    client.meta,
    client.primary_contact_first_name AS "primaryContactFirstName",
    client.primary_contact_last_name AS "primaryContactLastName",
    client.primary_contact_email AS "primaryContactEmail",
    client.primary_contact_phone AS "primaryContactPhone",
    client.primary_contact_address_line_1 AS "primaryContactAddressLine1",
    client.primary_contact_address_line_2 AS "primaryContactAddressLine2",
    client.primary_contact_town_city AS "primaryContactTownCity",
    client.primary_contact_area_county AS "primaryContactAreaCounty",
    client.primary_contact_country AS "primaryContactCountry",
    client.primary_contact_post_code AS "primaryContactPostCode",
    client.billing_contact_first_name AS "billingContactFirstName",
    client.billing_contact_last_name AS "billingContactLastName",
    client.billing_contact_email AS "billingContactEmail",
    client.billing_contact_phone AS "billingContactPhone",
    client.billing_contact_address_line_1 AS "billingContactAddressLine1",
    client.billing_contact_address_line_2 AS "billingContactAddressLine2",
    client.billing_contact_town_city AS "billingContactTownCity",
    client.billing_contact_area_county AS "billingContactAreaCounty",
    client.billing_contact_country AS "billingContactCountry",
    client.billing_contact_post_code AS "billingContactPostCode"
   FROM client;


ALTER TABLE client_js OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 86118)
-- Name: discount_code; Type: TABLE; Schema: reverb; Owner: postgres
--

CREATE TABLE discount_code (
    _id text DEFAULT generate_object_id() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb,
    campaign_id text,
    text text NOT NULL,
    active boolean DEFAULT true NOT NULL
);


ALTER TABLE discount_code OWNER TO postgres;

--
-- TOC entry 247 (class 1259 OID 86242)
-- Name: discount_code_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW discount_code_js AS
 SELECT discount_code._id,
    discount_code.created_at AS "createdAt",
    discount_code.updated_at AS "updatedAt",
    discount_code.meta,
    discount_code.campaign_id AS "campaignId",
    discount_code.text,
    discount_code.active
   FROM discount_code;


ALTER TABLE discount_code_js OWNER TO postgres;

--
-- TOC entry 294 (class 1259 OID 90478)
-- Name: email_template_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW email_template_js AS
 SELECT email_template._id,
    email_template.created_at AS "createdAt",
    email_template.updated_at AS "updatedAt",
    email_template.name,
    email_template.type,
    email_template.external_template_id AS "externalTemplateId",
    email_template.template_values AS "templateValues"
   FROM email_template;


ALTER TABLE email_template_js OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 86246)
-- Name: external_revenue; Type: TABLE; Schema: reverb; Owner: postgres
--

CREATE TABLE external_revenue (
    _id text DEFAULT generate_object_id() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    total numeric(15,6),
    currency text,
    meta jsonb DEFAULT '{}'::jsonb,
    type text,
    reference text,
    source_id text,
    commission numeric(15,6)
);


ALTER TABLE external_revenue OWNER TO postgres;

--
-- TOC entry 291 (class 1259 OID 90420)
-- Name: external_revenue_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW external_revenue_js AS
 SELECT external_revenue._id,
    external_revenue.created_at AS "createdAt",
    external_revenue.updated_at AS "updatedAt",
    external_revenue.status,
    external_revenue.total,
    external_revenue.currency,
    external_revenue.meta,
    external_revenue.type,
    external_revenue.reference,
    external_revenue.source_id AS "sourceId",
    external_revenue.commission
   FROM external_revenue;


ALTER TABLE external_revenue_js OWNER TO postgres;

--
-- TOC entry 249 (class 1259 OID 86261)
-- Name: log_reverb_process; Type: TABLE; Schema: reverb; Owner: postgres
--

CREATE TABLE log_reverb_process (
    _id text DEFAULT generate_object_id() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    order_id text NOT NULL,
    status text NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL
);


ALTER TABLE log_reverb_process OWNER TO postgres;

--
-- TOC entry 250 (class 1259 OID 86271)
-- Name: log_reverb_process_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW log_reverb_process_js AS
 SELECT log_reverb_process._id,
    log_reverb_process.created_at AS "createdAt",
    log_reverb_process.updated_at AS "updatedAt",
    log_reverb_process.order_id AS "orderId",
    log_reverb_process.status,
    log_reverb_process.meta
   FROM log_reverb_process;


ALTER TABLE log_reverb_process_js OWNER TO postgres;

--
-- TOC entry 251 (class 1259 OID 86275)
-- Name: log_shared_url_access; Type: TABLE; Schema: reverb; Owner: postgres
--

CREATE TABLE log_shared_url_access (
    _id text DEFAULT generate_object_id() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    shared_url_id text NOT NULL,
    referer_website text,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    access_id text
);


ALTER TABLE log_shared_url_access OWNER TO postgres;

--
-- TOC entry 252 (class 1259 OID 86285)
-- Name: log_shared_url_access_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW log_shared_url_access_js AS
 SELECT log_shared_url_access._id,
    log_shared_url_access.created_at AS "createdAt",
    log_shared_url_access.updated_at AS "updatedAt",
    log_shared_url_access.shared_url_id AS "sharedUrlId",
    log_shared_url_access.referer_website AS "refererWebsite",
    log_shared_url_access.meta,
    log_shared_url_access.access_id AS "accessId"
   FROM log_shared_url_access;


ALTER TABLE log_shared_url_access_js OWNER TO postgres;

--
-- TOC entry 253 (class 1259 OID 86289)
-- Name: log_track_trigger; Type: TABLE; Schema: reverb; Owner: postgres
--

CREATE TABLE log_track_trigger (
    _id text DEFAULT generate_object_id() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL
);


ALTER TABLE log_track_trigger OWNER TO postgres;

--
-- TOC entry 254 (class 1259 OID 86299)
-- Name: log_track_trigger_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW log_track_trigger_js AS
 SELECT log_track_trigger._id,
    log_track_trigger.created_at AS "createdAt",
    log_track_trigger.updated_at AS "updatedAt",
    log_track_trigger.meta
   FROM log_track_trigger;


ALTER TABLE log_track_trigger_js OWNER TO postgres;

--
-- TOC entry 255 (class 1259 OID 86303)
-- Name: meta_product_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW meta_product_js AS
 SELECT meta_product._id,
    meta_product.created_at AS "createdAt",
    meta_product.updated_at AS "updatedAt",
    meta_product.product_url AS "productUrl",
    meta_product.meta
   FROM meta_product;


ALTER TABLE meta_product_js OWNER TO postgres;

--
-- TOC entry 256 (class 1259 OID 86307)
-- Name: oauth_code; Type: TABLE; Schema: reverb; Owner: postgres
--

CREATE TABLE oauth_code (
    _id text DEFAULT generate_object_id() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    value text NOT NULL,
    redirect_uri text NOT NULL,
    user_id text NOT NULL,
    client_id text NOT NULL
);


ALTER TABLE oauth_code OWNER TO postgres;

--
-- TOC entry 257 (class 1259 OID 86316)
-- Name: oauth_code_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW oauth_code_js AS
 SELECT oauth_code._id,
    oauth_code.created_at AS "createdAt",
    oauth_code.updated_at AS "updatedAt",
    oauth_code.value,
    oauth_code.redirect_uri AS "redirectUri",
    oauth_code.user_id AS "userId",
    oauth_code.client_id AS "clientId"
   FROM oauth_code;


ALTER TABLE oauth_code_js OWNER TO postgres;

--
-- TOC entry 258 (class 1259 OID 86320)
-- Name: oauth_token; Type: TABLE; Schema: reverb; Owner: postgres
--

CREATE TABLE oauth_token (
    _id text DEFAULT generate_object_id() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    value text NOT NULL,
    user_id text NOT NULL,
    client_id text NOT NULL
);


ALTER TABLE oauth_token OWNER TO postgres;

--
-- TOC entry 259 (class 1259 OID 86329)
-- Name: oauth_token_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW oauth_token_js AS
 SELECT oauth_token._id,
    oauth_token.created_at AS "createdAt",
    oauth_token.updated_at AS "updatedAt",
    oauth_token.value,
    oauth_token.user_id AS "userId",
    oauth_token.client_id AS "clientId"
   FROM oauth_token;


ALTER TABLE oauth_token_js OWNER TO postgres;

--
-- TOC entry 260 (class 1259 OID 86333)
-- Name: role; Type: TABLE; Schema: reverb; Owner: postgres
--

CREATE TABLE role (
    _id text DEFAULT generate_object_id() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL
);


ALTER TABLE role OWNER TO postgres;

--
-- TOC entry 261 (class 1259 OID 86342)
-- Name: role_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW role_js AS
 SELECT role._id,
    role.created_at AS "createdAt",
    role.updated_at AS "updatedAt",
    role.name
   FROM role;


ALTER TABLE role_js OWNER TO postgres;

--
-- TOC entry 262 (class 1259 OID 86346)
-- Name: route_permission; Type: TABLE; Schema: reverb; Owner: postgres
--

CREATE TABLE route_permission (
    _id text DEFAULT generate_object_id() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    route text NOT NULL,
    action text NOT NULL,
    roles jsonb DEFAULT '[]'::jsonb NOT NULL
);


ALTER TABLE route_permission OWNER TO postgres;

--
-- TOC entry 263 (class 1259 OID 86356)
-- Name: route_permission_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW route_permission_js AS
 SELECT route_permission._id,
    route_permission.created_at AS "createdAt",
    route_permission.updated_at AS "updatedAt",
    route_permission.route,
    route_permission.action,
    route_permission.roles
   FROM route_permission;


ALTER TABLE route_permission_js OWNER TO postgres;

--
-- TOC entry 264 (class 1259 OID 86360)
-- Name: social_auth; Type: TABLE; Schema: reverb; Owner: postgres
--

CREATE TABLE social_auth (
    _id text DEFAULT generate_object_id() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    token_value text NOT NULL,
    token_secret text,
    token_refresh text,
    expires timestamp with time zone NOT NULL,
    user_id text NOT NULL,
    social_platform text NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE social_auth OWNER TO postgres;

--
-- TOC entry 265 (class 1259 OID 86370)
-- Name: social_auth_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW social_auth_js AS
 SELECT social_auth._id,
    social_auth.created_at AS "createdAt",
    social_auth.updated_at AS "updatedAt",
    social_auth.token_value AS "tokenValue",
    social_auth.token_secret AS "tokenSecret",
    social_auth.token_refresh AS "tokenRefresh",
    social_auth.expires,
    social_auth.user_id AS "userId",
    social_auth.social_platform AS "socialPlatform",
    social_auth.meta
   FROM social_auth;


ALTER TABLE social_auth_js OWNER TO postgres;

--
-- TOC entry 266 (class 1259 OID 86374)
-- Name: social_info; Type: TABLE; Schema: reverb; Owner: postgres
--

CREATE TABLE social_info (
    _id text DEFAULT generate_object_id() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id text NOT NULL,
    first_name text,
    last_name text,
    birthday date,
    email email_address,
    location text,
    gender text,
    social_platform text NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE social_info OWNER TO postgres;

--
-- TOC entry 267 (class 1259 OID 86384)
-- Name: social_info_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW social_info_js AS
 SELECT social_info._id,
    social_info.created_at AS "createdAt",
    social_info.updated_at AS "updatedAt",
    social_info.user_id AS "userId",
    social_info.first_name AS "firstName",
    social_info.last_name AS "lastName",
    social_info.birthday,
    social_info.email,
    social_info.location,
    social_info.gender,
    social_info.social_platform AS "socialPlatform",
    social_info.meta
   FROM social_info;


ALTER TABLE social_info_js OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 86129)
-- Name: user_discount_code; Type: TABLE; Schema: reverb; Owner: postgres
--

CREATE TABLE user_discount_code (
    _id text DEFAULT generate_object_id() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb,
    user_id text NOT NULL,
    discount_code_id text NOT NULL
);


ALTER TABLE user_discount_code OWNER TO postgres;

--
-- TOC entry 268 (class 1259 OID 86388)
-- Name: user_discount_code_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW user_discount_code_js AS
 SELECT user_discount_code._id,
    user_discount_code.created_at AS "createdAt",
    user_discount_code.updated_at AS "updatedAt",
    user_discount_code.meta,
    user_discount_code.user_id AS "userId",
    user_discount_code.discount_code_id AS "discountCodeId"
   FROM user_discount_code;


ALTER TABLE user_discount_code_js OWNER TO postgres;

--
-- TOC entry 269 (class 1259 OID 86392)
-- Name: value_authtokentype; Type: TABLE; Schema: reverb; Owner: postgres
--

CREATE TABLE value_authtokentype (
    _id text DEFAULT generate_object_id() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    value text NOT NULL
);


ALTER TABLE value_authtokentype OWNER TO postgres;

--
-- TOC entry 270 (class 1259 OID 86401)
-- Name: value_authtokentype_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW value_authtokentype_js AS
 SELECT value_authtokentype._id,
    value_authtokentype.created_at AS "createdAt",
    value_authtokentype.updated_at AS "updatedAt",
    value_authtokentype.value
   FROM value_authtokentype;


ALTER TABLE value_authtokentype_js OWNER TO postgres;

--
-- TOC entry 273 (class 1259 OID 86418)
-- Name: value_orderstatus; Type: TABLE; Schema: reverb; Owner: postgres
--

CREATE TABLE value_orderstatus (
    _id text DEFAULT generate_object_id() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    value text NOT NULL
);


ALTER TABLE value_orderstatus OWNER TO postgres;

--
-- TOC entry 274 (class 1259 OID 86427)
-- Name: value_orderstatus_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW value_orderstatus_js AS
 SELECT value_orderstatus._id,
    value_orderstatus.created_at AS "createdAt",
    value_orderstatus.updated_at AS "updatedAt",
    value_orderstatus.value
   FROM value_orderstatus;


ALTER TABLE value_orderstatus_js OWNER TO postgres;

--
-- TOC entry 279 (class 1259 OID 86457)
-- Name: value_processstatus; Type: TABLE; Schema: reverb; Owner: postgres
--

CREATE TABLE value_processstatus (
    _id text DEFAULT generate_object_id() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    value text NOT NULL
);


ALTER TABLE value_processstatus OWNER TO postgres;

--
-- TOC entry 280 (class 1259 OID 86466)
-- Name: value_processstatus_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW value_processstatus_js AS
 SELECT value_processstatus._id,
    value_processstatus.created_at AS "createdAt",
    value_processstatus.updated_at AS "updatedAt",
    value_processstatus.value
   FROM value_processstatus;


ALTER TABLE value_processstatus_js OWNER TO postgres;

--
-- TOC entry 281 (class 1259 OID 86470)
-- Name: value_socialplatform; Type: TABLE; Schema: reverb; Owner: postgres
--

CREATE TABLE value_socialplatform (
    _id text DEFAULT generate_object_id() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    value text NOT NULL
);


ALTER TABLE value_socialplatform OWNER TO postgres;

--
-- TOC entry 282 (class 1259 OID 86479)
-- Name: value_socialplatform_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW value_socialplatform_js AS
 SELECT value_socialplatform._id,
    value_socialplatform.created_at AS "createdAt",
    value_socialplatform.updated_at AS "updatedAt",
    value_socialplatform.value
   FROM value_socialplatform;


ALTER TABLE value_socialplatform_js OWNER TO postgres;

--
-- TOC entry 283 (class 1259 OID 86483)
-- Name: value_tracktype; Type: TABLE; Schema: reverb; Owner: postgres
--

CREATE TABLE value_tracktype (
    _id text DEFAULT generate_object_id() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    value text NOT NULL
);


ALTER TABLE value_tracktype OWNER TO postgres;

--
-- TOC entry 284 (class 1259 OID 86492)
-- Name: value_tracktype_js; Type: VIEW; Schema: reverb; Owner: postgres
--

CREATE VIEW value_tracktype_js AS
 SELECT value_tracktype._id,
    value_tracktype.created_at AS "createdAt",
    value_tracktype.updated_at AS "updatedAt",
    value_tracktype.value
   FROM value_tracktype;

--
-- TOC entry 2739 (class 2606 OID 86527)
-- Name: _basetable_pkey; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY _basetable
    ADD CONSTRAINT _basetable_pkey PRIMARY KEY (_id);


--
-- TOC entry 2826 (class 2606 OID 86529)
-- Name: _value_authtokentype_pkey; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY value_authtokentype
    ADD CONSTRAINT _value_authtokentype_pkey PRIMARY KEY (_id);


--
-- TOC entry 2828 (class 2606 OID 86531)
-- Name: _value_authtokentype_value_unique; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY value_authtokentype
    ADD CONSTRAINT _value_authtokentype_value_unique UNIQUE (value);


--
-- TOC entry 2741 (class 2606 OID 86533)
-- Name: affiliate_module_unique; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY affiliate
    ADD CONSTRAINT affiliate_module_unique UNIQUE (module);


--
-- TOC entry 2743 (class 2606 OID 86535)
-- Name: affiliate_pkey; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY affiliate
    ADD CONSTRAINT affiliate_pkey PRIMARY KEY (_id);


--
-- TOC entry 2745 (class 2606 OID 86537)
-- Name: assoc_affiliate_merchant_client_affiliate_id_merchant_id_unique; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY assoc_affiliate_merchant_client
    ADD CONSTRAINT assoc_affiliate_merchant_client_affiliate_id_merchant_id_unique UNIQUE (affiliate_id, merchant_id);


--
-- TOC entry 2747 (class 2606 OID 86539)
-- Name: assoc_affiliate_merchant_client_pkey; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY assoc_affiliate_merchant_client
    ADD CONSTRAINT assoc_affiliate_merchant_client_pkey PRIMARY KEY (_id);


--
-- TOC entry 2868 (class 2606 OID 90539)
-- Name: assoc_campaigns_email_templates_pkey; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY assoc_campaigns_email_templates
    ADD CONSTRAINT assoc_campaigns_email_templates_pkey PRIMARY KEY (_id);


--
-- TOC entry 2792 (class 2606 OID 86541)
-- Name: auth_token_pkey; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY auth_token
    ADD CONSTRAINT auth_token_pkey PRIMARY KEY (_id);


--
-- TOC entry 2780 (class 2606 OID 86545)
-- Name: campaign_pkey; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY campaign
    ADD CONSTRAINT campaign_pkey PRIMARY KEY (_id);


--
-- TOC entry 2749 (class 2606 OID 86547)
-- Name: client_email_unique; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY client
    ADD CONSTRAINT client_email_unique UNIQUE (email);


--
-- TOC entry 2751 (class 2606 OID 86549)
-- Name: client_pkey; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY client
    ADD CONSTRAINT client_pkey PRIMARY KEY (_id);


--
-- TOC entry 2782 (class 2606 OID 86551)
-- Name: discount_code_pkey; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY discount_code
    ADD CONSTRAINT discount_code_pkey PRIMARY KEY (_id);


--
-- TOC entry 2794 (class 2606 OID 86553)
-- Name: external_revenue_pkey; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY external_revenue
    ADD CONSTRAINT external_revenue_pkey PRIMARY KEY (_id);


--
-- TOC entry 2798 (class 2606 OID 86555)
-- Name: log_reverb_process_pkey; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY log_reverb_process
    ADD CONSTRAINT log_reverb_process_pkey PRIMARY KEY (_id);


--
-- TOC entry 2800 (class 2606 OID 86557)
-- Name: log_shared_url_access_pkey; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY log_shared_url_access
    ADD CONSTRAINT log_shared_url_access_pkey PRIMARY KEY (_id);


--
-- TOC entry 2802 (class 2606 OID 86559)
-- Name: log_track_trigger_pkey; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY log_track_trigger
    ADD CONSTRAINT log_track_trigger_pkey PRIMARY KEY (_id);


--
-- TOC entry 2772 (class 2606 OID 86561)
-- Name: meta_product_pkey; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY meta_product
    ADD CONSTRAINT meta_product_pkey PRIMARY KEY (_id);


--
-- TOC entry 2774 (class 2606 OID 86563)
-- Name: meta_product_product_url_unique; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY meta_product
    ADD CONSTRAINT meta_product_product_url_unique UNIQUE (product_url);


--
-- TOC entry 2804 (class 2606 OID 86565)
-- Name: oauth_code_client_id_user_id_unique; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY oauth_code
    ADD CONSTRAINT oauth_code_client_id_user_id_unique UNIQUE (client_id, user_id);


--
-- TOC entry 2806 (class 2606 OID 86567)
-- Name: oauth_code_pkey; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY oauth_code
    ADD CONSTRAINT oauth_code_pkey PRIMARY KEY (_id);


--
-- TOC entry 2808 (class 2606 OID 86569)
-- Name: oauth_token_pkey; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY oauth_token
    ADD CONSTRAINT oauth_token_pkey PRIMARY KEY (_id);


--
-- TOC entry 2754 (class 2606 OID 86571)
-- Name: order_client_id_client_order_id_unique; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY "order"
    ADD CONSTRAINT order_client_id_client_order_id_unique UNIQUE (client_order_id, client_id);


--
-- TOC entry 2756 (class 2606 OID 86573)
-- Name: order_pkey; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY "order"
    ADD CONSTRAINT order_pkey PRIMARY KEY (_id);

--
-- TOC entry 2866 (class 2606 OID 90508)
-- Name: pk_id; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY email_template
    ADD CONSTRAINT pk_id PRIMARY KEY (_id);


--
-- TOC entry 2796 (class 2606 OID 86577)
-- Name: reference_source_id_uq; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY external_revenue
    ADD CONSTRAINT reference_source_id_uq UNIQUE (reference, source_id);


--
-- TOC entry 2810 (class 2606 OID 86579)
-- Name: role_name_unique; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY role
    ADD CONSTRAINT role_name_unique UNIQUE (name);


--
-- TOC entry 2812 (class 2606 OID 86581)
-- Name: role_pkey; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY role
    ADD CONSTRAINT role_pkey PRIMARY KEY (_id);


--
-- TOC entry 2814 (class 2606 OID 86583)
-- Name: route_permission_pkey; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY route_permission
    ADD CONSTRAINT route_permission_pkey PRIMARY KEY (_id);


--
-- TOC entry 2816 (class 2606 OID 86585)
-- Name: route_permission_route_action_unique; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY route_permission
    ADD CONSTRAINT route_permission_route_action_unique UNIQUE (route, action);


--
-- TOC entry 2763 (class 2606 OID 86587)
-- Name: shared_url_access_pkey; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY shared_url_access
    ADD CONSTRAINT shared_url_access_pkey PRIMARY KEY (_id);


--
-- TOC entry 2761 (class 2606 OID 86589)
-- Name: shared_url_pkey; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY shared_url
    ADD CONSTRAINT shared_url_pkey PRIMARY KEY (_id);


--
-- TOC entry 2818 (class 2606 OID 86591)
-- Name: social_auth_pkey; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY social_auth
    ADD CONSTRAINT social_auth_pkey PRIMARY KEY (_id);


--
-- TOC entry 2820 (class 2606 OID 86593)
-- Name: social_auth_user_id_social_platform_unique; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY social_auth
    ADD CONSTRAINT social_auth_user_id_social_platform_unique UNIQUE (user_id, social_platform);


--
-- TOC entry 2822 (class 2606 OID 86595)
-- Name: social_info_pkey; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY social_info
    ADD CONSTRAINT social_info_pkey PRIMARY KEY (_id);


--
-- TOC entry 2824 (class 2606 OID 86597)
-- Name: social_info_user_id_social_platform_unique; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY social_info
    ADD CONSTRAINT social_info_user_id_social_platform_unique UNIQUE (user_id, social_platform);


--
-- TOC entry 2778 (class 2606 OID 86599)
-- Name: social_post_pkey; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY social_post
    ADD CONSTRAINT social_post_pkey PRIMARY KEY (_id);


--
-- TOC entry 2776 (class 2606 OID 86601)
-- Name: track_pkey; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY track
    ADD CONSTRAINT track_pkey PRIMARY KEY (_id);


--
-- TOC entry 2769 (class 2606 OID 86604)
-- Name: transaction_pkey; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY transaction
    ADD CONSTRAINT transaction_pkey PRIMARY KEY (_id);


--
-- TOC entry 2784 (class 2606 OID 86606)
-- Name: user_discount_code_pkey; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY user_discount_code
    ADD CONSTRAINT user_discount_code_pkey PRIMARY KEY (_id);


--
-- TOC entry 2765 (class 2606 OID 86608)
-- Name: user_email_unique; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY "user"
    ADD CONSTRAINT user_email_unique UNIQUE (email);


--
-- TOC entry 2767 (class 2606 OID 86610)
-- Name: user_pkey; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY "user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (_id);

--
-- TOC entry 2834 (class 2606 OID 86616)
-- Name: value_orderstatus_pkey; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY value_orderstatus
    ADD CONSTRAINT value_orderstatus_pkey PRIMARY KEY (_id);


--
-- TOC entry 2836 (class 2606 OID 86618)
-- Name: value_orderstatus_value_unique; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY value_orderstatus
    ADD CONSTRAINT value_orderstatus_value_unique UNIQUE (value);

--
-- TOC entry 2846 (class 2606 OID 86628)
-- Name: value_processstatus_pkey; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY value_processstatus
    ADD CONSTRAINT value_processstatus_pkey PRIMARY KEY (_id);


--
-- TOC entry 2848 (class 2606 OID 86630)
-- Name: value_processstatus_value_unique; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY value_processstatus
    ADD CONSTRAINT value_processstatus_value_unique UNIQUE (value);


--
-- TOC entry 2850 (class 2606 OID 86632)
-- Name: value_socialplatform_pkey; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY value_socialplatform
    ADD CONSTRAINT value_socialplatform_pkey PRIMARY KEY (_id);


--
-- TOC entry 2852 (class 2606 OID 86634)
-- Name: value_socialplatform_value_unique; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY value_socialplatform
    ADD CONSTRAINT value_socialplatform_value_unique UNIQUE (value);


--
-- TOC entry 2854 (class 2606 OID 86636)
-- Name: value_tracktype_pkey; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY value_tracktype
    ADD CONSTRAINT value_tracktype_pkey PRIMARY KEY (_id);


--
-- TOC entry 2856 (class 2606 OID 86638)
-- Name: value_tracktype_value_unique; Type: CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY value_tracktype
    ADD CONSTRAINT value_tracktype_value_unique UNIQUE (value);

--
-- TOC entry 2752 (class 1259 OID 86649)
-- Name: idxbtree_order_meta_shared_url_id; Type: INDEX; Schema: reverb; Owner: postgres
--

CREATE INDEX idxbtree_order_meta_shared_url_id ON "order" USING btree (((meta ->> 'sharedUrlId'::text)));


--
-- TOC entry 2757 (class 1259 OID 86650)
-- Name: idxbtree_shared_url_client_id; Type: INDEX; Schema: reverb; Owner: postgres
--

CREATE INDEX idxbtree_shared_url_client_id ON shared_url USING btree (client_id);


--
-- TOC entry 2758 (class 1259 OID 86651)
-- Name: idxbtree_shared_url_short_url; Type: INDEX; Schema: reverb; Owner: postgres
--

CREATE INDEX idxbtree_shared_url_short_url ON shared_url USING btree (short_url);


--
-- TOC entry 2759 (class 1259 OID 86652)
-- Name: idxbtree_shared_url_user_id; Type: INDEX; Schema: reverb; Owner: postgres
--

CREATE INDEX idxbtree_shared_url_user_id ON shared_url USING btree (user_id);


--
-- TOC entry 2770 (class 1259 OID 90530)
-- Name: idxgin_metaproduct_meta_title; Type: INDEX; Schema: reverb; Owner: postgres
--

CREATE INDEX idxgin_metaproduct_meta_title ON meta_product USING gin (((meta ->> 'title'::text)) public.gin_trgm_ops);

--
-- TOC entry 2904 (class 2620 OID 86659)
-- Name: merge_order_meta; Type: TRIGGER; Schema: reverb; Owner: postgres
--

CREATE TRIGGER merge_order_meta BEFORE UPDATE ON "order" FOR EACH ROW EXECUTE PROCEDURE merge_order_meta();


--
-- TOC entry 2912 (class 2620 OID 86660)
-- Name: normalise_user_email; Type: TRIGGER; Schema: reverb; Owner: postgres
--

CREATE TRIGGER normalise_user_email BEFORE INSERT OR UPDATE ON "user" FOR EACH ROW EXECUTE PROCEDURE normalise_user_email();


--
-- TOC entry 2905 (class 2620 OID 86661)
-- Name: notify_new_order; Type: TRIGGER; Schema: reverb; Owner: postgres
--

CREATE TRIGGER notify_new_order AFTER INSERT ON "order" FOR EACH ROW EXECUTE PROCEDURE notify_new_order();


--
-- TOC entry 2909 (class 2620 OID 86662)
-- Name: notify_new_share; Type: TRIGGER; Schema: reverb; Owner: postgres
--

CREATE TRIGGER notify_new_share AFTER INSERT ON shared_url FOR EACH ROW EXECUTE PROCEDURE notify_new_share();


--
-- TOC entry 2913 (class 2620 OID 86663)
-- Name: notify_new_user; Type: TRIGGER; Schema: reverb; Owner: postgres
--

CREATE TRIGGER notify_new_user AFTER INSERT ON "user" FOR EACH ROW EXECUTE PROCEDURE notify_new_user('new user');


--
-- TOC entry 2906 (class 2620 OID 86664)
-- Name: order_sub_total_calc; Type: TRIGGER; Schema: reverb; Owner: postgres
--

CREATE TRIGGER order_sub_total_calc BEFORE INSERT OR UPDATE ON "order" FOR EACH ROW EXECUTE PROCEDURE order_sub_total_calc();


--
-- TOC entry 2907 (class 2620 OID 86665)
-- Name: set_order_commission; Type: TRIGGER; Schema: reverb; Owner: postgres
--

CREATE TRIGGER set_order_commission BEFORE INSERT OR UPDATE ON "order" FOR EACH ROW EXECUTE PROCEDURE set_order_commission();


--
-- TOC entry 2925 (class 2620 OID 86666)
-- Name: set_updated_timestamp; Type: TRIGGER; Schema: reverb; Owner: postgres
--

CREATE TRIGGER set_updated_timestamp BEFORE UPDATE ON auth_token FOR EACH ROW EXECUTE PROCEDURE set_updated_timestamp();


--
-- TOC entry 2903 (class 2620 OID 86667)
-- Name: set_updated_timestamp; Type: TRIGGER; Schema: reverb; Owner: postgres
--

CREATE TRIGGER set_updated_timestamp BEFORE UPDATE ON client FOR EACH ROW EXECUTE PROCEDURE set_updated_timestamp();


--
-- TOC entry 2926 (class 2620 OID 86668)
-- Name: set_updated_timestamp; Type: TRIGGER; Schema: reverb; Owner: postgres
--

CREATE TRIGGER set_updated_timestamp BEFORE UPDATE ON log_reverb_process FOR EACH ROW EXECUTE PROCEDURE set_updated_timestamp();


--
-- TOC entry 2927 (class 2620 OID 86669)
-- Name: set_updated_timestamp; Type: TRIGGER; Schema: reverb; Owner: postgres
--

CREATE TRIGGER set_updated_timestamp BEFORE UPDATE ON oauth_code FOR EACH ROW EXECUTE PROCEDURE set_updated_timestamp();


--
-- TOC entry 2928 (class 2620 OID 86670)
-- Name: set_updated_timestamp; Type: TRIGGER; Schema: reverb; Owner: postgres
--

CREATE TRIGGER set_updated_timestamp BEFORE UPDATE ON oauth_token FOR EACH ROW EXECUTE PROCEDURE set_updated_timestamp();


--
-- TOC entry 2908 (class 2620 OID 86671)
-- Name: set_updated_timestamp; Type: TRIGGER; Schema: reverb; Owner: postgres
--

CREATE TRIGGER set_updated_timestamp BEFORE UPDATE ON "order" FOR EACH ROW EXECUTE PROCEDURE set_updated_timestamp();


--
-- TOC entry 2929 (class 2620 OID 86672)
-- Name: set_updated_timestamp; Type: TRIGGER; Schema: reverb; Owner: postgres
--

CREATE TRIGGER set_updated_timestamp BEFORE UPDATE ON role FOR EACH ROW EXECUTE PROCEDURE set_updated_timestamp();


--
-- TOC entry 2930 (class 2620 OID 86673)
-- Name: set_updated_timestamp; Type: TRIGGER; Schema: reverb; Owner: postgres
--

CREATE TRIGGER set_updated_timestamp BEFORE UPDATE ON route_permission FOR EACH ROW EXECUTE PROCEDURE set_updated_timestamp();


--
-- TOC entry 2910 (class 2620 OID 86674)
-- Name: set_updated_timestamp; Type: TRIGGER; Schema: reverb; Owner: postgres
--

CREATE TRIGGER set_updated_timestamp BEFORE UPDATE ON shared_url FOR EACH ROW EXECUTE PROCEDURE set_updated_timestamp();


--
-- TOC entry 2911 (class 2620 OID 86675)
-- Name: set_updated_timestamp; Type: TRIGGER; Schema: reverb; Owner: postgres
--

CREATE TRIGGER set_updated_timestamp BEFORE UPDATE ON shared_url_access FOR EACH ROW EXECUTE PROCEDURE set_updated_timestamp();


--
-- TOC entry 2931 (class 2620 OID 86676)
-- Name: set_updated_timestamp; Type: TRIGGER; Schema: reverb; Owner: postgres
--

CREATE TRIGGER set_updated_timestamp BEFORE UPDATE ON social_auth FOR EACH ROW EXECUTE PROCEDURE set_updated_timestamp();


--
-- TOC entry 2932 (class 2620 OID 86677)
-- Name: set_updated_timestamp; Type: TRIGGER; Schema: reverb; Owner: postgres
--

CREATE TRIGGER set_updated_timestamp BEFORE UPDATE ON social_info FOR EACH ROW EXECUTE PROCEDURE set_updated_timestamp();


--
-- TOC entry 2921 (class 2620 OID 86678)
-- Name: set_updated_timestamp; Type: TRIGGER; Schema: reverb; Owner: postgres
--

CREATE TRIGGER set_updated_timestamp BEFORE UPDATE ON social_post FOR EACH ROW EXECUTE PROCEDURE set_updated_timestamp();


--
-- TOC entry 2920 (class 2620 OID 86679)
-- Name: set_updated_timestamp; Type: TRIGGER; Schema: reverb; Owner: postgres
--

CREATE TRIGGER set_updated_timestamp BEFORE UPDATE ON track FOR EACH ROW EXECUTE PROCEDURE set_updated_timestamp();


--
-- TOC entry 2918 (class 2620 OID 86680)
-- Name: set_updated_timestamp; Type: TRIGGER; Schema: reverb; Owner: postgres
--

CREATE TRIGGER set_updated_timestamp BEFORE UPDATE ON transaction FOR EACH ROW EXECUTE PROCEDURE set_updated_timestamp();


--
-- TOC entry 2914 (class 2620 OID 86681)
-- Name: set_updated_timestamp; Type: TRIGGER; Schema: reverb; Owner: postgres
--

CREATE TRIGGER set_updated_timestamp BEFORE UPDATE ON "user" FOR EACH ROW EXECUTE PROCEDURE set_updated_timestamp();

--
-- TOC entry 2933 (class 2620 OID 86683)
-- Name: set_updated_timestamp; Type: TRIGGER; Schema: reverb; Owner: postgres
--

CREATE TRIGGER set_updated_timestamp BEFORE UPDATE ON value_authtokentype FOR EACH ROW EXECUTE PROCEDURE set_updated_timestamp();


--
-- TOC entry 2934 (class 2620 OID 86684)
-- Name: set_updated_timestamp; Type: TRIGGER; Schema: reverb; Owner: postgres
--

CREATE TRIGGER set_updated_timestamp BEFORE UPDATE ON value_orderstatus FOR EACH ROW EXECUTE PROCEDURE set_updated_timestamp();


--
-- TOC entry 2935 (class 2620 OID 86685)
-- Name: set_updated_timestamp; Type: TRIGGER; Schema: reverb; Owner: postgres
--

CREATE TRIGGER set_updated_timestamp BEFORE UPDATE ON value_processstatus FOR EACH ROW EXECUTE PROCEDURE set_updated_timestamp();


--
-- TOC entry 2936 (class 2620 OID 86686)
-- Name: set_updated_timestamp; Type: TRIGGER; Schema: reverb; Owner: postgres
--

CREATE TRIGGER set_updated_timestamp BEFORE UPDATE ON value_socialplatform FOR EACH ROW EXECUTE PROCEDURE set_updated_timestamp();


--
-- TOC entry 2937 (class 2620 OID 86687)
-- Name: set_updated_timestamp; Type: TRIGGER; Schema: reverb; Owner: postgres
--

CREATE TRIGGER set_updated_timestamp BEFORE UPDATE ON value_tracktype FOR EACH ROW EXECUTE PROCEDURE set_updated_timestamp();

--
-- TOC entry 2919 (class 2620 OID 86690)
-- Name: set_updated_timestamp; Type: TRIGGER; Schema: reverb; Owner: postgres
--

CREATE TRIGGER set_updated_timestamp BEFORE UPDATE ON meta_product FOR EACH ROW EXECUTE PROCEDURE set_updated_timestamp();


--
-- TOC entry 2902 (class 2620 OID 86691)
-- Name: set_updated_timestamp; Type: TRIGGER; Schema: reverb; Owner: postgres
--

CREATE TRIGGER set_updated_timestamp BEFORE UPDATE ON _basetable FOR EACH ROW EXECUTE PROCEDURE set_updated_timestamp();


--
-- TOC entry 2915 (class 2620 OID 86692)
-- Name: set_user_default_meta; Type: TRIGGER; Schema: reverb; Owner: postgres
--

CREATE TRIGGER set_user_default_meta BEFORE INSERT ON "user" FOR EACH ROW EXECUTE PROCEDURE set_user_default_meta();

--
-- TOC entry 2917 (class 2620 OID 86694)
-- Name: update_user_password_meta; Type: TRIGGER; Schema: reverb; Owner: postgres
--

CREATE TRIGGER update_user_password_meta BEFORE UPDATE ON "user" FOR EACH ROW EXECUTE PROCEDURE update_user_password_meta();


--
-- TOC entry 2888 (class 2606 OID 86695)
-- Name: auth_token_type_fkey; Type: FK CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY auth_token
    ADD CONSTRAINT auth_token_type_fkey FOREIGN KEY (type) REFERENCES value_authtokentype(value);


--
-- TOC entry 2889 (class 2606 OID 86700)
-- Name: auth_token_user_id_fkey; Type: FK CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY auth_token
    ADD CONSTRAINT auth_token_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user"(_id) ON DELETE CASCADE;

--
-- TOC entry 2883 (class 2606 OID 86710)
-- Name: campaign_client_id_fkey; Type: FK CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY campaign
    ADD CONSTRAINT campaign_client_id_fkey FOREIGN KEY (client_id) REFERENCES client(_id);

--
-- TOC entry 2884 (class 2606 OID 86715)
-- Name: discount_code_campaign_id_fkey; Type: FK CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY discount_code
    ADD CONSTRAINT discount_code_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES campaign(_id);


--
-- TOC entry 2900 (class 2606 OID 90493)
-- Name: fk_campaign; Type: FK CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY assoc_campaigns_email_templates
    ADD CONSTRAINT fk_campaign FOREIGN KEY (campaign_id) REFERENCES campaign(_id);


--
-- TOC entry 2901 (class 2606 OID 90509)
-- Name: fk_email_template; Type: FK CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY assoc_campaigns_email_templates
    ADD CONSTRAINT fk_email_template FOREIGN KEY (email_tempate_id) REFERENCES email_template(_id);


--
-- TOC entry 2890 (class 2606 OID 86720)
-- Name: log_reverb_process_order_id_fkey; Type: FK CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY log_reverb_process
    ADD CONSTRAINT log_reverb_process_order_id_fkey FOREIGN KEY (order_id) REFERENCES "order"(_id);


--
-- TOC entry 2891 (class 2606 OID 86725)
-- Name: log_reverb_process_status_fkey; Type: FK CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY log_reverb_process
    ADD CONSTRAINT log_reverb_process_status_fkey FOREIGN KEY (status) REFERENCES value_processstatus(value);


--
-- TOC entry 2892 (class 2606 OID 86730)
-- Name: oauth_code_client_id_fkey; Type: FK CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY oauth_code
    ADD CONSTRAINT oauth_code_client_id_fkey FOREIGN KEY (client_id) REFERENCES client(_id) ON DELETE CASCADE;


--
-- TOC entry 2893 (class 2606 OID 86735)
-- Name: oauth_code_user_id_fkey; Type: FK CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY oauth_code
    ADD CONSTRAINT oauth_code_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user"(_id) ON DELETE CASCADE;


--
-- TOC entry 2894 (class 2606 OID 86740)
-- Name: oauth_token_client_id_fkey; Type: FK CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY oauth_token
    ADD CONSTRAINT oauth_token_client_id_fkey FOREIGN KEY (client_id) REFERENCES client(_id) ON DELETE CASCADE;


--
-- TOC entry 2895 (class 2606 OID 86745)
-- Name: oauth_token_user_id_fkey; Type: FK CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY oauth_token
    ADD CONSTRAINT oauth_token_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user"(_id) ON DELETE CASCADE;


--
-- TOC entry 2869 (class 2606 OID 86750)
-- Name: order_client_id_fkey; Type: FK CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY "order"
    ADD CONSTRAINT order_client_id_fkey FOREIGN KEY (client_id) REFERENCES client(_id);


--
-- TOC entry 2870 (class 2606 OID 86755)
-- Name: order_sharer_id_fkey; Type: FK CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY "order"
    ADD CONSTRAINT order_sharer_id_fkey FOREIGN KEY (sharer_id) REFERENCES "user"(_id);


--
-- TOC entry 2871 (class 2606 OID 86760)
-- Name: order_status_fkey; Type: FK CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY "order"
    ADD CONSTRAINT order_status_fkey FOREIGN KEY (status) REFERENCES value_orderstatus(value);

--
-- TOC entry 2872 (class 2606 OID 86775)
-- Name: shared_url_client_id_fkey; Type: FK CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY shared_url
    ADD CONSTRAINT shared_url_client_id_fkey FOREIGN KEY (client_id) REFERENCES client(_id);


--
-- TOC entry 2873 (class 2606 OID 86780)
-- Name: shared_url_user_id_fkey; Type: FK CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY shared_url
    ADD CONSTRAINT shared_url_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user"(_id) ON DELETE CASCADE;


--
-- TOC entry 2896 (class 2606 OID 86785)
-- Name: social_auth_social_platform_fkey; Type: FK CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY social_auth
    ADD CONSTRAINT social_auth_social_platform_fkey FOREIGN KEY (social_platform) REFERENCES value_socialplatform(value);


--
-- TOC entry 2897 (class 2606 OID 86790)
-- Name: social_auth_user_id_fkey; Type: FK CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY social_auth
    ADD CONSTRAINT social_auth_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user"(_id) ON DELETE CASCADE;


--
-- TOC entry 2898 (class 2606 OID 86795)
-- Name: social_info_social_platform_fkey; Type: FK CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY social_info
    ADD CONSTRAINT social_info_social_platform_fkey FOREIGN KEY (social_platform) REFERENCES value_socialplatform(value);


--
-- TOC entry 2899 (class 2606 OID 86800)
-- Name: social_info_user_id_fkey; Type: FK CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY social_info
    ADD CONSTRAINT social_info_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user"(_id);


--
-- TOC entry 2880 (class 2606 OID 86805)
-- Name: social_post_shared_url_id_fkey; Type: FK CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY social_post
    ADD CONSTRAINT social_post_shared_url_id_fkey FOREIGN KEY (shared_url_id) REFERENCES shared_url(_id);


--
-- TOC entry 2881 (class 2606 OID 86810)
-- Name: social_post_social_platform_fkey; Type: FK CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY social_post
    ADD CONSTRAINT social_post_social_platform_fkey FOREIGN KEY (social_platform) REFERENCES value_socialplatform(value);


--
-- TOC entry 2882 (class 2606 OID 86815)
-- Name: social_post_user_id_fkey; Type: FK CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY social_post
    ADD CONSTRAINT social_post_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user"(_id) ON DELETE CASCADE;


--
-- TOC entry 2879 (class 2606 OID 86820)
-- Name: track_type_fkey; Type: FK CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY track
    ADD CONSTRAINT track_type_fkey FOREIGN KEY (type) REFERENCES value_tracktype(value);

-- TOC entry 2874 (class 2606 OID 86840)
-- Name: user_client_id_fkey; Type: FK CONSTRAINT; Schema: reverb; Owner: postgres
--

ALTER TABLE ONLY "user"
    ADD CONSTRAINT user_client_id_fkey FOREIGN KEY (client_id) REFERENCES client(_id);

-- TOC entry 3134 (class 0 OID 0)
-- Dependencies: 10
-- Name: public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM postgres;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO PUBLIC;


-- Completed on 2018-03-09 18:07:54 GMT

--
-- PostgreSQL database dump complete
--

