/* eslint-disable */
const DAMP_LIST = ['data', 'err', 'error', 'errors', 'problems'];

// Список не допустимых имен полей на первом уровне.
const DENY_LIST = [
	'time', 'name', 'pid', 'level', 'hostname', 'v', 'msg', 'source',
	'reqIP', 'reqId', 'reqUrl', 'reqUserAgent', 'route', 'reqReferrer', 'sessionUserId', 'sessionSiteId',
];

// Недопустимому полю будет добавлен префикс
const DENY_KEY_PREFIX = 'd_';

const
	path = require('path');
const util = require('util');
const crypto = require('crypto');
const EventEmitter = require('events');

const
	bunyan = require('bunyan');

const
	workDir = `${process.cwd()}/`;

const
	MAX_DEPTH_ERROR = 10;

/**
 * @typedef {object} Logger~Options
 *
 * @property {string} appName Имя приложения. По умолчанию: часть пути от CWD + имя скрипта. К примеру bin/exec.js
 * @property {number} sourceDepth Глубина стека вызова логера. Для правленого определения источника вызова.
 *
 * @property {string} baseDir Основная директория, где будут лежать логи
 *
 * @property {string|null} fileNameInfo Имя файла общего лога
 * @property {string|null} fileNameError Имя файла лога с ошибками
 * @property {string|null} fileNameDebug Имя файла с отладочным логом
 * @property {number} maxDepthFile максимальная глубина вложение объектов при выводе в файл
 *
 * @property {boolean} duplicateConsole Дублировать логи на stdout (debug) и stderr (error)
 * @property {number} maxDepthConsole максимальная глубина вложение объектов при выводе на консоль
 * @property {boolean} showSysInfo Выводить дополнительно на консоль системную информацию
 */
/** @type {Logger~Options} */
const defaultOptions = {
	appName: process.mainModule ? process.mainModule.filename.replace(workDir, '') : 'testing',
	sourceDepth: 2,

	baseDir: 'log',

	fileNameInfo: 'info.log.json',
	fileNameError: 'error.log.json',
	fileNameDebug: 'debug.log.json',

	maxDepthFile: 10,

	duplicateConsole: true,
	maxDepthConsole: 4,

	showSysInfo: true,
};

/**
 * Цветовые настройки
 * @type {object}
 */
const colorConfig = {
	default: '\x1b[0m',

	// Цвет даты
	date: (date) => `\x1b[1;30m${date}\x1b[0m`,

	info: {
		level: (level) => `\x1b[37;42m${level[0]}\x1b[0m`, // Белые буквы, зеленый фон
		source: (source) => `\x1b[32;40m${source}\x1b[0m`, // Зеленые буквы, черный фон
	},
	warn: {
		level: (level) => `\x1b[37;43m${level[0]}\x1b[0m`, // Белые буквы, желтый фон
		source: (source) => `\x1b[33;40m${source}\x1b[0m`, // Желтые буквы, черный фон
	},
	error: {
		level: (level) => `\x1b[37;41m${level[0]}\x1b[0m`, // Белые буквы, крысный фон
		source: (source) => `\x1b[31;40m${source}\x1b[0m`, // Крысный буквы, черный фон
	},
	debug: {
		level: (level) => `\x1b[37;45m${level[0]}\x1b[0m`, // Белые буквы, пурпурный фон
		source: (source) => `\x1b[35;40m${source}\x1b[0m`, // Пурпурные буквы, черный фон
	},

	object: {
		// Отступ для многострочных (вида "\n| ") С чередованием цвета вертикальной черты
		indent: (alt) => (alt ? '\n\x1b[1;37m¦\x1b[0m ' : '\n\x1b[37m|\x1b[0m '),
		// Цвет ключа объекта с чередованием цвета
		key: (key, alt) => (alt ? `\x1b[36m${key}\x1b[0m` : `\x1b[1;36m${key}\x1b[0m`),
		// Системный тип данных
		system: (val) => `\x1b[33m${val}\x1b[0m`,
	},
};

/* -- Вспомогательные функции --*/

/**
 * Строковое представление даты без года.
 * @param {Date} dt
 * @return {string} Пример 09.28 15:30:01
 */
function dateToStr(dt) {
	const leadingZero = (n) => (n < 10 ? '0' : '') + n;

	return (
		// ${dt.getFullYear()}-
		`${leadingZero(dt.getMonth() + 1)}.${leadingZero(dt.getDate())}`
		+ ` ${leadingZero(dt.getHours())}:${leadingZero(dt.getMinutes())}:${leadingZero(dt.getSeconds())}`
	);
}

