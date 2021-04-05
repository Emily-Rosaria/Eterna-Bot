const mongoose = require("mongoose"); // Import mongoose library
const Schema = mongoose.Schema; // Define Schema method

// Schema
var MessagesSchema = new Schema({ // Create Schema
    messageID: {type: String, required: true}, // ID of message on Discord
    guildID: {type: String, required: true}, // ID of message's guild on Discord
    channelID: {type: String, required: true}, // ID of message's channel on Discord
    type: {type: String, default: ""}, // Type of message (i.e. is it a listener for reactions or?)
    data: {type: String, default: ""} // Additional data (such as the roles to give if someone reacts, and so on)
});

MessagesSchema.virtual('id').get(function() {
  return this.messageID;
});

// Model
var Messages = mongoose.model("Messages", MessagesSchema); // Create collection model from schema
module.exports = Messages; // export model
