import { Message, Client, Channel, TextChannel } from "discord.js";
require('dotenv').config();
const Low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const client: Client = new Client();
const db = Low(new FileSync("database.json"));

db.defaults({reactions: [], poop: []}).write();

//https://github.com/AnIdiotsGuide/discordjs-bot-guide/blob/master/coding-guides/raw-events.md
client.on('raw', (packet: any) => {
    // We don't want this to run on unrelated packets
    if (!['MESSAGE_REACTION_ADD', 'MESSAGE_REACTION_REMOVE'].includes(packet.t)) return;
    
    // Grab the channel to check the message from
    const channel: TextChannel = client.channels.get(packet.d.channel_id) as TextChannel;
    
    // There's no need to emit if the message is cached, because the event will fire anyway for that
    if (channel.messages.has(packet.d.message_id)) return;
    
    // Since we have confirmed the message is not cached, let's fetch it
    channel.fetchMessage(packet.d.message_id).then((message: Message) => {
        
        // Emojis can have identifiers of name:id format, so we have to account for that case as well
        const emoji = packet.d.emoji.id ? `${packet.d.emoji.name}:${packet.d.emoji.id}` : packet.d.emoji.name;
        
        // This gives us the reaction we need to emit the event properly, in top of the message object
        const reaction = message.reactions.get(emoji);
        
        // Adds the currently reacting user to the reaction's users collection.
        if (reaction) reaction.users.set(packet.d.user_id, client.users.get(packet.d.user_id));
        
        // Check which type of event it is before emitting
        if (packet.t === 'MESSAGE_REACTION_ADD') {
            client.emit('messageReactionAdd', reaction, client.users.get(packet.d.user_id));
        }
        if (packet.t === 'MESSAGE_REACTION_REMOVE') {
            client.emit('messageReactionRemove', reaction, client.users.get(packet.d.user_id));
        }
    });
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

require("./starboard.js")(client, db);
require("./poop.js")(client, db);

client.login(process.env.CLIENT_SECRET_KEY);