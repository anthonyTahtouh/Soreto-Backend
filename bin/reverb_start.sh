# Start server with PM2
cd /home/ubuntu/deployments/reverb-backend
if [ "$DEPLOYMENT_GROUP_NAME" == 'dg-reverb-backend-staging' ]; then NODE_ENV='staging'; fi
if [ "$DEPLOYMENT_GROUP_NAME" == 'dg-reverb-backend-sandbox' ]; then NODE_ENV='sandbox'; fi
if [ "$DEPLOYMENT_GROUP_NAME" == 'dg-reverb-backend-prod' ]; then NODE_ENV='prod'; fi
pm2 startOrRestart runenv.json --env $NODE_ENV
