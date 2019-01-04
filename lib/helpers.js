module.exports = {

	//Useful Functions
	checkBin: function(n){return/^[01]{1,64}$/.test(n)},
	checkDec: function(n){return/^[0-9]{1,64}$/.test(n)},
	checkHex: function(n){return/^[0-9A-Fa-f]{1,64}$/.test(n)},

	//Decimal operations
	Dec2Bin: function(n){if(!this.checkDec(n)||n<0)return 0;return n.toString(2)},
	Dec2Hex: function(n){if(!this.checkDec(n)||n<0)return 0;return n.toString(16)},

	//Binary Operations
	Bin2Dec: function(n){if(!this.checkBin(n))return 0;return parseInt(n,2).toString(10)},
	Bin2Hex: function(n){if(!this.checkBin(n))return 0;return parseInt(n,2).toString(16)},

	//Hexadecimal Operations
	Hex2Bin: function(n){if(!this.checkHex(n))return 0;return parseInt(n,16).toString(2)},
	Hex2Dec: function(n){if(!this.checkHex(n))return 0;return parseInt(n,16).toString(10)},
	Hex2Ascii: function(r){for(var e=r.toString(),n="",t=0;t<e.length;t+=2)n+=String.fromCharCode(parseInt(e.substr(t,2),16));return n.replace(/\n/,"\\n").replace(/\r/,"\\r")},

	// Completar bnario con 0 a la izquierda (binario, longitud)
	completeBin: function(e,t){e.length<t&&(e="0".repeat(t).substr(0,t-e.length)+e);return e},
	completeHex: function(data, length) {
        data = data.toUpperCase();
        var ret = '0'.repeat(length - data.length) + data;
        return ret.length > length ? ret.substr(-length) : ret;
    },

	// ASCII válido (str, extended)
	isASCII: function(s,e) { return (e ? /^[\x00-\xFF]*$/ : /^[\x00-\x7F]*$/).test(s)},

	Exception: function (message, name) {
		this.message = message;
		this.name = name;
		this.toString = function() {
			return this.name + ': ' + this.message;
		}
	}

}