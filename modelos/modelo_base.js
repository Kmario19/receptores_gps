var config = require("./../config.json");
var helpers = require("./../lib/helpers");

global.DEBUG = false;

/**
 *  FORMATOS
 */
global.FORMAT_NONE = 1, global.FORMAT_HEX = 2, global.FORMAT_ASCII = 3, global.FORMAT_BIN = 4, global.FORMAT_DEC = 5;
global.FORMAT_ARRAY = {
	1: 'SIN FORMATO',
	2: 'HEXADECIMAL',
	3: 'ASCII',
	4: 'BINARIO',
	5: 'DECIMAL'
}

/**
 * TIPOS DE TRAMAS
 */
global.TRAMA_POSICION = 1, global.TRAMA_EVENTO = 2, global.TRAMA_LOGIN = 3, global.TRAMA_RESPUESTA = 4;
global.TRAMA_ARRAY = {
	1: 'TRAMA POSICION',
	2: 'TRAMA EVENTO',
	3: 'TRAMA LOGIN',
	4: 'TRAMA RESPUESTA'
}

/**
 * MODOS DE IDENTIFICACIÓN DE TRAMAS
 */
global.MODO_SUBSTR = 1, global.MODO_REGEX = 2, global.MODO_SPLIT = 3, global.MODO_FUNCTION = 4;
global.MODO_ARRAY = {
	1: 'SUBSTR',
	2: 'REGEX',
	3: 'SPLIT',
	4: 'FUNCTION'
}

/**
 * COMANDOS DISPONIBLES
 */
global.COMMAND_POSICION = 3, global.COMMAND_ENCENDIDO = 1, global.COMMAND_APAGADO = 2, global.COMMAND_REINICIO = 4,
global.COMMAND_INTERVALO = 5, global.COMMAND_LIMITE_VELOCIDAD = 6, global.COMMAND_FIRMWARE = 7;
global.COMMAND_ARRAY = {
	1: 'ENCENDIDO',
	2: 'APAGADO',
	3: 'POSICION',
	4: 'REINICIO',
	5: 'INTERVALO GPS',
	6: 'LIMITE VELOCIDAD',
	7: 'FIRMWARE'
}

/**
 * SEGMENTOS DE TRAMA
 */
global.SEGM_GRUPO = 'GRUPO';
global.SEGM_LONGITUD = 'LONGITUD'; // Longitud de la trama
global.SEGM_IMEI = 'IMEI';
global.SEGM_EVENTO = 'EVENTO';
global.SEGM_COD_EVENTO = 'COD_EVENTO';
global.SEGM_HORA = 'HORA';
global.SEGM_SENAL = 'SENAL';
global.SEGM_LAT = 'LAT';
global.SEGM_LNG = 'LNG';
global.SEGM_CARD_LAT = 'CARD_LAT';
global.SEGM_CARD_LNG = 'CARD_LNG';
global.SEGM_VELOCIDAD = 'VELOCIDAD';
global.SEGM_ORIENTACION = 'ORIENTACION';
global.SEGM_FECHA = 'FECHA';
global.SEGM_HDOP = 'HDOP';
global.SEGM_ALTITUD = 'ALTITUD';
global.SEGM_IN_OUTS = 'IN_OUTS';
global.SEGM_AD1 = 'AD1';
global.SEGM_AD2 = 'AD2';
global.SEGM_AD3 = 'AD3';
global.SEGM_AD4 = 'AD4';
global.SEGM_AD5 = 'AD5';
global.SEGM_ODOMETRO = 'ODOMETRO';
global.SEGM_ODOMETRO_VIRTUAL = 'ODOMETRO_VIRTUAL';
global.SEGM_RFID = 'RFID';
global.SEGM_BAT_INTERNA = 'BAT_INTERNA';
global.SEGM_BAT_EXTERNA = 'BAT_EXTERNA';
global.SEGM_NUM_SATELITES = 'NUM_SATELITES';

/**
 * MODULO
 */
