var mysql = require('mysql');

module.exports = function(config) {
    var con = mysql.createConnection(config);
    con.connect(function(err) {
      if (err) {
        console.error('Error Connecting: ' + err.stack);
        return;
      }
      console.log('Connected to remote SQL server as ID: ' + con.threadId);
    });
    return con;
}