let objectToStr;

/**
 * Конвертировать переменную в строку с выделением цветом системных типов
 * @param {*} value
 * @param {number} maxDepth Максимальная глубина вложения объектов
 * @param {number} depth Текущая глубина вложение
 * @return {string}
 */
function variableToStr(value, maxDepth, depth) {
	switch (typeof value) {
	case 'undefined':
		return `[${colorConfig.object.system('undefined')}]`;
	case 'number':
	case 'boolean':
		return value.toString();
	case 'string':
		return value;
	case 'function':
		return `[${colorConfig.object.system('Function')}]`;
	case 'object':
		return objectToStr(value, maxDepth, depth + 1);
	default:
		return `${value}`;
	}
}

/**
 * Конвертировать object в строку с выделением цветом системных типов
 * @param {object} obj
 * @param {number} maxDepth Максимальная глубина вложения объектов
 * @param {number} [depth] Текущая глубина вложение
 * @return {string}
 */
objectToStr = function (obj, maxDepth, depth) {
	if (typeof obj !== 'object') return '';

	if (obj === null) return `[${colorConfig.object.system('null')}]`;
	if (obj instanceof Date) return `[${colorConfig.object.system('Date')} ${dateToStr(obj)} ]`;
	if (obj instanceof RegExp) return `[${colorConfig.object.system('RegExp')} ${obj.toString()} ]`;
	if (obj instanceof Promise) return `[${colorConfig.object.system('Promise')}]`;
	if (obj._bsontype === 'ObjectID') return `[${colorConfig.object.system('ObjectID')} ${obj.toString()} ]`;

	depth = depth || 0;
	if (depth >= maxDepth + 1) return `[${colorConfig.object.system('Object')}]`;

	let upErrorName = false;

	if (obj instanceof Error) {
		// Хак чтоб в стек трейсе не было в заголовке многострочного текста
		const
			msg = obj.message;
		delete obj.message;

		const
			{ name } = obj;
			// Убрать первую строку и убрать лишнии пробелы в начале строк
		const stack = (obj.stack || '')
			.replace(/^.*?\n/, '')
			.replace(/^\s*at\s*/mg, '');
		obj[name] = msg;
		obj.stack = stack;

		upErrorName = name;

		maxDepth = MAX_DEPTH_ERROR; // Чтоб ошибка полностью развернулась
	}

	const
		keys = Object.getOwnPropertyNames(obj);

	const alt = depth % 2;
	const indent = colorConfig.object.indent(alt);

	// Поставить имя ошибки в начало списка, чтоб оно вывелось первым
	if (upErrorName) {
		const
			index = keys.indexOf(upErrorName);
		const tmp = keys[0];

		keys[0] = keys[index];
		keys[index] = tmp;
	}

	const lines = [];

	for (const key of keys) {
		let value = variableToStr(obj[key], maxDepth, depth);

		// Если строковое представление переменной многострочное:
		// Заменить все переносы на "перенос + отступ"
		if (/\n/.test(value)) {
			value = indent + value.replace(/\n/g, indent);
		}

		const line = `${colorConfig.object.key(key, alt)}: ${value}`;

		lines.push(line);
	}

	return lines.join('\n');
};

/**
 * Вывести в stream отформатированный дамп объекта
 * Формат :
 * [date] [level] [source] [msg]
 * [data]
 *  | key1 : value
 *  | key2 : value
 *
 * @param {Writable} stream
 * @param {'info'|'error'|'debug'} level
 * @param {string} source
 * @param {string} msg
 * @param {object|object[]} data
 * @param {number} [maxDepth=1] Максимальная глубина вложения объектов
 * @param {function} [cb]
 */
function writeToStream(stream, level, source, msg, data, maxDepth, cb) {
	maxDepth = maxDepth > 0 ? maxDepth : 3;

	const
		now = new Date();

	const caption =			`${colorConfig[level].level(level)}`
			+ ` ${colorConfig.date(dateToStr(now))} `
			+ `${colorConfig[level].source(source)}`;

	const indent = colorConfig.object.indent();

	const payload = [];

	if (!Array.isArray(data)) {
		data = data ? [data] : [];
	}

	for (const obj of data) {
		payload.push(indent + variableToStr(obj, maxDepth, 0).replace(/\n/g, indent));
	}

	stream.write(`${caption} ${msg} ${payload.join('\n|––––')} \n`, cb);
}

