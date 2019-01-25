var config = require("./../config.json");
const MongoClient = require('mongodb').MongoClient;

class Mongo {
    static connectToMongo() {
        if ( this.db ) return Promise.resolve(this.db)
        return MongoClient.connect(this.url, this.options)
            .then(db => this.db = db)
    }
}

Mongo.db = null
Mongo.url = 'mongodb://' + config.MONGO_USER + ':' + config.MONGO_PASS + '@' + config.MONGO_SERVER + ':27017/receptores';
Mongo.options = {
    bufferMaxEntries:   0,
    reconnectTries:     5000,
    useNewUrlParser:    true
}

Mongo.insert_trama = function(trama) {
    const collection = db.collection(trama.receptor);
    collection.insert(trama);
}

Mongo.insert_error = function(trama) {
    const collection = db.collection(trama.receptor + '_errores');
    collection.insert(trama);
}

module.exports = { Mongo }