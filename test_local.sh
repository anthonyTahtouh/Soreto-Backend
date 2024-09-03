export NODE_ENV=test
export DB_TEST_URL=$(grep "\bDATABASE_URL_TEST\b" .env | cut -d '=' -f2)
export ANALYTICS_SEGMENT_WRITE_KEY=KJM31w0lEgxcNKCDFB0RgJjmY27Tl3mx
export DATABASE_URL=$(grep "\bDATABASE_URL_TEST\b" .env | cut -d '=' -f2)

POSTGRES_DOCKER_CONTAINER=$(grep POSTGRES_DOCKER_CONTAINER .env | cut -d '=' -f2)

docker cp db_pg_schema_test_local.sql $POSTGRES_DOCKER_CONTAINER:/db_pg_schema_test_local.sql && docker exec -ti $POSTGRES_DOCKER_CONTAINER psql -U postgres -f db_pg_schema_test_local.sql -h localhost

npm run update-db

npm run db-setup

npm run build

node service_meta.js &
export META_PID=$!
node service_worker.js &
export WORKER_PID=$!
node service_api.js &
export API_PID=$!
sleep 5

npm run test

kill $META_PID
kill $WORKER_PID
kill $API_PID

docker exec -ti $POSTGRES_DOCKER_CONTAINER psql -U postgres -c "drop database reverb_test" -h localhost