module.exports = function () {

	var options = {};

	var module = {

		trama: '',
		tramas: [],

		prepare: function (opts) {
			// PROPIEDADES REQUERIDAS
			var requires = {
				gps: '',
				tram_types: [],
				format_in: null,
				format_proc: null,
				rules: [],
				tram_types: []
			};

			for (opt in requires) {
				if (!opts[opt]) {
					throw ExceptionModelo("El parámetro " + opt + " es requerido ", opts[opt]);
				}
			}

			if (opts.debug) {
				DEBUG = opts.debug;
			}	

			options = opts;
		},

		validate: function () {
			if (!module.trama)
				throw ExceptionValidacion("Trama vacía");

			// Validar reglas
			for(i in options.rules) {
				var rt = options.rules[i], substr = module.trama.substr(rt.start, rt.str.length);
				//console.log("Regla: substr(" + rt.start + ", " + rt.str.length + ") = " + substr);
				if (substr != rt.str)
					throw ExceptionValidacion("Trama inválida! No pasó la regla '" + rt.str + "': substr(" + rt.start + ", " + rt.str.length + ") = " + substr);
			}
		},

		identify: function () {
			var identified = false;
			var t = module.tramas[module.trams_found];
			// Recorrer todas las formas de identificación
			for(i in options.tram_types) {
				var tt = options.tram_types[i], valida = false;
				// Validadr de acuerdo al modo
				switch(tt.modo) {
					case MODO_SUBSTR:
						valida = t.trama.substr(tt.start, tt.str.length) == tt.str;
						break;
					case MODO_REGEX:
						valida = (new RegExp(tt.regex)).test(t.trama);
						break;
					case MODO_FUNCTION:
						if (typeof tt.exec == 'function') {
							valida = tt.exec(tt.str);
						} else {
							ExceptionIdentificacion("Función esperada, '" + typeof tt.exec + "' encontrada");
						}
						break;
					default:
						throw ExceptionIdentificacion("Modo de identificación " + tt.modo + " no definido");
				}
				// Si es válida, activar la bandera
				if (valida) {
					identified = true;
					switch(tt.tipo) {
						case TRAMA_POSICION: t.ES_TRAMA_POSICION = 1; break;
						case TRAMA_EVENTO: t.ES_TRAMA_EVENTO = 1; break;
						case TRAMA_LOGIN: t.ES_TRAMA_LOGIN = 1; break;	
						case TRAMA_RESPUESTA: t.ES_TRAMA_RESPUESTA = 1; break;
						default: throw ExceptionIdentificacion("Tipo de trama " + tt.tipo + " inválida");
					}
				}
			}
			module.tramas[module.trams_found] = t;
			if (!identified)
				throw ExceptionIdentificacion("Trama no identificada: " + t.trama);
		},

		trams_found: 0,
		process: function (str, segments, initial_tram) {
			for (var i = 0; i < segments.length; i++) {
				var segment = segments[i];
				if (!segment.when || (typeof segment.when == 'function' && segment.when(module.tramas[module.trams_found]))) {
					switch(segment.tipo) {
						case MODO_SUBSTR:
							module.convertVal(str.substr(segment.start, segment.lngt), segment);
							break;
						case MODO_REGEX:
							var match;
							while(match = segment.regex.exec(str)) {
								if (!match[0]) continue;
								if (initial_tram) {
									var t = new Trama();
									t.trama = match[0];
									module.tramas[module.trams_found] = t;
									module.identify();
								}
								for (j in segment.matches) {
									//log(match[i]);
									module.convertVal(match[j], segment.matches[j]);
								}
								if (initial_tram) {
									module.trams_found++;
								}
							}
							break;
						case MODO_FUNCTION:
							if (typeof s.exec == 'function') {
								module.convertVal(segment.exec(str), segment);
							} else {
								throw ExceptionProcesamiento("Función esperada, '" + typeof segment.exec + "' encontrada");
							}
							break;
					}
					//console.log('Trama ', module.trams_found, ' Pasó la condición ', segment.tipo, ' Trama: ', str);
				} else {
					//console.log('Trama ', module.trams_found, ' No pasó la condición');
				}
			}
		},

		convertVal: function (str, segment) {
			var result = str || null;
			if (segment.format_in && segment.format_proc) {
				// Solo si los formatos son diferentes, se hae conversión
				if (segment.format_in != segment.format_proc) {
					switch(segment.format_in) {
						case FORMAT_HEX:
							switch (segment.format_proc) {
								case FORMAT_ASCII: result = helpers.Hex2Ascii(str); break;
								case FORMAT_BIN: result = helpers.Hex2Bin(str); break;
								case FORMAT_DEC: result = helpers.Hex2Dec(str); break;
								default: throw ExceptionProcesamiento("Formato de procesamiento '" + segment.format_proc + "' incorrecto");
							}
							break;
						case FORMAT_BIN:
							switch (segment.format_proc) {
								case FORMAT_HEX: result = helpers.Bin2Hex(str); break;
								case FORMAT_DEC: result = helpers.Bin2Dec(str); break;
								default: throw ExceptionProcesamiento("Formato de procesamiento '" + segment.format_proc + "' incorrecto");
							}
							break;
						case FORMAT_DEC:
							switch (segment.format_proc) {
								case FORMAT_BIN: result = helpers.Dec2Bin(str); break;
								case FORMAT_HEX: result = helpers.Dec2Hex(str); break;
								default: throw ExceptionProcesamiento("Formato de procesamiento '" + segment.format_proc + "' incorrecto");
							}
							break;
						default: throw ExceptionProcesamiento("Formato de entrada '" + segment.format_proc + "' incorrecto");
					}
					result = result.trim();
				}
				if (!segment.format) {
					log('------------------\n' + segment.var + '\n------------------\nFormat In: ' + FORMAT_ARRAY[segment.format_in] + '(' + str + ')\nFormat Out: ' + FORMAT_ARRAY[segment.format_proc] + '(' + result + ')');
				}
			}

			if (typeof segment.format == 'function') {
				try {
					result = segment.format(result);
				} catch(e) {
					throw ExceptionProcesamiento("Error en la función de formato de '" + segment.var + "': " + e);
				}
				log('------------------\n' + segment.var + '\n------------------\nFormat In: ' + str + '\nFormat Out: ' + result);
			} else if (!segment.format_in && !segment.format_proc) {
				log('------------------\n' + segment.var + '\n------------------\nFormat In: ' + str + '\nFormat Out: SIN FORMATO');
			}

			if (segment.var == SEGM_GRUPO && segment.segments) {
				module.process(result, segment.segments);
			}

			module.assignVar(segment.var, result);
		},

		assignVar: function (variable, val) {
			val = val == null ? '' : val;
			var t = module.tramas[module.trams_found];
			switch(variable) {
				case SEGM_LONGITUD: t.LONGITUD = val; break;
				case SEGM_IMEI: t.IMEI = val; break;
				case SEGM_EVENTO: t.EVENTO = val; break;
				case SEGM_COD_EVENTO: t.COD_EVENTO = val; break;
				case SEGM_HORA: t.HORA = val; break;
				case SEGM_SENAL: t.SENAL = val; break;
				case SEGM_LAT: t.LAT = val; break;
				case SEGM_LNG: t.LNG = val; break;
				case SEGM_CARD_LAT: t.CARD_LAT = val; break;
				case SEGM_CARD_LNG: t.CARD_LNG = val; break;
				case SEGM_VELOCIDAD: t.VELOCIDAD = val; break;
				case SEGM_ORIENTACION: t.ORIENTACION = val; break;
				case SEGM_FECHA: t.FECHA = val; break;
				case SEGM_HDOP: t.HDOP = val; break;
				case SEGM_ALTITUD: t.ALTITUD = val; break;
				case SEGM_IN_OUTS: t.IN_OUTS = val; break;
				case SEGM_AD1: t.AD1 = val; break;
				case SEGM_AD2: t.AD2 = val; break;
				case SEGM_AD3: t.AD3 = val; break;
				case SEGM_AD4: t.AD4 = val; break;
				case SEGM_AD5: t.AD5 = val; break;
				case SEGM_ODOMETRO: t.ODOMETRO = val; break;
				case SEGM_ODOMETRO_VIRTUAL: t.ODOMETRO_VIRTUAL = val; break;
				case SEGM_RFID: t.RFID = val; break;
				case SEGM_BAT_INTERNA: t.BAT_INTERNA = val; break;
				case SEGM_BAT_EXTERNA: t.BAT_EXTERNA = val; break;
				case SEGM_NUM_SATELITES: t.NUM_SATELITES = val; break;
				case SEGM_GRUPO: /*Nada*/ break;
				default: throw ExceptionProcesamiento("Variable '" + variable + "' no definida");
			}
			module.tramas[module.trams_found] = t;
		},

		after_data: function () {
			for (var i in module.tramas) {
				module.tramas[i] = options.after_data(module.tramas[i]);
				module.tramas[i] = module.restrictions(module.tramas[i]);
			}
		},

		restrictions: function (t) {
			if (t.ES_TRAMA_POSICION && !parseInt(t.LAT) && !parseInt(t.LNG)) {
				t.error = 'RESTRICTION #1: Coordenadas en 0';
			} else if (parseInt(t.LAT) == 24 && parseInt(t.LNG) == 121) {
				t.error = 'RESTRICTION #2: Coordenadas en TAIWAN';
			} else if (t.LAT == '0.0166667') {
				t.error = 'RESTRICTION #3: Latitud en 1.0';
			} else if (t.SENAL == 'V' && parseInt(t.VELOCIDAD) > 40) {
				t.error = 'RESTRICTION #4: Señal V y Velocidad mayor de 40';
			} else if (parseInt(t.VELOCIDAD) > 130) {
				t.error = 'RESTRICTION #5: Velocidad mayor a 130Km/h';
			} else if (t.IGNICION == '0' && parseInt(t.VELOCIDAD) > 80) {
				t.error = 'RESTRICTION #6: Ignición apagado y Velocidad > a 80'
			}
			return t;
		},

		exec: function (trama) {
			module.tramas = [];
			module.trams_found = 0;
			
			if (options.upper) {
				trama = trama.toUpperCase();
			}

			module.trama = trama;

			var t = new Trama();
			t.trama = trama;
			module.tramas.push(t);

			try {
				module.validate();

				module.identify();

				module.process(module.trama, options.segments, true);

				module.after_data();

				log(module.tramas);
			} catch(e) {
				module.tramas[module.trams_found].error = e.toString();
				console.error('%s', e);
			}
		},
		buildCommand: function(track, command, value) {
			return options.buildCommand(track, command, value);
		} 
	}

	return module;
}