/**
 * Копирует все поля из obj в новый обьект преобразуя в строки.
 * Исключение являются ошибки. Их поля мы разворачиваем
 * @param {object} obj
 * @param {number} maxDepth Максимальная глубина вложения объектов
 * @param {string[]} [warnings] Серия предупреждений
 * @param {number} [depth=0] Текущая глубина вложение
 * @return {object}
 */
function objFieldsToStr(obj, maxDepth, warnings, depth) {
	const result = {};

	depth = depth || 0;
	warnings = warnings || [];

	const keys = Object.getOwnPropertyNames(obj);

	for (let key of keys) {
		let value = obj[key];

		// На первом уровне нельзя использовать зарезервированные ключи
		if (depth === 0 && DENY_LIST.indexOf(key) >= 0) {
			const newKey = DENY_KEY_PREFIX + key;
			warnings.push(`На первом уровне объекта запрещено имя ключа '${key}' переименовано в '${newKey}'`);
			key = newKey;
		}

		// Нельзя использовать точку в ключе
		if (/\./.test(key)) {
			const newKey = key.replace(/\./g, '_');
			warnings.push(`Нельзя использовать точку в ключе '${key}' переименовано в '${newKey}'`);
			key = newKey;
		}

		// Нельзя использовать _ в начале ключа
		if (/^_/.test(key)) {
			const newKey = key.replace(/^_/g, 'd_');
			warnings.push(`Нельзя использовать _ в начале ключа '${key}' переименовано в '${newKey}'`);
			key = newKey;
		}

		// На первом уровне в качестве ключа error может быть только объект
		if (depth === 0 && key === 'error' && typeof value !== 'object') {
			warnings.push('В качестве ключа error может быть только объект. Содержимое было обернуто в {message : util.inspect(value) }\'');
			value = { message: util.inspect(value, { showHidden: false }) };
		}

		let strValue;
		switch (typeof value) {
		case 'undefined':
			strValue = undefined;
			break;
		case 'number':
		case 'boolean':
			strValue = value.toString();
			break;
		case 'string':
			strValue = value;
			break;
		case 'function':
			strValue = `function ${value.name || ''} ()`;
			break;
		case 'object':
		{
			if (value === null) strValue = undefined;
			else if (value instanceof Date) strValue = value.toISOString();
			else if (depth === 0 && key === 'error') strValue = objFieldsToStr(value, maxDepth, warnings, depth + 1);

			else if (maxDepth === Infinity) strValue = util.inspect(value, { showHidden: true, depth: null });
			else if (DAMP_LIST.indexOf(key) >= 0) strValue = util.inspect(value, { showHidden: true, depth: maxDepth });
			else strValue = value.toString();
			break;
		}
		default:
			strValue = `${value}`;
		}

		if (strValue !== undefined) result[key] = strValue;
	}

	// Для ошибок добавляем поле с name и хэшом стека
	if (obj instanceof Error) {
		result.name = obj.name;

		try {
			const md5Hash = crypto.createHash('md5');
			md5Hash.update(obj.stack);
			result.stackHash = md5Hash.digest('hex');
		} catch (err) {
		}
	}

	return result;
}

/**
 * Подготовка объекта для логирование в bunyan
 * @param {string} source
 * @param {object} sysInfo
 * @param {object[]} data
 * @param {number} maxDepth
 * @return {object}
 */
function prepareBunyan(source, sysInfo, data, maxDepth) {
	if (data instanceof Error) {
		data = { error: data };
	}

	const warnings = [];

	const payload = objFieldsToStr(data, maxDepth, warnings);

	if (warnings.length) {
		writeToStream(process.stdout, 'warn', source, 'При логирование в bunayn были замечены ошибки', warnings);
	}

	return Object.assign(
		payload,
		sysInfo,
		{ source },
	);
}

/* -- Logger --*/

