export function up(knex) {
  var query = `
            
        INSERT INTO reverb.email_template_type ("value", "name") values ('after-purchase-email', 'After Purchase Email');

        DO $$ 
        DECLARE
            declare _forward_email_template_type_id varchar;
        BEGIN 
            
            select _id from reverb.email_template_type where value = 'after-purchase-email' limit 1 INTO  _forward_email_template_type_id;
            
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
                      
                (  _forward_email_template_type_id,
                    'text',
                    'Client Name',
                    '##client_email##',
                    true,
                    'CLIENTNAME'
                ),  
                (  _forward_email_template_type_id,
                    'text',
                    'From Name',
                    '##client_email##',
                    true,
                    'FROMNAME'
                ),
                (  _forward_email_template_type_id,
                    'text',
                    'Client Email',
                    '##client_email##',
                    true,
                    'CLIENTEMAIL'
                ),
                (  _forward_email_template_type_id,
                    'text',
                    'Headline',
                    'Here’s your ##reward## from ##client_name##',
                    true,
                    'HEADLINE'
                ),
                (  _forward_email_template_type_id,
                    'text',
                    'Heading',
                    null,
                    false,
                    'HEADING'
                ),
                (  _forward_email_template_type_id,
                    'text',
                    'Logo Image URL',
                    null,
                    true,
                    'LOGO_IMAGE_URL'
                ),
                (  _forward_email_template_type_id,
                    'text',
                    'Banner Image URL',
                    null,
                    true,
                    'BANNER_IMAGE_URL'
                ),
                (  _forward_email_template_type_id,
                    'text',
                    'Body Title',
                    'Hey *|USERFIRSTNAME|*,',
                    false,
                    'BODY_TITLE'
                ),
                ( _forward_email_template_type_id,
                    'text',
                    'Body Line 1',
                    'Great news! Your friend has shopped at ##client_name## using your referral link.',
                    false,
                    'BODY_LINE_1'
                ),
                ( _forward_email_template_type_id,
                    'text',
                    'Body Line 2',
                    'As promised, your ##reward## is available below.',
                    false,
                    'BODY_LINE_2'
                ),
                ( _forward_email_template_type_id,
                    'text',
                    'Body Line 3',
                    'Thanks, ##client_name##',
                    false,
                    'BODY_LINE_3'
                ),
                ( _forward_email_template_type_id,
                    'text',
                    'Body Line 4',
                    '',
                    false,
                    'BODY_LINE_4'
                ),
                ( _forward_email_template_type_id,
                    'text',
                    'Body Line 5',
                    '',
                    false,
                    'BODY_LINE_5'
                ),
                ( _forward_email_template_type_id,
                    'text',
                    'Body Line 6',
                    '',
                    false,
                    'BODY_LINE_6'
                ),
                ( _forward_email_template_type_id,
                    'text',
                    'Body Line 7',
                    '',
                    false,
                    'BODY_LINE_7'
                ),
                ( _forward_email_template_type_id,
                    'text',
                    'Body Section 2 Line 1',
                    '',
                    false,
                    'BODY_SECTION_2_LINE_1'
                ),
                ( _forward_email_template_type_id,
                    'text',
                    'Body Section 2 Line 2',
                    '',
                    false,
                    'BODY_SECTION_2_LINE_2'
                ),
                ( _forward_email_template_type_id,
                    'text',
                    'Body Section 2 Line 3',
                    '',
                    false,
                    'BODY_SECTION_2_LINE_3'
                ),
                ( _forward_email_template_type_id,
                    'text',
                    'Body Section 2 Line 4',
                    '',
                    false,
                    'BODY_SECTION_2_LINE_4'
                ),
                ( _forward_email_template_type_id,
                    'text',
                    'Body Section 2 Line 5',
                    '',
                    false,
                    'BODY_SECTION_2_LINE_5'
                ),
                ( _forward_email_template_type_id,
                    'text',
                    'Voucher Url Link Button Text',
                    'Get your code',
                    true,
                    'VOUCHER_URL_LINK_BUTTON_TEXT'
                ),
                ( _forward_email_template_type_id,
                    'text',
                    'Voucher Url Link Button Text Color',
                    '#FFFFFF',
                    true,
                    'VOUCHER_URL_LINK_BUTTON_TEXT_COLOR'
                ),
                ( _forward_email_template_type_id,
                    'text',
                    'Voucher Url Link Button Background Color',
                    '#f54061',
                    true,	
                    'VOUCHER_URL_LINK_BUTTON_BACKGROUND_COLOR'
                );
              
          END $$;  
            
    `;

  return knex.schema.raw(query);
}

export function down(knex) {

  var query = `
            
          DO $$ 
          DECLARE
              declare _forward_email_template_type_id varchar;
          BEGIN 
              
              select _id from reverb.email_template_type where value = 'after-purchase-email' limit 1 INTO  _forward_email_template_type_id;
              
              DELETE 
              FROM 
              reverb.key_email_template_type 
              where 
              email_template_type_id = _forward_email_template_type_id;
          
              DELETE FROM reverb.assoc_campaigns_email_templates WHERE email_template_id IN (SELECT _id from reverb.email_template WHERE email_template_type_id = _forward_email_template_type_id);
              DELETE FROM reverb.email_template WHERE email_template_type_id = _forward_email_template_type_id;
              DELETE FROM reverb.email_template_type where _id = _forward_email_template_type_id;
              
          END $$;
            
      `;

  return knex.schema.raw(query);
}