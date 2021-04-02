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

module.exports = async function(client) {
    var con = mysql.createConnection(sqlConfig);
    const sql = [
      'SELECT `provider`, `user_id`, `oauth_provider_id` FROM `phpbb_oauth_accounts` WHERE `provider` = "studio_discord"; ',
      'SELECT `user_id`, `linked_user_id` FROM `phpbb_flerex_linkedaccounts`; ',
      'SELECT `user_id`, `group_id` FROM `phpbb_user_group` WHERE NOT `group_id` = 6'
    ].join('');
    con.query(sql, function (error, results, fields) {
      if (error) {
        console.error('Error connecting: ' +error.stack);
        return;
      }
      var users = results[0].map(r=>{
        let temp = {};
        temp.discordID = r.oauth_provider_id;
        temp.forumIDs = [r.user_id];
        temp.group_IDs = [];
        temp.roles = [];
        return temp;
      }).sort((a,b)=>{
        return a - b;
      });
      var userIDs = users.map(u => {
        return u.forumIDs[0];
      });
      const links = results[1].filter(r => {
        return Object.values(r).some(x=>userIDs.includes(x));
      }).sort((a,b)=>{
        return Math.min(Object.values(a)) - Math.min(Object.values(b));
      }).map(l => {
        return Object.values(l);
      });

      let index = 0;
      links.forEach((vals, i) => {
        if (users[index % users.length].forumIDs.includes(vals[0])) {
          users[index].forumIDs = users[index].forumIDs.concat(vals[1]);
          userIDs.push(vals[1]);
          return;
        } else if (users[index % users.length].forumIDs.includes(vals[1])) {
          users[index].forumIDs = users[index].forumIDs.concat(vals[0]);
          userIDs.push(vals[0]);
          return;
        }

        index = index + 1 < users.length ? index + 1 : index;

        if (users[index % users.length].forumIDs.includes(vals[0])) {
          users[index].forumIDs = users[index].forumIDs.concat(vals[1]);
          userIDs.push(vals[1]);
          return;
        } else if (users[index % users.length].forumIDs.includes(vals[1])) {
          users[index].forumIDs = users[index].forumIDs.concat(vals[0]);
          userIDs.push(vals[0]);
          return;
        }
      });

      const groups = results[2].filter(r => userIDs.includes(r.user_id)).sort((a,b)=>{
        return a.user_id - b.user_id;
      });

      index = 0;

      groups.forEach((group, i) => {
        if (users[index].forumIDs.includes(group.user_id)) {
          users[index].group_IDs = users[index].group_IDs.concat(group.group_id);
        } else if (users[index+1].forumIDs.includes(group.user_id)) {
          users[index+1].group_IDs = users[index+1].group_IDs.concat(group.group_id);
        }
      });
      users = users.map(u=>{
        var temp = u;
        temp.group_IDs = [...new Set(u.group_IDs)];
        temp.roles = temp.group_IDs.map(g => {
          return config.group_roles["" + g];
        }).filter(r => {
          return r;
        });
        return temp;
      });
      const discord_IDs = users.map(u=>u.discordID);
      client.guilds.fetch(config.guild).then(guild => guild.members.fetch({user: discord_IDs}).then(async(members) => {
        for (const id of members.keyArray()) {
          const i = discord_IDs.indexOf(id);
          if (i > -1) {
            var roles = users[i].roles;
            const roleIDs = roles.map(r=>r.ID);
            if (roleIDs.length > 0) {
                await members.get(id).roles.add(roleIDs);
            }
            const remove = Object.keys(config.group_roles).filter(r=>{
              if (config.group_roles[r].Sticky) {
                return false;
              }
              else if (users[i].group_IDs.includes(Number(r))) {
                return false;
              }
              else {
                return true;
              }
            }).map(r=>config.group_roles[r].ID);
            if (remove.length > 0) {
                await members.get(id).roles.remove(remove);
            }
          }
        }
      }));
    });
    con.end();
}
