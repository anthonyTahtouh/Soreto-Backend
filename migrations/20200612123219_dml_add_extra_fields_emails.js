export function up(knex) {
  var query = `
          
          DO $$ 
          DECLARE
              declare _after_purchase_email_template_type_id varchar;
              declare _thankyou_email_template_type_id varchar;
              declare _forward_email_template_type_id varchar;
          BEGIN 
              
              select _id from reverb.email_template_type where value = 'after-purchase-email' limit 1 INTO  _after_purchase_email_template_type_id;
              select _id from reverb.email_template_type where value = 'thankyou-email' limit 1 INTO  _thankyou_email_template_type_id;
              select _id from reverb.email_template_type where value = 'forward-email' limit 1 INTO  _forward_email_template_type_id;
              
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
                        
                    (_after_purchase_email_template_type_id, 'text','CTA border radius','9px', true, 'CTA_BORDER_RADIUS'),
                    (_after_purchase_email_template_type_id, 'text','[FOOTER] - Brand Rights Text','All rights reserved', false, 'FOOTER_BRAND_RIGHTS'),
                    (_after_purchase_email_template_type_id, 'text','[FOOTER] - Contact Us Link Text','Get In Touch', false, 'FOOTER_CONTACT_US_LINK_TEXT'),
                    (_after_purchase_email_template_type_id, 'text','[FOOTER] - Privacy Policy Link Text','Privacy Policy', false, 'FOOTER_PRIVACY_POLICY_LINK_TEXT'),
                    (_after_purchase_email_template_type_id, 'text','[HEADER] - Line Color',null, false, 'HEADER_LINE_COLOR'),
                    (_after_purchase_email_template_type_id, 'text','[HEADER] - Line Size',null, false, 'HEADER_LINE_SIZE'),
                    (_after_purchase_email_template_type_id, 'text','[BODY] - Bottom Line Color',null, false, 'BODY_BOTTOM_LINE_COLOR'),
                    (_after_purchase_email_template_type_id, 'text','[BODY] - Bottom Line Size',null, false, 'BODY_BOTTOM_LINE_SIZE'),

                    (_thankyou_email_template_type_id, 'text','CTA border radius','9px', true, 'CTA_BORDER_RADIUS'),
                    (_thankyou_email_template_type_id, 'text','[FOOTER] - Brand Rights Text','All rights reserved', false, 'FOOTER_BRAND_RIGHTS'),
                    (_thankyou_email_template_type_id, 'text','[FOOTER] - Contact Us Link Text','Get In Touch', false, 'FOOTER_CONTACT_US_LINK_TEXT'),
                    (_thankyou_email_template_type_id, 'text','[FOOTER] - Privacy Policy Link Text','Privacy Policy', false, 'FOOTER_PRIVACY_POLICY_LINK_TEXT'),
                    (_thankyou_email_template_type_id, 'text','[HEADER] - Line Color',null, false, 'HEADER_LINE_COLOR'),
                    (_thankyou_email_template_type_id, 'text','[HEADER] - Line Size',null, false, 'HEADER_LINE_SIZE'),
                    (_thankyou_email_template_type_id, 'text','[BODY] - Bottom Line Color',null, false, 'BODY_BOTTOM_LINE_COLOR'),
                    (_thankyou_email_template_type_id, 'text','[BODY] - Bottom Line Size',null, false, 'BODY_BOTTOM_LINE_SIZE'),

                    (_forward_email_template_type_id, 'text','CTA border radius','9px', true, 'CTA_BORDER_RADIUS'),
                    (_forward_email_template_type_id, 'text','[FOOTER] - Brand Rights Text','All rights reserved', false, 'FOOTER_BRAND_RIGHTS'),
                    (_forward_email_template_type_id, 'text','[FOOTER] - Contact Us Link Text','Get In Touch', false, 'FOOTER_CONTACT_US_LINK_TEXT'),
                    (_forward_email_template_type_id, 'text','[FOOTER] - Privacy Policy Link Text','Privacy Policy', false, 'FOOTER_PRIVACY_POLICY_LINK_TEXT'),
                    (_forward_email_template_type_id, 'text','[HEADER] - Line Color',null, false, 'HEADER_LINE_COLOR'),
                    (_forward_email_template_type_id, 'text','[HEADER] - Line Size',null, false, 'HEADER_LINE_SIZE'),
                    (_forward_email_template_type_id, 'text','[BODY] - Bottom Line Color',null, false, 'BODY_BOTTOM_LINE_COLOR'),
                    (_forward_email_template_type_id, 'text','[BODY] - Bottom Line Size',null, false, 'BODY_BOTTOM_LINE_SIZE')
                  ;
                
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
                
                DELETE 
                FROM 
                    reverb.key_email_template_type 
                where 
                    template_key in (

                        'CTA_BORDER_RADIUS'
                        ,'FOOTER_BRAND_RIGHTS'
                        ,'FOOTER_CONTACT_US_LINK_TEXT'
                        ,'FOOTER_PRIVACY_POLICY_LINK_TEXT'
                        ,'HEADER_LINE_COLOR'
                        ,'HEADER_LINE_SIZE'
                        ,'BODY_BOTTOM_LINE_COLOR'
                        ,'BODY_BOTTOM_LINE_SIZE'
                    );
                
            END $$;
              
        `;

  return knex.schema.raw(query);
}