const EError = require('eerror');

module.exports = {
	jsonParse(valuesToParse) {
		const parsingValuesKeys = Object.keys(valuesToParse);
		const resultObject = {};

		/* eslint-disable-next-line */
	for (const fildNameToParse of parsingValuesKeys) {
			try {
				resultObject[fildNameToParse] = JSON.parse(valuesToParse[fildNameToParse]);
			} catch (error) {
				throw new EError(`Cannot parse value: ${fildNameToParse}`).combine({
					name: 'ValidationError',
					error,
				});
			}
		}

		return resultObject;
	},
};
