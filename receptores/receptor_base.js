var config = require("./../config.json");
var helpers = require("./../lib/helpers");
var net = require("net");
var socket = require('socket.io-client')(config.SOCKET_SERVER+':'+config.SOCKET_PORT, {
	transports: ['websocket'],
	rejectUnauthorized: false
});
const { Mongo } = require('./../lib/mongo.js')

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
global.MODEL_GT08 = 1, global.MODEL_TK310 = 2, global.MODEL_TTSP8750P = 3;
global.MODEL_ARRAY = {
	1: 'GT08',
	2: 'TK310',
	3: 'SP 8750+'
}
global.MODEL_FILE_ARRAY = {
	1: 'modelo_GT08',
	2: 'modelo_TK310',
	3: 'modelo_SPTT8750P'
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

			Mongo.connectToMongo(function () {
				console.log('Conectado a MONGO');
				module.send_from_mongo();
			});

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
						if (!trama.ES_TRAMA_LOGIN && trama.LAT && trama.LNG) {
							module.send_db(trama, function (result) {
								var parts = result.split('|');
								if (parts[0] == 'ok' && trama.IMEI) {
									socket.emit('extra_data', {
										imei: trama.IMEI,
										placa: parts[1],
										cliente: parts[2],
										numero: parts[3]
									});
								}
							});
						} else if (trama.error) {
							Mongo.insert_error(trama);
						}
					}
				});

				client.once("close", function () {
					delete trackers[remoteAddress];
					socket.emit('track_disconnect', {puerto : client.remotePort, ip : client.remoteAddress});
					if (module.insert_db) {
						module.disconnect_track(client.remoteAddress, client.remotePort);
					}
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
							console.log('No se pudo enviar el comando: %s', e);
						}
					} else {
						console.log('Código de comando [%s] no implementado', command);
					}
				} else {
					console.log('No se envio comando, no se encontró cliente');
				}
			});

		},

		send_db: function (trama, done) {
			if (trama.error) {
				Mongo.insert_error(trama);
			} else if(!module.insert_db) {
				Mongo.insert_trama(trama);
			} else {
				pool.connect((err, pgClient) => {
					if (err)
						return console.error('Error PG connect: ', err);

					pgClient.query('SELECT funseguimientosatelital2($1) as response', [JSON.stringify(trama)], (err, res) => {
						if (err) {
							trama.error = err;
							Mongo.insert_error(trama);
							pgClient.release();
							return console.error('Error PG select: ', err);
						}
						console.log('%s - %s', trama.IMEI, res.rows[0].response);
						if (typeof done == 'function')
							done(res.rows[0].response);
						pgClient.release();
					})
				});
			}
		},

		send_from_mongo: function () {
			if(module.insert_db) {
				Mongo.db.collection(this.puerto.toString()).find({}, { sort: { '_id' : 1 } }).toArray(function(err, result) {
					for (let i = 0; i < result.length; i++) {
						var r = result[i];
						module.send_db(r, function(send) {
							console.log(send);
							if (send && send.substr(0, 2) == 'ok') Mongo.delete_trama(r, module.puerto);
						});
					}
				});
			}
		},

		disconnect_track: function(ip, puerto) {
			pool.connect((err, pgClient, done) => {
				if (err)
					return console.error('Error PG connect: ', err);

				pgClient.query('UPDATE moviles SET conectado =\'N\' WHERE ip = $1 AND puerto = $2 AND receptor_gps = $3',
				[ip, puerto, module.puerto], (err, res) => {
					if (err)
						return console.error('Error PG select: ', err);
					pgClient.release();
				})
			});
		}
	}

	return module;
}