[![Build Status](https://travis-ci.com/fabacus/reverb-backend.svg?token=xrT7sxpxYrmPB4bT7Q4W&branch=staging)](https://travis-ci.com/fabacus/reverb-backend)

# To run tests
Running tests creates a `reverb_test` database and runs tests on this test database.

* Run `npm test` This will start a local server and run tests against it as per [API docs](http://docs.reverbapi.apiary.io/#)

# Development environment setup

We are using VSCode and Heroku-cli on our development environment.

VScode: https://code.visualstudio.com/download

Heroku-cli: https://devcenter.heroku.com/articles/heroku-cli#download-and-install

To start a local environment run:

'npm install' to install npm libraries.

Ask for an .env file with standard variables and put at the root folder.

'heroku local' to start.

# DB Migration Scripts
The application uses Knex migration to maintain PostgreSQL schema manipulation.

The configuration file `knexfile.js` is located on the application root folder.
Migration files are located in the folder `migrations` at the root folder.

* Run `knex migrate:make migration_name` to create a new migration file.
* Run `knex migrate:latest` to update to the lastest schema version.
* Run `knex migrate:rollback` to rollback to a previous migration.

* Code block example on how to use RAW SQL script on a migration file:

```javascript
exports.up = function(knex, Promise) {
	var query = `
		CREATE TABLE ...
	`;
 	return knex.schema.raw(query);
};

exports.down = function(knex, Promise) {
	var query = `
		DROP TABLE ...
	`;
 	return knex.schema.raw(query);
};
```
