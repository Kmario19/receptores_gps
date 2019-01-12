var config = require("./../config.json");
var helpers = require("./../lib/helpers");
var net = require("net");
var socket = require('socket.io-client')(config.SOCKET_SERVER+':'+config.SOCKET_PORT, { transports: ['websocket'], rejectUnauthorized: false });

socket.on('connect', function () {
	console.log('Conectado al SOCKET');
});

var Pool = require('pg').Pool;
var pool = new Pool({
	user		: 'postgres',
	database 	: 'postgres',
	password 	: 'GeoMgr2017..',
	host		: '45.32.133.171',
	port 		: 5432,
	max			: 1,
	idleTimeoutMillis : 30000
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

var trackers = [];

module.exports = function (options) {
	if (!options) options = {};

	if (!options.puerto) {
		throw "El puerto debe ser especificado";
	}

	var module = {
		ip: 	options.ip || config.IP_SERVER,
		puerto: options.puerto,
		insert_db: config.DB_INSERT || false,
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
				trackers[remoteAddress] = client;

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
						trama.modelo = MODEL_ARRAY[options.model];
						socket.emit('trama', trama);
						if (module.insert_db) {
							if (!trama.ES_TRAMA_LOGIN && trama.LAT && trama.LNG) {
								module.send_db(trama);
							}
						}
					}
				});

				client.once("close", function () {
					delete trackers[remoteAddress];
					socket.emit('track_disconnect', {puerto : client.remotePort, ip : client.remoteAddress});
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

			socket.on('command', function(track, command, value) {
				var client = trackers[track.ip + ':' + track.puerto];
				if (client) {
					var command_send = model.buildCommand(track, command, value);
					if (command_send) {
						try {
							client.write(command_send, 'hex');
							console.log('Comando enviado: ', command_send);
						} catch(e) {
							console.log(e);
						}
					}
				} else {
					console.log('No se envio comando, no se encontró cliente');
				}
			});

		},

		send_db: function (trama) {
			pool.connect((err, pgClient, done) => {
				if (err)
					return console.error('Error PG connect: ', err);

				pgClient.query('SELECT funseguimientosatelital2($1) as response', [JSON.stringify(trama)], (err, res) => {
					if (err)
						return console.error('Error PG select: ', err);
					console.log(res.rows[0].response);
					pgClient.release();
				})
			});
		} 
	}

	return module;
}