var Trama = function () {
	this.trama = '';

	this.receptor = '';
	this.ip = '';
	this.puerto = '';
	this.modelo = '';
	this.error = '';

	this.ES_TRAMA_POSICION = 0;
	this.ES_TRAMA_EVENTO = 0;
	this.ES_TRAMA_LOGIN = 0;
	this.ES_TRAMA_RESPUESTA = 0;

	this.IGNICION = '';
	this.LONGITUD = '';
	this.IMEI = '';
	this.EVENTO = '';
	this.EVENTOS = [];
	this.COD_EVENTO = '';
	this.HORA = '';
	this.SENAL = '';
	this.LAT = '';
	this.LNG = '';
	this.CARD_LAT = '';
	this.CARD_LNG = '';
	this.VELOCIDAD = '';
	this.ORIENTACION = '';
	this.FECHA = '';
	this.HDOP = '';
	this.ALTITUD = '';
	this.IN_OUTS = '';
	this.AD1 = '';
	this.AD2 = '';
	this.AD3 = '';
	this.AD4 = '';
	this.AD5 = '';
	this.ODOMETRO = '';
	this.ODOMETRO_VIRTUAL = '';
	this.RFID = '';
	this.BAT_INTERNA = '';
	this.BAT_EXTERNA = '';
	this.NUM_SATELITES = '';
	this.DATETIME = '';
	this.DATETIME_SYS = (new Date).toLocaleString().replace(/-(\d)(?!\d)/g, '-0$1');
}

function log(str) {
	if (DEBUG) console.log(str);
}

function define(name, value) {
    Object.defineProperty(exports, name, {
        value:      value,
        enumerable: true
    });
}

function ExceptionModelo(message) {
	return new helpers.Exception(message, "ExceptionModelo");
}

function ExceptionValidacion(message) {
	return new helpers.Exception(message, "ExceptionValidacion");
}

function ExceptionIdentificacion(message) {
	return new helpers.Exception(message, "ExceptionIdentificacion");
}

function ExceptionProcesamiento(message) {
	return new helpers.Exception(message, "ExceptionProcesamiento");
}

function ExceptionComunicacion(message) {
	return new helpers.Exception(message, "ExceptionComunicacion");
}