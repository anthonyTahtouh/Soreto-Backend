require('@babel/register');

// Update with your config settings.
module.exports = {
  client: 'postgresql',
  connection: {
    connectionString: 'postgres://postgres:soreto_dev_2024!@localhost:5432/reverb',
  },
  migrations: {
    tableName: 'migrations',
    schemaName: 'reverb'
  },
  seeds: {
    directory: 'post_migration_scripts',
  }
};
