var receptor  = require('./receptor_base')({
	puerto: 8512,
	model: MODEL_GT08,
	insert_db: false
});

receptor.init();