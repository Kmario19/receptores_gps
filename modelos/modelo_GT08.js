var modelo = require("./modelo_base")();
var helpers = require("./../lib/helpers");

modelo.prepare({
	// Descripción modelo
	gps: 'GT08/TK310',
	// Depuración
	debug: false,
	// Formato de trama recibida
	format_in: FORMAT_HEX,
	// Formato de trama a procesar
	format_proc: FORMAT_HEX,
	// Transformar en mayúscula toda la trama
	upper: true,
	// Identificación de trama general, si no pasa estas reglas, no continúa
	rules: [
		{str: '2424', start: 0}, // Inicio
		{str: '0D0A', start: -4} // Fin (negativo)
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
			str: '9955',
			start: 22
		},
		{
			tipo: TRAMA_EVENTO,
			modo: MODO_SUBSTR,
			str: '9999',
			start: 22,

		},
		{
			tipo: TRAMA_LOGIN,
			modo: MODO_SUBSTR,
			str: '5000',
			start: 22,

		}
	],
	segments: [
		{
			when: function (gps) {
				return gps.ES_TRAMA_POSICION || gps.ES_TRAMA_EVENTO;
			},
			tipo: MODO_REGEX,
			regex: /2424[0-9A-Z]{4}([0-9]{14})(9999([0-9]{2})|[0-9]{4})([0-9A-Z]*?)[0-9A-Z]{4}0D0A/gi,
			matches: {
				1: { // IMEI
					var: SEGM_IMEI,
					format_in: FORMAT_DEC,
					format_proc: FORMAT_DEC
				},
				2: { // EVENTO
					var: SEGM_EVENTO,
					format_in: FORMAT_DEC,
					format_proc: FORMAT_DEC
				},
				3: { // CODIGO EVENTO
					var: SEGM_COD_EVENTO,
					format_in: FORMAT_DEC,
					format_proc: FORMAT_DEC
				},
				4: { // DATA
					var: SEGM_GRUPO,
					format_in: FORMAT_HEX,
					format_proc: FORMAT_ASCII,
					segments: [
						{
							tipo: MODO_REGEX,
							regex: /(\d+(?:\.\d+)?)?,(A|V)?,(\d{4}.\d+)?,(N|S)?,(\d{5}.\d+)?,(W|E)?,(\d+(?:\.\d+)?)?,(\d+(?:\.\d+)?)?,(\d{6})([\w,\*]*)\|(\d+(?:\.\d+)?)\|(\d+(?:\.\d+)?)\|(\w{4})?\|(?:(\w+)?,(\w+))?\|(\d+)?/gi,
							matches: {
								1: {
									var: SEGM_HORA,
									format: function (hora) {
										return parseFloat(hora).toFixed(0).replace(/(\d)(?=(\d{2})+$)/g, '$1:');
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
										return parseFloat(vel) * 1.852; // Nudos a Km/h
									}
								},
								8: {
									var: SEGM_ORIENTACION
								},
								9: {
									var: SEGM_FECHA,
									format: function (fecha) {
										return fecha.replace(/(.{2})/g, '$1/').substr(0, 8);
									}
								},
								//10 propio de TK310, valores desconocidos: ,,,A*7D
								11: {
									var: SEGM_HDOP
								},
								12: {
									var: SEGM_ALTITUD
								},
								13: {
									var: SEGM_IN_OUTS,
									format_in: FORMAT_HEX,
									format_proc: FORMAT_BIN,
									format: function (bin) {
										return helpers.completeBin(bin, 16);
									}
								},
								14: {
									var: SEGM_AD1,
									format_in: FORMAT_HEX,
									format_proc: FORMAT_DEC,
									format: function (vol) {
										return (vol*6)/1024;
									}
								},
								15: {
									var: SEGM_AD2,
									format_in: FORMAT_HEX,
									format_proc: FORMAT_DEC,
									format: function (vol) {
										return (vol*6)/1024;
									}
								},
								16: {
									var: SEGM_ODOMETRO,
									format: function (odom) {
										return parseFloat(odom);
									} 
								}
							}
						}
					]
				}
			}

		}
	],
	after_data: [
		function (gps) {
		}
	],
	restrictions: [
		function (gps) {

		}
	]
});

module.exports = modelo;
