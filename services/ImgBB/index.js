const axios = require('axios');
const querystring = require('querystring');
const Eerror = require('eerror');

class ImgBB {
	constructor(apiKey) {
		this.apiKey = apiKey;
	}

	async publishImageAndGetUrl(imageData) {
		try {
			const axiosData = querystring.stringify({
				key: this.apiKey,
				image: imageData.buffer.toString('base64'),
			});

			const response = await axios({
				url: 'https://api.imgbb.com/1/upload',
				data: axiosData,
				method: 'post',
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
			});

			const { data } = response;

			if (data.success !== true) {
				if (response.status >= 500) {
					throw new Eerror('Problem on ImgBB side').combine({
						data,
					});
				}

				throw new Eerror('Problem on our side').combine({
					data,
				});
			}

			return data.data.url;
		} catch (error) {
			throw new Eerror('Error with ImgBB').combine({ error });
		}
	}
}

module.exports = ImgBB;
