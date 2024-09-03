export function up(knex) {
  var query = `
  
    DO $$
 
        DECLARE
            declare thankyou_email_template_type_id varchar;
        BEGIN 
            
            select _id from reverb.email_template_type where value = 'thankyou-email' limit 1 INTO  thankyou_email_template_type_id;
            
            INSERT 
            INTO 
            reverb.key_email_template_type
            (
              email_template_type_id,
              input_type,
              "label",
              default_value,
              required,
              template_key
            )
            VALUES
            (
              thankyou_email_template_type_id,
              'text',
              'Body Section 2 Line 1',
              '',
              false,
              'BODY_SECTION_2_LINE_1'
            ),
            (
              thankyou_email_template_type_id,
              'text',
              'Body Section 2 Line 2',
              '',
              false,
              'BODY_SECTION_2_LINE_2'
            ),
            (
              thankyou_email_template_type_id,
              'text',
              'Body Section 2 Line 3',
              '',
              false,
              'BODY_SECTION_2_LINE_3'
            ),
            (
              thankyou_email_template_type_id,
              'text',
              'Body Section 2 Line 4',
              '',
              false,
              'BODY_SECTION_2_LINE_4'
            ),
            (
              thankyou_email_template_type_id,
              'text',
              'Body Section 2 Line 5',
              '',
              false,
              'BODY_SECTION_2_LINE_5'
            ),
            (  
              thankyou_email_template_type_id,
              'text',
              'Show Landing Page Navigation Button',
              'FALSE',
              false,
              'SHOW_LANDING_PAGE_NAVIGATION_BUTTON'
            ),
            ( 
              thankyou_email_template_type_id,
              'text',
              'Show Direct Share Section',
              'FALSE',
              false,
              'SHOW_DIRECT_SHARE_SECTION'
            );
        
    END $$;
  
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
  
    DO $$ 
    DECLARE
        declare thankyou_email_template_type_id varchar;
    BEGIN 
    
        select _id from reverb.email_template_type where value = 'thankyou-email' limit 1 INTO  thankyou_email_template_type_id;
        
        DELETE 
        FROM 
            reverb.key_email_template_type 
        where 
            email_template_type_id = thankyou_email_template_type_id
        AND
            template_key IN (
            'BODY_SECTION_2_LINE_1',    
            'BODY_SECTION_2_LINE_2',
            'BODY_SECTION_2_LINE_3',
            'BODY_SECTION_2_LINE_4',
            'BODY_SECTION_2_LINE_5',
            'SHOW_LANDING_PAGE_NAVIGATION_BUTTON',
            'SHOW_DIRECT_SHARE_SECTION'
            );
  
    END $$;
  
  `;

  return knex.schema.raw(query);
}