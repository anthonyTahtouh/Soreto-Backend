export function up(knex) {
  var query = `
  begin transaction;

    delete
    from
        reverb.social_post
    where
        shared_url_id in (
            select _id from reverb.shared_url where	client_id not in (
            '59382bada59c3c16a035f461',
            '5b85213353120bfd27aaeb10',
            '5b6d59b347e07d3bfab6de80',
            '5b3f361885f5283513505be3',
            '5b3b571b178c1421f02bbf8a',
            '58c90abf3be0713793ccee0b',
            '5b19178b7c50543293b6021d',
            '5b7abe527e2b37d4959fdf90',
            '5b85602d5aa21b14527fbbce',
            '5b8fea89fc9c311752e41fe8',
            '5b8544474d1d0f12714d4fa9',
            '5ae85ee0e3ce3d2fc34a025b',
            '5b87dde010fdc02b0907f886',
            '5b7c1674fa380d2b284c6cd9',
            '5bb778ea744a462e34240134',
            '5b2a6c52420c3c26e543b25a',
            '5bbe00c02da24c26c13a9305'
        ));


    delete from reverb.shared_url_access
    where
        shared_url_id in
        (select _id from reverb.shared_url where
        client_id not in (
            '59382bada59c3c16a035f461',
            '5b85213353120bfd27aaeb10',
            '5b6d59b347e07d3bfab6de80',
            '5b3f361885f5283513505be3',
            '5b3b571b178c1421f02bbf8a',
            '58c90abf3be0713793ccee0b',
            '5b19178b7c50543293b6021d',
            '5b7abe527e2b37d4959fdf90',
            '5b85602d5aa21b14527fbbce',
            '5b8fea89fc9c311752e41fe8',
            '5b8544474d1d0f12714d4fa9',
            '5ae85ee0e3ce3d2fc34a025b',
            '5b87dde010fdc02b0907f886',
            '5b7c1674fa380d2b284c6cd9',
            '5bb778ea744a462e34240134',
            '5b2a6c52420c3c26e543b25a',
            '5bbe00c02da24c26c13a9305'));

    delete
    from
        reverb.shared_url
    where
        client_id not in (
            '59382bada59c3c16a035f461',
            '5b85213353120bfd27aaeb10',
            '5b6d59b347e07d3bfab6de80',
            '5b3f361885f5283513505be3',
            '5b3b571b178c1421f02bbf8a',
            '58c90abf3be0713793ccee0b',
            '5b19178b7c50543293b6021d',
            '5b7abe527e2b37d4959fdf90',
            '5b85602d5aa21b14527fbbce',
            '5b8fea89fc9c311752e41fe8',
            '5b8544474d1d0f12714d4fa9',
            '5ae85ee0e3ce3d2fc34a025b',
            '5b87dde010fdc02b0907f886',
            '5b7c1674fa380d2b284c6cd9',
            '5bb778ea744a462e34240134',
            '5b2a6c52420c3c26e543b25a',
            '5bbe00c02da24c26c13a9305'
        );

    delete from reverb.log_reverb_process
    where order_id in (
    select _id
        from
            reverb.order
        where
            client_id not in (
                '59382bada59c3c16a035f461',
                '5b85213353120bfd27aaeb10',
                '5b6d59b347e07d3bfab6de80',
                '5b3f361885f5283513505be3',
                '5b3b571b178c1421f02bbf8a',
                '58c90abf3be0713793ccee0b',
                '5b19178b7c50543293b6021d',
                '5b7abe527e2b37d4959fdf90',
                '5b85602d5aa21b14527fbbce',
                '5b8fea89fc9c311752e41fe8',
                '5b8544474d1d0f12714d4fa9',
                '5ae85ee0e3ce3d2fc34a025b',
                '5b87dde010fdc02b0907f886',
                '5b7c1674fa380d2b284c6cd9',
                '5bb778ea744a462e34240134',
                '5b2a6c52420c3c26e543b25a',
                '5bbe00c02da24c26c13a9305'
            )
    );

    delete
    from
        reverb.order
    where
        client_id not in (
            '59382bada59c3c16a035f461',
            '5b85213353120bfd27aaeb10',
            '5b6d59b347e07d3bfab6de80',
            '5b3f361885f5283513505be3',
            '5b3b571b178c1421f02bbf8a',
            '58c90abf3be0713793ccee0b',
            '5b19178b7c50543293b6021d',
            '5b7abe527e2b37d4959fdf90',
            '5b85602d5aa21b14527fbbce',
            '5b8fea89fc9c311752e41fe8',
            '5b8544474d1d0f12714d4fa9',
            '5ae85ee0e3ce3d2fc34a025b',
            '5b87dde010fdc02b0907f886',
            '5b7c1674fa380d2b284c6cd9',
            '5bb778ea744a462e34240134',
            '5b2a6c52420c3c26e543b25a',
            '5bbe00c02da24c26c13a9305'
        );

    delete
    from
        reverb.user
    where
        client_id is not null and
        client_id not in (
            '59382bada59c3c16a035f461',
            '5b85213353120bfd27aaeb10',
            '5b6d59b347e07d3bfab6de80',
            '5b3f361885f5283513505be3',
            '5b3b571b178c1421f02bbf8a',
            '58c90abf3be0713793ccee0b',
            '5b19178b7c50543293b6021d',
            '5b7abe527e2b37d4959fdf90',
            '5b85602d5aa21b14527fbbce',
            '5b8fea89fc9c311752e41fe8',
            '5b8544474d1d0f12714d4fa9',
            '5ae85ee0e3ce3d2fc34a025b',
            '5b87dde010fdc02b0907f886',
            '5b7c1674fa380d2b284c6cd9',
            '5bb778ea744a462e34240134',
            '5b2a6c52420c3c26e543b25a',
            '5bbe00c02da24c26c13a9305'
        );

    delete
    from
        reverb.client
    where
        _id not in (
            '59382bada59c3c16a035f461',
            '5b85213353120bfd27aaeb10',
            '5b6d59b347e07d3bfab6de80',
            '5b3f361885f5283513505be3',
            '5b3b571b178c1421f02bbf8a',
            '58c90abf3be0713793ccee0b',
            '5b19178b7c50543293b6021d',
            '5b7abe527e2b37d4959fdf90',
            '5b85602d5aa21b14527fbbce',
            '5b8fea89fc9c311752e41fe8',
            '5b8544474d1d0f12714d4fa9',
            '5ae85ee0e3ce3d2fc34a025b',
            '5b87dde010fdc02b0907f886',
            '5b7c1674fa380d2b284c6cd9',
            '5bb778ea744a462e34240134',
            '5b2a6c52420c3c26e543b25a',
            '5bbe00c02da24c26c13a9305'
        );

    delete from reverb.affilinet_order;

    delete from reverb.assoc_affiliate_merchant_client
    where client_id not in (
        '59382bada59c3c16a035f461',
            '5b85213353120bfd27aaeb10',
            '5b6d59b347e07d3bfab6de80',
            '5b3f361885f5283513505be3',
            '5b3b571b178c1421f02bbf8a',
            '58c90abf3be0713793ccee0b',
            '5b19178b7c50543293b6021d',
            '5b7abe527e2b37d4959fdf90',
            '5b85602d5aa21b14527fbbce',
            '5b8fea89fc9c311752e41fe8',
            '5b8544474d1d0f12714d4fa9',
            '5ae85ee0e3ce3d2fc34a025b',
            '5b87dde010fdc02b0907f886',
            '5b7c1674fa380d2b284c6cd9',
            '5bb778ea744a462e34240134',
            '5b2a6c52420c3c26e543b25a',
            '5bbe00c02da24c26c13a9305'
    );

    delete
        from reverb.log_shared_url_access
        where shared_url_id not in (select _id from reverb.shared_url);

    delete
        from reverb.meta_product
        where product_url not in (select product_url from reverb.shared_url);

    commit transaction;
    `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
          `;
  return knex.schema.raw(query);
}