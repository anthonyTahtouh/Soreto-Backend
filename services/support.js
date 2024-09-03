var db = require('../db_pg');
var dbError = require('../common/dbError');

module.exports = {
  getUserTrackingFlow: async function(email) {
    const suArray = await db('reverb.agg_user_tracking_flow_js').returning('*').where({user_email: email.toLowerCase()});
    const clientMap = new Map();

    if(suArray){

      suArray.forEach(data => {
        const clientName = data.client_name;
        const clientId = data.client_id;

        if(clientName){


          let client = clientMap.get(clientName);
          if(!client){
            client = {clientName, clientId, su:new Map()};
          }
          if(data.su_id){


            let su = client.su.get(data.su_id);

            if(!su){
              const {su_id, su_creation, su_gen_order_id, su_type, su_ip,su_useragent, su_short_url, cpv_name} = data;
              su = {_id: su_id, created_at: su_creation,
                cv_alias: cpv_name,
                type: su_type,
                source_client_order_id: su_gen_order_id,
                ipAddress: su_ip,
                userAgent: su_useragent,
                short_url: su_short_url,
                suas: new Map(),
              };
            }

            if(data.sua_id){

              let sua = su.suas.get(data.sua_id);
              if(!sua){
                const {sua_id, sua_access_date, sua_ip,sua_useragent} = data;
                sua = {_id: sua_id,
                  created_at: sua_access_date,
                  ipAddress: sua_ip,
                  userAgent: sua_useragent,
                  orders: [],
                  external_orders: []};
              }

              if(data.client_order_id){
                const {client_order_creation, client_order_id, client_order_status, client_order_ip, client_order_useragent, client_order_shared_url_access_id} = data;
                const order = {
                  created_at: client_order_creation,
                  status: client_order_status,
                  client_order_id: client_order_id,
                  sharedUrlId: client_order_shared_url_access_id,
                  ipAdress: client_order_ip,
                  userAgent: client_order_useragent,
                };
                sua.orders.push(order);
              }

              if(data.external_client_order_creation){
                const { external_client_order_creation, external_client_order_id, external_client_order_status, external_client_order_ip, external_client_order_useragent, external_client_order_shared_url_access_id} = data;

                const external_order = {created_at: external_client_order_creation,
                  status: external_client_order_status,
                  client_order_id: external_client_order_id,
                  sharedUrlId: external_client_order_shared_url_access_id,
                  ipAdress: external_client_order_ip,
                  userAgent: external_client_order_useragent
                };

                sua.external_orders.push(external_order);
              }
              su.suas.set(data.sua_id, sua);
            }


            client.su.set(data.su_id, su);
          }
          clientMap.set(clientName, client);
        }
      });
    }

    const userTrackingFlow = Array.from(clientMap.values());
    userTrackingFlow.forEach(utf => {
      utf.su = Array.from(utf.su.values());
      utf.su.forEach(su => {
        su.suas = Array.from(su.suas.values());
      });
    });

    const clientGrouppedArray = Array.from(userTrackingFlow);
    return clientGrouppedArray;
  },

  orderTracking: async function(clientOrderId, source) {
    let order;

    const mappper = {
      external: 'reverb.agg_external_order_tracking_flow_js',
      internal: 'reverb.agg_order_tracking_flow_js',
      external_untracked: 'reverb.agg_external_order_untracked_tracking_flow_js',
      audit: 'reverb.agg_client_order_tracking_flow_js'
    };

    order = await db(mappper[source])
      .returning('*')
      .where({clientOrderId});
    return order;
  },

  getOrderTrackingFlow: async function (clientOrderId,source) {

    try {
      const select = await this.orderTracking(clientOrderId,source);

      return {select};

    } catch (error) {
      throw dbError(error, `Error`);
    }
  },
};
