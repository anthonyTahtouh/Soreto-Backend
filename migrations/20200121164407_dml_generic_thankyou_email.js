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
        (  thankyou_email_template_type_id,
          'text',
          'Body Title',
          'Thank you for sharing ##client_name## with your friends',
          false,
          'BODY_TITLE'
        ),
        ( thankyou_email_template_type_id,
          'text',
          'Body Line 1',
          'As promised, you can get ##sharer_reward##  your next order by clicking the link below.',
          false,
          'BODY_LINE_1'
        ),
        ( thankyou_email_template_type_id,
          'text',
          'Body Line 2',
          'Thanks, ##client_name##',
          false,
          'BODY_LINE_2'
        ),
        ( thankyou_email_template_type_id,
          'text',
          'Body Line 3',
          null,
          false,
          'BODY_LINE_3'
        ),
        ( thankyou_email_template_type_id,
          'text',
          'Body Line 4',
          null,
          false,
          'BODY_LINE_4'
        ),
        ( thankyou_email_template_type_id,
          'text',
          'Body Line 5',
          null,
          false,
          'BODY_LINE_5'
        ),
        ( thankyou_email_template_type_id,
          'text',
          'Shared Url Link Button Text',
          'Get ##sharer_reward##',
          true,
          'SHARED_URL_LINK_BUTTON_TEXT'
        ),
        ( thankyou_email_template_type_id,
          'text',
          'Shared Url Link Button Text Color',
          '#FFFFFF',
          true,
          'SHARED_URL_LINK_BUTTON_TEXT_COLOR'
        ),
        ( thankyou_email_template_type_id,
          'text',
          'Shared Url Link Button Background Color',
          '#f54061',
          true,	
          'SHARED_URL_LINK_BUTTON_BACKGROUND_COLOR'
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
        'BODY_TITLE',
        'BODY_LINE_1',
        'BODY_LINE_2',
        'BODY_LINE_3',
        'BODY_LINE_4',
        'BODY_LINE_5',
        'SHARED_URL_LINK_BUTTON_TEXT',
          'SHARED_URL_LINK_BUTTON_TEXT_COLOR',
          'SHARED_URL_LINK_BUTTON_BACKGROUND_COLOR'
      );
    
    END $$;
  
  `;

  return knex.schema.raw(query);
}