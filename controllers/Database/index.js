const mongoose = require('mongoose');

class Database {
    constructor(logger, uri, opts) {
        if (! uri) {
            throw new Error('Database:: uri not provided');
        }

        this.logger = logger;
        this.options = opts;
        this.connection = mongoose.connection;
        this.uri = uri;

        this.connection
            .on('connected', () => {
                logger.debug(`Mongoose connected!`);
            })
            .on('disconnected', () => {
                logger.debug(`Mongoose disconnected`);
            })
            .on('error', error => {
                logger.error({
                    message: `Mongoose connection error!`,
                    error,
                });
                setTimeout(() => {
                    process.exit(1);
                }, 100);
            });
    }

    async connect() {
		this.logger.debug('Start connecting to mongodb!');
		return mongoose.connect(this.uri, this.options);
	}

    disconnect(force = false) {
        this.connection.disconnect(force);
    }

    /**
	 * @param {String} schemaName
	 * @param {String} path
	 * @return {Model}
    */
	createModel(schemaName, path) {
		const schema = require(path);
		const model = this.connection.model(schemaName, schema);
		process.emit('ModelCreation', schemaName, model);
		process.emit(`ModelCreation.${schemaName}`, model);
		return model;
	}
}

module.exports = Database;
