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
		},
		{
			tipo: TRAMA_RESPUESTA,
			modo: MODO_REGEX,
			regex: /2424[0-9A-Z]{4}([0-9]{14})([0-9]{6})[0-9A-Z]{4}0D0A/gi
		}
	],
	segments: [
		{
			when: function (gps) {
				return gps.ES_TRAMA_POSICION || gps.ES_TRAMA_EVENTO || gps.ES_TRAMA_RESPUESTA;
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
							regex: /(\d+)(?:\.?\d*),(A|V)?,(\d{4}.\d+)?,(N|S)?,(\d{5}.\d+)?,(W|E)?,(\d+(?:\.\d+)?)?,(\d+(?:\.\d+)?)?,(\d{6})([\w,\*]*)\|(\d+(?:\.\d+)?)\|(\d+(?:\.\d+)?)\|(\w{4})?\|(?:(\w+)?,(\w+))?\|(\d+)?/gi,
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
										return (parseFloat(odom) / 1000).toFixed(2);
									} 
								}
							}
						}
					]
				}
			}

		}
	],
	restrictions: [
		function (gps) {

		}
	],
	buildCommand: function(track, command, value) {
		var header = "4040";
		var data = '';

        // ENCENDIDO Y APAGADO SEGURO ES CON EL CÓDIGO 4114
        switch (command) {
            // Encender vehículo:           4115 0002020202
            case COMMAND_ENCENDIDO:
                data = "41150002020202";
                break;
            // Apagar vehiculo:             4115 0102020202
            case COMMAND_APAGADO:
                data = "41150102020202";
                break;
            // Posición actual:
            case COMMAND_POSICION:
                data = "4101";
                break;
            // Fijar intervalo de tiempo    4102 002D => DEC2HEX
            case COMMAND_INTERVALO:
                //value = round((int)value/10); // Unidades de 10
                data = "4102" + helpers.completeHex(helpers.Dec2Hex(value), 4);
                break;
            // Fijar límite de velocidad    4105 0B => DEC2HEX
            case COMMAND_LIMITE_VELOCIDAD:
                //value = round((int)value/10); // Unidades de 10
                data = "4105" + helpers.Dec2Hex(value);
                break;
            // Reiniciar GPS
            case COMMAND_REINICIO:
                data = "4110";
                break;
            // Firmware
            case COMMAND_FIRMWARE:
                data = "9001";
                break;
            default:
				console.warn('Código de comando no implementado');
				return '';
        }

        var length = helpers.completeHex(helpers.Dec2Hex((data.length / 2) + 15), 4);

        return header + length + track.IMEI + data + "AB010D0A";
    }
});

module.exports = modelo;
