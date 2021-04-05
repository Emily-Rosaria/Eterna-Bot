require('dotenv').config(); //for .env file
const config = require('./config.json');
var mysql = require('mysql');
const Discord = require('discord.js');

const sqlConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: "3306",
    multipleStatements: true
};

module.exports = async function(member) {
    var con = mysql.createConnection(sqlConfig);
    const sql = [
      `SET @user_id = (SELECT user_id FROM phpbb_oauth_accounts WHERE provider = "studio_discord" AND ${member.id} = oauth_provider_id LIMIT 1);`,
      `SELECT group_id FROM phpbb_user_group WHERE user_id = @user_id OR user_id IN (SELECT user_id FROM phpbb_flerex_linkedaccounts WHERE linked_user_id = @user_id) OR user_id IN (SELECT linked_user_id FROM phpbb_flerex_linkedaccounts WHERE user_id = @user_id);`,
      `SELECT username FROM phpbb_users WHERE user_id = @user_id OR user_id IN (SELECT user_id FROM phpbb_flerex_linkedaccounts WHERE linked_user_id = @user_id) OR user_id IN (SELECT linked_user_id FROM phpbb_flerex_linkedaccounts WHERE user_id = @user_id);`
    ].join(' ');
    con.query(sql, function (error, results, fields) {
      if (error) {
        console.error('Error connecting: ' +error.stack);
        return;
      }
      if (results[1].length == 0) {
        return;
      }
      var groups = [...new Set(results[1].map(r=>r.group_id))];
      var roles = groups.map(g=>config.group_roles[g].ID);
      var usernames = "";
      if (results[2].length == 1) {
        usernames = ` They're also known as ${results[2][0].username}.`;
      } else if (results[2].length > 1) {
        usernames = results[2].reduce((acc,cur,i)=>{
          const join = i+1 < results[2].length ? ", " : " and ";
          return acc == "" ? cur.username : acc + join + cur.username;
        },"");
        usernames = ` They're also known as ${usernames}.`;
      }
      member.roles.add(roles);
      const joinMessage = new Discord.MessageEmbed()
        .setColor('#76b852')
      	.setTitle(`Welcome ${member.user.username}!`)
        .setThumbnail(member.user.displayAvatarURL())
        .setDescription(`<@${member.user.id}> has hopped on in to the Eterna Discord! Everybody welcome them, although you might already know them from their account on the forums.${usernames}`)
        .setFooter(member.user.tag,member.user.displayAvatarURL())
        .setAuthor(member.client.user.username, member.client.user.displayAvatarURL())
        .setTimestamp()
      member.guild.channels.resolve(config.channels.joins).send({content:`<@${member.user.id}>`,embed:joinMessage});
    });
    con.end();
}
