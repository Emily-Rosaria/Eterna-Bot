require('dotenv').config(); //for .env file
var mysql = require('mysql'); // remote SQL library

module.exports = {
    name: 'sqltest', // The name of the command
    description: 'Tests the SQL connection!', // The description of the command (for help text)
    perms: 'dev', //restricts to bot dev only (me)
    allowDM: true,
    usage: '', // Help text to explain how to use the command (if it had any arguments)
    execute(message, args) {
        const sqlConfig = {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: "3306"
        };
        var con = mysql.createConnection(sqlConfig);
        con.query(
            'SELECT * FROM `phpbb_users` WHERE NOT `user_password` = ?',
            '',
            function (error, results, fields) {
              if (error) {
                console.error(error);
                return message.reply("Error connecting to database.");
              }
              message.reply(["List of all current forum users:\n"].concat(results.map(r=>`ID: ${r.user_id}, Username: ${r.username}, Posts: ${r.user_posts}`)), { split: true });
              console.log(results[0].username);
            }
        );
        con.end();
    },
};
