var receptor  = require('./receptor_base')({
	ip: 'localhost',
	puerto: 8502,
	model: MODEL_GT08
});

receptor.init();