class Logger extends EventEmitter {
	/**
	 * @param {Logger~Options} opt
	 */
	constructor(opt) {
		super();

		/** @type {Logger~Options}  */
		this.options = { ...defaultOptions, ...opt };

		const
			rootDir = path.join(workDir, this.options.baseDir);

		this.bunyans = {};
		const defaultLogData = {
			pm2: {
				id: parseInt(process.env.pm_id, 10),
				name: process.env.name,
			},
		};

		if (this.options.fileNameInfo) {
			this.bunyans.info = bunyan.createLogger({
				name: this.options.appName,
				src: false,
				streams: [{
					level: 'info',
					path: path.join(rootDir, this.options.fileNameInfo),
				}],
				...defaultLogData,
			});
			this.bunyans.info.on('error', this._onBunyanError.bind(this));
		}
		if (this.options.fileNameError) {
			this.bunyans.error = bunyan.createLogger({
				name: this.options.appName,
				src: false,
				streams: [{
					level: 'error',
					path: path.join(rootDir, this.options.fileNameError),
				}],
				...defaultLogData,
			});
			this.bunyans.error.on('error', this._onBunyanError.bind(this));
		}
		if (this.options.fileNameDebug) {
			this.bunyans.debug = bunyan.createLogger({
				name: this.options.appName,
				src: false,
				streams: [{
					level: 'debug',
					path: path.join(rootDir, this.options.fileNameDebug),
				}],
				...defaultLogData,
			});
			this.bunyans.debug.on('error', this._onBunyanError.bind(this));
		}

		this.info = this._write.bind(this, this.options.sourceDepth, 'info', undefined);
		this.expressInfo = this._expressWrite.bind(this, 'info');

		this.error = this._write.bind(this, this.options.sourceDepth, 'error', undefined);
		this.expressError = this._expressWrite.bind(this, 'error');

		this.debug = this._write.bind(this, this.options.sourceDepth, 'debug', undefined);
		this.expressDebug = this._expressWrite.bind(this, 'debug');

		this.writeToStream = writeToStream;
	}

	/**
	 * Используется для ротатцию файлов
	 */
	reopenFileStreams() {
		if (this.bunyans.info) this.bunyans.info.reopenFileStreams();
		if (this.bunyans.error) this.bunyans.error.reopenFileStreams();
		if (this.bunyans.debug) this.bunyans.debug.reopenFileStreams();
	}

	_onBunyanError(err) {
		this.writeToStream(process.stderr, 'error', 'logger.js', 'Bunyan internal error', err, this.options.maxDepthConsole);
		this.emit('error', err);
	}

	/**
	 *
	 * @param {number} stackDepth
	 * @param {'info'|'error'|'debug'} level
	 * @param {undefined|object} sysInfo
	 * @param {string|object} msg
	 * @param {object} [data]
	 * @private
	 */
	_write(stackDepth, level, sysInfo, msg, data) {
		if (process.env.NODE_ENV == 'test') return;

		const source =			(((new Error().stack)
			.split(/\n\s*[at]*\s*/g))[stackDepth])
			.replace(workDir, '')
			.match(/\(?(\S*:\d+:\d+)\)?/)[1];

		let outMsg;

		if (typeof msg === 'object') {
			data = msg;
			outMsg = data.message || '';
		} else {
			outMsg = `${msg}`;
		}

		if (this.bunyans[level]) {
			const
				outData = data || {};
			const bunyanDepth = (level == 'debug') ? Infinity : this.options.maxDepthFile;
			const bunyanObj = prepareBunyan(source, sysInfo || {}, outData, bunyanDepth);

			this.bunyans[level][level](bunyanObj, outMsg);
		}

		if (this.options.duplicateConsole && level !== 'info') {
			const
				stdOut =					(level == 'error')
					? process.stderr : process.stdout;

			const maxDepthConsole =					(level == 'debug' && this.options.maxDepthConsole < 10)
				? 10 : this.options.maxDepthConsole;

			const outData = (data === undefined) ? [] : [].concat(data);

			if (this.options.showSysInfo && sysInfo) {
				outData.push(sysInfo);
			}

			this.writeToStream(stdOut, level, source, outMsg, outData, maxDepthConsole);
		}

		return this;
	}

	/**
	 *
	 * @param {'info'|'error'|'debug'} level
	 * @param {object} req Express Request object
	 * @param {string|object} msg
	 * @param {object} [data]
	 * @private
	 */
	_expressWrite(level, req, msg, data) {
		const
			reqIP = req.headers['x-real-ip'] || req.socket.remoteAddress;
		const reqId = req.headers['x-nginx-request-id'] || undefined;
		const reqUrl = req.url;
		const reqUserAgent = req.headers['user-agent'];

		const routePath =				req.route ? req.route.path
			: req.preRoute ? req.preRoute.path : '';

		const reqReferrer = req.headers.referer || undefined;

		const o = req.o || {};
		const user = o.user || {};
		const site = o.site || {};

		const reqInfo = {
			reqIP,
			reqId,
			reqUrl,
			reqUserAgent,
			route: routePath,
			reqReferrer,
			sessionUserId: user._id ? user._id.toString() : undefined,
			sessionSiteId: site._id ? site._id.toString() : undefined,
		};

		return this._write(this.options.sourceDepth + 1, level, reqInfo, msg, data);
	}
}

Logger.writeToStream = writeToStream;

module.exports = new Logger({
	baseDir: 'logs',
	fileNameError: '_error.log.json',
});
