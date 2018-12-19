var config = require("./../config.json");
var helpers = require("./../lib/helpers");
var net = require("net");

module.exports = function (options) {
	if (!options) options = {};

	if (!options.puerto) {
		throw "El puerto debe ser especificado";
	}

	var module = {
		ip: 	options.ip || config.SERVER_ADD,
		puerto: options.puerto,
		server: null,
		tramas_total: 0,

		init: function() {
			var server = net.createServer();

			server.on("connection", function (client) {
				var remoteAddress = client.remoteAddress + ":" + client.remotePort;

				console.log("Nuevo GPS conectado desde: %s", remoteAddress);

				client.setEncoding('hex');

				client.on("data", function (d) {
					d = d.replace('c382c2', '');
					console.log('Trama #' + module.tramas_total + ' recibida: \n');
					console.log('HEX:\n' + d.toString());
					console.log('\n');
					console.log('ASCII:\n' + Hex2Ascii(d));
					console.log('\n');

					if (d.toString().substr(22, 4) == '5000') {
						client.write('40400012645040311790274000014F120D0A', 'hex');
					}

					if (d.toString().substr(22, 4) == '4115') {
						respuesta = true;
						console.log('Trama de respuesta\n');
					} else {
						//d.toString().substr(8, 14) == '64504031038132'
						if ((respuesta || module.tramas_total == 1 || (module.tramas_total % 4 == 0 && !respuesta))) {
							/*setTimeout(function(){
								var trama = apagado ? '4040001662170019750163411500020202020D4B0D0A' : '4040001662170019750163411501020202020D4B0D0A';
								apagado = !apagado;
								console.log('Enviando comando:\n\n' + trama + '\n');
								// Convirtiendo a ascii
								//trama = Hex2Ascii(trama); //Si no lo envío en ascii, lo tomará como tal y convierte lo que está en hexa en hexa nuevamente
								// Enviando como hex
								client.write(trama, 'hex', function (){
									//client.write('@@001264504031179027410514c543\r\n');
									console.log('Comando enviado. Esperando respuesta...\n\n');
								});
								respuesta = false;
							}, 3000);*/
						}
					}

					module.tramas_total++;
				});

				client.once("close", function () {
					console.log("Connection from %s closed", remoteAddress);
				});

				client.on("error", function (err) {
					console.log("Connection %s error: %s", remoteAddress, err.message);
				});
			});

			server.listen(module.puerto, module.ip, function () {
				console.log("Server listo: %j", server.address());
			});

			module.server = server;

		}
	}

	return module;
}