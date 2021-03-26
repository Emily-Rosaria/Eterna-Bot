require('dotenv').config(); //for .env file

/*
const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => res.send('Hello World!'));

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));
*/
// Bot stuff below

const Reddit = require('reddit'); // Reddit
const fetch = require('node-fetch'); // This lets me get stuff from api.
const Booru = require('booru'); // This lets me get stuff from weeb sites.
const fs = require('fs');                               // Loads the Filesystem library
const path = require("path");
const Discord = require('discord.js');                  // Loads the discord API library
const Canvas = require('canvas'); // Pretty pictures
const readline = require('readline');
const {google} = require('googleapis');

const config = require('./config.json');

const dev = config.perms.dev[0]; // my ID on Discord

var mysql = require('mysql'); // remote SQL library
const connectSQL = require("./database/connectSQL.js"); // remote database connection

// const mongoose = require("mongoose"); // database library
// const connectDB = require("./database/connectDB.js"); // local database connection
// var database = "eterna"; // Database name

const client = new Discord.Client({ retryLimit: 3, restRequestTimeout: 25000, partials: ['USER', 'GUILD_MEMBER'] }); // Initiates the client

client.commands = new Discord.Collection(); // Creates an empty list in the client object to store all commands
const getAllCommands = function (dir, cmds) {
  files = fs.readdirSync(dir, { withFileTypes: true });
  fileArray = cmds || [];
  files.forEach((file) => {
    if (file.isDirectory()) {
      const newCmds = fs.readdirSync(dir + '/' + file.name);
      fileArray = fileArray.concat(newCmds.map((f) => dir + '/' + file.name + '/' + f));
    } else if (file.name.endsWith('.js')) {
      fileArray = fileArray.concat([dir + '/' + file.name]);
    }
  });
  return fileArray;
};
const commandFiles = getAllCommands('./commands').filter(file => file.endsWith('.js')); // Loads the code for each command from the "commands" folder

// Loops over each file in the command folder and sets the commands to respond to their name
for (const file of commandFiles) {
    const command = require(file);
    client.commands.set(command.name, command);
}

const cooldowns = new Discord.Collection(); // Creates an empty list for storing timeouts so people can't spam with commands

// Starts the bot and makes it begin listening for commands.
client.on('ready', async function() {
    client.bootTime = (new Date()).getTime();
    client.user.setPresence({ activity: { type: 'PLAYING', name: 'in a World of Wonder' }, status: 'online' });
    console.log(`${client.user.username} is up and running! Launched at: ${(new Date()).toUTCString()}.`);
});

/**
 * This function controls how the bot reacts to messages it receives
 */
client.on('message', async message => {
    if (message.author.bot) {return}
    const botPing = ["<@" + message.client.user.id + ">","<@!" + message.client.user.id + ">"]; // with and without a nickname
    let gID = "dm";
    if (message.channel.type != "dm") {
      gID = message.guild.id;
    }

    // Ignore bot messages and messages that dont start with the prefix defined in the config data
    const prefix = config.prefix.concat(botPing).filter(p => message.content.toLowerCase().startsWith(p));
    if (prefix.length == 0) {return}

    // Split commands and arguments from message so they can be passed to functions
    const args = message.content.slice(prefix[0].length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase().replace(/[-_]/,'');

    // If the command isn't in the  command folder, move on
    const command = client.commands.get(commandName)
        || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
    if(!command) return;

    // If the command requires arguments, make sure they're there.
    if (command.args && !args.length) {
        let reply = 'That command requires more details!';

        // If we have details on how to use the args, provide them
        if (command.usage) {
            reply += `\nThe proper usage would be: \`${prefix}${command.name} ${command.usage}\``;
        }

        // Send a reply from the bot about any error encountered
        return message.channel.send(reply);
    }

    /**
     * The following block of code handles "cooldowns" making sure that users can only use a command every so often.
     * This is helpful for commands that require loading time or computation, like image requests.
     */
    if(!cooldowns.has(command.name)) {
        cooldowns.set(command.name, new Discord.Collection());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(command.name);
    const cooldownAmount = (command.cooldown || 3 ) * 1000;

    if(!timestamps.has(message.author.id)) {
        timestamps.set(message.author.id, now);
        setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
    } else {
        const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

        if(now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;
            return message.reply(`Whoa! You're sending commands too fast! Please wait ${timeLeft.toFixed(1)} more second(s) before running \`${command.name}\` again!`);
        }

        timestamps.set(message.author.id, now);
        setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
    }

    /**
     * End cooldown code, begin checking if the user has the right permissions. Possible perms include:
     * User - all users may use it
     * Basic - only users with basic access
     * Advanced - only users with "verified" access
     * Trusted - only users "trusted" by the server owner (i.e. given a role)
     * Botcommander - given ability to use all commands
     * Dev - only usable by me
     * Owner - only useable by server owner
     */

    if(command.perms) {
      if (message.channel.type == "dm") {
        if (!command.allowDM) {
          return message.reply("This command is not available for use in DMs.")
        }
      } else if (message.author.id != dev) {
        const roleCache = message.member.roles.cache; // get role cache

        // check perms for admin commands
        if ((command.perms == "admin") && (!config.perms.admin.some(r => roleCache.has(r)) || !message.member.hasPermission("ADMINISTRATOR"))) {
          return message.reply("You do not have the required permissions to use this command; this command is only for administrators.");
        }

        else if ((command.perms == "mod") && (!config.perms.mod.some(r => roleCache.has(r)))) {
          return message.reply("You do not have the required permissions to use this command; this command is only for moderators.");
        }

        else if ((command.perms == "donator") && (!config.perms.donator.some(r => roleCache.has(r)))) {
          return message.reply("You do not have the required permissions to use this command; this command is only for donators.");
        }

        else if ((command.perms == "roleplayer") && (!config.perms.roleplayer.some(r => roleCache.has(r)))) {
          return message.reply("You do not have the required permissions to use this command; this command is only for approved roleplayers. Come back once you've made a character and got them approved!");
        }

        else if ((command.perms == "registered") && (!config.perms.registered.some(r => roleCache.has(r)))) {
          return message.reply("You do not have the required permissions to use this command; this command is only for registered users who have made an account on the website.");
        }
      }
    }

    try {
        // Run the command
        await command.execute(message, args);
    } catch(error) {
        console.error(error);
        message.reply('Sorry! I ran into an error trying to do that!');
        const devUser = client.users.cache.get(dev);
        const msg = (message.content.length > 200) ? message.content.slice(0,200) + ' [...]' : message.content;
        const errmsg = (error.stack.toString().length > 1500) ? error.stack.toString().slice(0,1500) + '...' : error.stack;
        const errLocation = message.channel.type == "dm" ? 'in `Direct Messages`' : 'from `'+message.guild.name+'` in `'+message.channel.name+'`';
        devUser.send('Error running command: `'+msg+'`\nSender: `'+message.author.username+'#'+message.author.discriminator+'` '+errLocation+'\nError Report:\n```'+errmsg+'```');
    }
});

client.on('guildMemberAdd', async member => {

  //welcome message

});

client.on('guildMemberRemove', async member => {

  //leave message

});

// connectDB("mongodb://localhost:27017/"+database);

const sqlConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: "3306"
};
connectSQL(sqlConfig).end(); // Test database connection

client.login(process.env.TOKEN); // Log the bot in using the token provided in the .env file
