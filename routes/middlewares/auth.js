const jwt = require('jsonwebtoken');
const logger = require('../../lib/logger');

module.exports = {
	async authUser(req, res, next) {
		try {
			const authHeader = req.headers.authorization;

			if (authHeader) {
				const token = authHeader.replace('Bearer ', '');

				const user = jwt.verify(token, process.env.ACCESS_SECRET);

				req.user = user;

				return next();
			}
			return res.sendStatus(401);
		} catch (error) {
			logger.error(error);
			if (error instanceof jwt.JsonWebTokenError) {
				return res.sendStatus(403);
			}
			return res.json({ error: 'Server Error' });
		}
	},
	async authAdmin(req, res, next) {
		try {
			const authHeader = req.headers.authorization;

			if (authHeader) {
				const token = authHeader.replace('Bearer ', '');

				const user = jwt.verify(token, process.env.ACCESS_SECRET);

				if (user.role !== 'admin') {
					throw new jwt.JsonWebTokenError();
				}

				req.user = user;

				return next();
			}
			return res.sendStatus(401);
		} catch (error) {
			logger.error(error);
			if (error instanceof jwt.JsonWebTokenError) {
				return res.sendStatus(403);
			}
			return res.json({ error: 'Server Error' });
		}
	},
};
