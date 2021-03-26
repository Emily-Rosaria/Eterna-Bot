const mysql = require('mysql');

module.exports = function(config) {
    var con = mysql.createConnection(config);
    con.connect(function(err) {
      if (err) {
        console.error('error connecting: ' + err.stack);
        return;
      }
      console.log('connected as id ' + connection.threadId);
    });
    return con;
}
