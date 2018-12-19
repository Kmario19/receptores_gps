var net = require("net");

var server = net.createServer();

var puerto = 8511, miIP = '45.63.83.222', ntrama = 1, respuesta = false, apagado = false;

server.on("connection", function (socket) {
	var remoteAddress = socket.remoteAddress + ":" + socket.remotePort;
	console.log("Nuevo GPS conectado desde: %s", remoteAddress);

	socket.setEncoding('hex');

	socket.on("data", function (d) {
		d = d.replace('c382c2', '');
		console.log('Trama #' + ntrama + ' recibida: \n');
		console.log('HEX:\n' + d.toString());
		console.log('\n');
		console.log('ASCII:\n' + Hex2Ascii(d));
		console.log('\n');

		if (d.toString().substr(22, 4) == '5000') {
			socket.write('40400012645040311790274000014F120D0A', 'hex');
		}

		if (d.toString().substr(22, 4) == '4115') {
			respuesta = true;
			console.log('Trama de respuesta\n');
		} else {
			//d.toString().substr(8, 14) == '64504031038132'
			if ((respuesta || ntrama == 1 || (ntrama % 4 == 0 && !respuesta))) {
				/*setTimeout(function(){
					var trama = apagado ? '4040001662170019750163411500020202020D4B0D0A' : '4040001662170019750163411501020202020D4B0D0A';
					apagado = !apagado;
					console.log('Enviando comando:\n\n' + trama + '\n');
					// Convirtiendo a ascii
					//trama = Hex2Ascii(trama); //Si no lo envío en ascii, lo tomará como tal y convierte lo que está en hexa en hexa nuevamente
					// Enviando como hex
					socket.write(trama, 'hex', function (){
						//socket.write('@@001264504031179027410514c543\r\n');
						console.log('Comando enviado. Esperando respuesta...\n\n');
					});
					respuesta = false;
				}, 3000);*/
			}
		}

		ntrama++;
	});

	socket.once("close", function () {
		console.log("Connection from %s closed", remoteAddress);
	});

	socket.on("error", function (err) {
		console.log("Connection %s error: %s", remoteAddress, err.message);
	});
});

server.listen(puerto,miIP, function () {
	console.log("Server listo: %j", server.address());
});

function Hex2Ascii(hexx) {
	var hex = hexx.toString();//force conversion
	var str = '';
	for (var i = 0; i < hex.length; i += 2)
	    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
	return str.replace(/\n/, "\\n").replace(/\r/, "\\r");
}