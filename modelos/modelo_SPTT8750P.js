var modelo = require("./modelo_base")();
var helpers = require("./../lib/helpers");

modelo.prepare({
	// Descripción modelo
	gps: 'SKYPATROL TT8750+',
	// Depuración
	debug: true,
	// Formato de trama recibida
	format_in: FORMAT_HEX,
	// Formato de trama a procesar
	format_proc: FORMAT_HEX,
	// Transformar en mayúscula toda la trama
	upper: true,
	// Identificación de trama general, si no pasa estas reglas, no continúa
	rules: [
		{str: '000A081000', start: 4} // Inicio
	],
	// Identificación tipos de trama
	tram_types: [
		// Deshabilitada identificación 2424 porque cuando envíen tramas de evento seguida de una de posición,
		// la priera la procese como tal y la segunda solo la info de posición que necesita
		/*{
			tipo: TRAMA_POSICION,
			modo: MODO_SUBSTR,
			str: '2424',
			start: 0
		},*/
		{
			tipo: TRAMA_POSICION,
			modo: MODO_SUBSTR,
			str: '4750524D43',
			start: 120
		},
		{
			tipo: TRAMA_LOGIN,
			modo: MODO_SUBSTR,
			str: '5000',
			start: 22,
		},
		{
			tipo: TRAMA_RESPUESTA,
			modo: MODO_SUBSTR,
			str: '000D00010500000D0A4F4B0D0A',
			start: 0
		}
	],
	segments: [
		{
			when: function (gps) {
				return gps.ES_TRAMA_POSICION || gps.ES_TRAMA_EVENTO || gps.ES_TRAMA_RESPUESTA;
			},
			tipo: MODO_REGEX,
			regex: /(?:[0-9A-F]{4})000A08100020([0-9A-F]{20})20([0-9A-F]{40})20([0-9A-F]{14})20([0-9A-F]{10})20([0-9A-F]{10})20([0-9A-F]+)20([0-9A-F]{6})20([0-9A-F]{22})20([0-9A-F]{22})20([0-9A-F]{10})/gi,
			matches: {
				1: { // EVENTO
					var: SEGM_EVENTO,
					format_in: FORMAT_HEX,
					format_proc: FORMAT_ASCII
				},
				2: { // IMEI
					var: SEGM_IMEI,
					format_in: FORMAT_HEX,
					format_proc: FORMAT_ASCII,
					format: function (str) {
						return str.substr(1); // Quitar el 8 inicial
					}
				},
				3: { // ESTADO ENTRADAS Y SALIDAS
					var: SEGM_IN_OUTS,
					format_in: FORMAT_HEX,
					format_proc: FORMAT_ASCII,
					format: function(str) {
						return helpers.completeBin(helpers.Dec2Bin(str), 12);
					}
				},
				4: { // AD1
					var: SEGM_AD1,
					format_in: FORMAT_HEX,
					format_proc: FORMAT_ASCII,
					format: function(val) {
						return parseInt(val) / 1000;
					}
				},
				5: { // AD2 - DIVIDIR ENTRE 1000 PARA TENER VOLTAJE
					var: SEGM_AD2,
					format_in: FORMAT_HEX,
					format_proc: FORMAT_ASCII,
					format: function(val) {
						return parseInt(val) / 1000;
					}
				},
				6: { // DATA
					var: SEGM_GRUPO,
					format_in: FORMAT_HEX,
					format_proc: FORMAT_ASCII,
					segments: [
						{
							tipo: MODO_REGEX,
							regex: /GPRMC,(\d{6})(?:[\.\d]*),(A|V)?,(\d{4}\.\d+)?,(N|S)?,(\d{5}\.\d+)?,(W|E)?,([\d\.]+)?,([\d\.]*),(\d{6})?,([\d\.]*),([\d\.]*),(\w*.+)/gi,
							matches: {
								1: {
									var: SEGM_HORA,
									format: function (hora) {
										return hora.replace(/(\d)(?=(\d{2})+$)/g, '$1:');
									}
								},
								2: {
									var: SEGM_SENAL
								},
								3: {
									var: SEGM_LAT,
									format: function (coord) {
										coord = parseFloat(coord);
								  		var part1 = Math.floor(coord/100);
								  		coord -= part1*100;
								  		var part2 = coord/60;
								  		result = part1+part2;
								  		return result.toFixed(7);
									}
								},
								4: {
									var: SEGM_CARD_LAT
								},
								5: {
									var: SEGM_LNG,
									format: function (coord) {
										coord = parseFloat(coord);
								  		var part1 = Math.floor(coord/100);
								  		coord -= part1*100;
								  		var part2 = coord/60;
								  		result = part1+part2;
								  		return result.toFixed(7);
									}
								},
								6: {
									var: SEGM_CARD_LNG
								},
								7: {
									var: SEGM_VELOCIDAD,
									format: function (vel) {
										return (parseFloat(vel) * 1.852).toFixed(2); // Nudos a Km/h
									}
								},
								8: {
									var: SEGM_ORIENTACION,
									format: function (deg) {
										return parseFloat(deg || 0);
									} 
								},
								9: {
									var: SEGM_FECHA,
									format: function (fecha) {
										return fecha.replace(/([0-9]{2})([0-9]{2})([0-9]{2})/g, '20$3-$2-$1');
									}
								},
								10: {
									var: SEGM_ALTITUD
								},
								11: {
									var: SEGM_NUM_SATELITES
								}
							}
						}
					]
				},
				7: {
					var: SEGM_BAT_INTERNA,
					format_in: FORMAT_HEX,
					format_proc: FORMAT_ASCII
				},
				8: {
					var: SEGM_ODOMETRO, // Este es el virtual pero es el que se usa en la plataforma
					format_in: FORMAT_HEX,
					format_proc: FORMAT_ASCII,
					format: function (val) {
						return parseInt(val) / 1000;
					}
				},
				9: {
					var: SEGM_ODOMETRO_VIRTUAL,
					format_in: FORMAT_HEX,
					format_proc: FORMAT_ASCII,
					format: function (val) {
						return parseInt(val) / 1000;
					}
				},
				10: {
					var: SEGM_BAT_EXTERNA,
					format_in: FORMAT_HEX,
					format_proc: FORMAT_ASCII,
					format: function (val) {
						return parseInt(val) / 1000;
					}
				}
			}

		}
	],
	after_data: function(t) {
		t.ES_TRAMA_POSICION = t.CARD_LAT && t.CARD_LNG ? 1 : 0;
		if (t.CARD_LAT == 'S') {
			t.LAT = '-' + t.LAT
		}
		if (t.CARD_LNG == 'W') {
			t.LNG = '-' + t.LNG
		}
		t.ES_TRAMA_EVENTO = t.EVENTO && t.EVENTO != 10 && t.EVENTO != 11 ? 1 : 0; 
		// Fecha y Hora -5H
		var time = new Date(), _time = null;
		if (t.FECHA.length == 10 && t.HORA.length >= 4) {
			try {
				_time = new Date(t.FECHA + ' ' + t.HORA + ' UTC');
				// Si son años diferentes, se deja la fecha actual
				if (time.getFullYear() == _time.getFullYear()) {
					time = _time;
				}
			} catch(e) {
			}
		}
		time.setTime(time.getTime() - 1.8e+7); //-5 horas
		t.DATETIME = time.toISOString().replace('T', ' ').substr(0, 19);
		t.IGNICION = t.EVENTO == 10 ? 1 : 0;
		t.EVENTOS = t.EVENTO;
		return t;
	},
	restrictions: [
		function (gps) {

		}
	],
	buildCommand: function(track, command, value) {
		var data = '';

        // ENCENDIDO Y APAGADO SEGURO ES CON EL CÓDIGO 4114
        switch (command) {
            // Encender vehículO
            case COMMAND_ENCENDIDO:
                data = "001300010400004154245454494F434F353D30";
                break;
            // Apagar vehiculo
            case COMMAND_APAGADO:
                data = "001300010400004154245454494F434F353D31";
                break;
            // Posición actual:
            case COMMAND_POSICION:
                data = "00190001040000415424545454524745563d31382c312c3235";
                break;
            default:
				console.warn('Código de comando no implementado');
        }

        return data;
    }
});

module.exports = modelo;
