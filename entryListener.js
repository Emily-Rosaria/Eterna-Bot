const config = require('./config.json');
const Discord = require('discord.js');
const Messages = require("./database/models/messages.js"); // database with server configs

async function listener(client) {

    const doc = await Messages.findOne({type: "entryListener", guildID: config.guild}).exec();

    if (!doc) {
      console.log("No entry listener.");
      return false;
    }

    const guild = await client.guilds.fetch(config.guild);
    const channel = guild.channels.resolve(doc.channelID);
    try {
      const message = await channel.messages.fetch(doc.messageID);
    } catch (err) {
      console.log("No entry listener message.");
    }
    
    const filter = (reaction, user) => {
      return reaction.emoji.name == "✅";
    };

    if (!message || message.deleted) {
      return false;
    }

    const collector = message.createReactionCollector(filter, { time: 10*60*1000 }); // run for 10 minutes

    collector.on('collect', (reaction, user) => {
      const joinChannel = guild.channels.resolve(config.channels.joins);
      guild.members.fetch(user.id).then((member)=>{
        const userRoles = [...member.roles.cache.keys()];
        if (!userRoles.includes(config.roles.unregistered) && !userRoles.includes(config.roles.registered)) {
          member.roles.add(config.roles.unregistered);
          const joinMessage = new Discord.MessageEmbed()
            .setColor('#76b852')
            .setTitle(`Welcome ${member.user.username}!`)
            .setThumbnail(member.user.displayAvatarURL())
            .setDescription(`<@${member.user.id}> has hopped on in to the Eterna Discord! Everybody welcome them! Since they haven't yet made an account on the forums or got around to linking it with discord, they should make sure to check <#${config.channels.rules}>.`)
            .setFooter(member.user.tag,member.user.displayAvatarURL())
            .setAuthor(member.client.user.username, member.client.user.displayAvatarURL())
            .setTimestamp()
          joinChannel.send({content:`<@${member.user.id}>`,embed:joinMessage});
        }
      }).catch((err)=>{
        console.error(err);
      });
    });

    collector.on('end', collected => {
    	listener(client);
    });
}

module.exports = function(client) {
  listener(client);
};
