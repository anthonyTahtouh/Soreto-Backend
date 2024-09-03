exports.up = function(knex) {

  let query = `
      
        CREATE TYPE reverb.CURRENCY_CODE AS ENUM (
            'AED','AFN','ALL','AMD','ANG','AOA','ARS','AUD','AWG','AZN','BAM','BBD','BDT','BGN','BHD','BIF',
            'BMD','BND','BOB','BOV','BRL','BSD','BTN','BWP','BYN','BZD','CAD','CDF','CHE','CHF','CHW',
            'CLF','CLP','CNY','COP','COU','CRC','CUC','CUP','CVE','CZK','DJF','DKK','DOP','DZD','EGP','ERN',
            'ETB','EUR','FJD','FKP','GBP','GEL','GHS','GIP','GMD','GNF','GTQ','GYD','HKD','HNL','HRK','HTG',
            'HUF','IDR','ILS','INR','IQD','IRR','ISK','JMD','JOD','JPY','KES','KGS','KHR','KMF','KPW',
            'KRW','KWD','KYD','KZT','LAK','LBP','LKR','LRD','LSL','LYD','MAD','MDL','MGA','MKD','MMK',
            'MNT','MOP','MRU','MUR','MVR','MWK','MXN','MXV','MYR','MZN','NAD','NGN','NIO','NOK','NPR','NZD',
            'OMR','PAB','PEN','PGK','PHP','PKR','PLN','PYG','QAR','RON','RSD','RUB','RWF','SAR','SBD','SCR',
            'SDG','SEK','SGD','SHP','SLL','SOS','SRD','SSP','STN','SVC','SYP','SZL','THB','TJS','TMT','TND',
            'TOP','TRY','TTD','TWD','TZS','UAH','UGX','USD','USN','UYI','UYU','UZS','VEF','VND','VUV','WST',
            'XAF','XCD','XDR','XOF','XPF','XSU','XUA','YER','ZAR','ZMW','ZWL' 
        );

        CREATE TABLE reverb.currency (
            "_id" text NOT NULL DEFAULT reverb.generate_object_id(),
            name TEXT not null,
            currency_sign TEXT not null,
            currency_code reverb.CURRENCY_CODE NOT NULL,
            CONSTRAINT currency_pkey PRIMARY KEY (_id),
            CONSTRAINT currency_code_unique UNIQUE (currency_code)
        );

        -- initial charge
        INSERT INTO reverb.currency ("name", "currency_sign", "currency_code") values 
        ('Euro', '€', 'EUR'),
        ('Pound', '£', 'GBP'),
        ('Dollar', '$', 'USD'),
        ('Australian dollar', '$', 'AUD');

        ALTER TABLE reverb.country
        ADD COLUMN currency_id TEXT REFERENCES reverb.currency("_id");

        UPDATE reverb.country c set currency_id = (SELECT "_id" FROM reverb.currency WHERE "name" = c."currency" LIMIT 1);

        DROP VIEW IF EXISTS reverb.agg_country_js;
        DROP VIEW IF EXISTS reverb.country_js;

        ALTER TABLE reverb.country 
        DROP COLUMN currency,
        DROP COLUMN currency_sign;

        -- views name
        select reverb.create_view_table_js('reverb.currency');
        select reverb.create_view_table_js('reverb.country');
      `;


  return knex.schema.raw(query);
};

exports.down = function(knex) {

  let query = `

        DROP VIEW IF EXISTS reverb.agg_country_js;
        DROP VIEW IF EXISTS reverb.country_js;

        ALTER TABLE reverb.country
        DROP COLUMN currency_id,
        ADD COLUMN currency text NOT NULL default 'Pound',
        ADD COLUMN currency_sign text NOT NULL default '£';

        DROP VIEW IF EXISTS reverb.currency_js;
        DROP TABLE reverb.currency;
        DROP TYPE reverb.CURRENCY_CODE;

        UPDATE 
            reverb.country 
        SET 
            currency = 'Euro', currency_sign = '€' 
        WHERE   
            "name" 
            IN ('France', 'Germany', 'Ireland', 'Other Europe');

        UPDATE reverb.country SET currency = 'Pound', currency_sign = '£' where "name" = 'Great Britain';
        UPDATE reverb.country SET currency = 'Dollar', currency_sign = '$' where "name" in ('United States', 'Global');
        UPDATE reverb.country SET currency = 'Australian dollar', currency_sign = '$' where "name" in ('Australia');

        -- views creation
        select reverb.create_view_table_js('reverb.country');
      `;

  return knex.schema.raw(query);

};
