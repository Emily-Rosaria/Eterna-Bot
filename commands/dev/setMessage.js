const Messages = require('./../../database/models/messages.js');

module.exports = {
    name: 'setmessage', // The name of the command
    description: 'Adds a message listener.', // The description of the command (for help text)
    perms: 'dev', //restricts to bot dev only (me)
    allowDM: false,
    args: 2,
    usage: '<messageID> <messageType> [messageData]', // Help text to explain how to use the command (if it had any arguments)
    async execute(message, args) {
        const messageID = args[0];
        const channelID = message.channel.id;
        const guildID = message.guild.id;
        if (args[1].toLowerCase() == "entrylistener" || args[1].toLowerCase() == "entry") {
          const filter = {type:"entryListener",guildID:guildID};
          const update = {
            messageID: messageID,
            channelID: channelID,
            guildID: guildID,
            type:"entryListener"
          };
          if (args[2]) {
            update.data = args[2];
          }
          await Messages.findOneAndUpdate(filter,update,{
            new: true,
            upsert: true // Make this update into an upsert if no entryListener exists
          }).exec();
          message.reply("Done!");
        } else {
          message.reply("Invalid message type.");
        }
    },
};
