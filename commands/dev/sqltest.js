require('dotenv').config(); //for .env file
var mysql = require('mysql'); // remote SQL library

module.exports = {
    name: 'sqltest', // The name of the command
    description: 'Tests the SQL connection!', // The description of the command (for help text)
    perms: 'dev', //restricts to bot dev only (me)
    allowDM: true,
    usage: '', // Help text to explain how to use the command (if it had any arguments)
    execute(message, args) {
        var userSync = require('./../../newMember.js');
        try {
          userSync(message.member);
        }
        catch(err) {
          console.error(err);
        }
    },
};
