var config = require("./../config.json");
var helpers = require("./../lib/helpers");
var net = require("net");
var socket = require('socket.io-client')('http://'+config.SOCKET_SERVER+':'+config.SOCKET_PORT);

socket.on('connect', function () {
	console.log('Conectado al SOCKET');
});

/**
 *  MODELOS
 */
global.MODEL_GT08 = 1, global.MODEL_TK310 = 2, global.MODEL_SP8750P = 3;
global.MODEL_ARRAY = {
	1: 'GT08',
	2: 'TK310',
	3: 'SKYPATROL 8750+'
}
global.MODEL_FILE_ARRAY = {
	1: 'modelo_GT08',
	2: 'modelo_GTO8',
	3: 'modelo_SP8750P'
}

module.exports = function (options) {
	if (!options) options = {};

	if (!options.puerto) {
		throw "El puerto debe ser especificado";
	}

	var module = {
		ip: 	options.ip || config.DB_SERVER,
		puerto: options.puerto,
		server: null,
		tramas_total: 0,

		init: function() {
			try {
			    var model = require('./../modelos/' + MODEL_FILE_ARRAY[options.model]);
			} catch (ex) {
			    throw ex;
			}

			var server = net.createServer();

			server.on("connection", function (client) {
				var remoteAddress = client.remoteAddress + ":" + client.remotePort;

				console.log("Nuevo GPS conectado desde: %s", remoteAddress);

				client.setEncoding('hex');

				client.on("data", function (d) {
					d = d.replace('c382c2', '');
					// Saludo login
					//client.write('40400012645040311790274000014F120D0A', 'hex');
					model.exec(d.toString());
					var trama = null;
					for (var i = 0; i < model.tramas.length; i++) {
						trama = model.tramas[i];
						trama.receptor = module.puerto;
						trama.puerto = client.remotePort;
						trama.ip = client.remoteAddress;
						console.log(trama);
						socket.emit('trama', trama);
					}
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