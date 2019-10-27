require('dotenv').config()
const Discord = require("discord.js");
const Low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const client = new Discord.Client();
const db = Low(new FileSync("database.json"))


db.defaults({reactions: []}).write();

function createMessageRichEmbed(message, count) {
    const embed = new Discord.RichEmbed(message.content);

    message.attachments.forEach(attachment => embed.setImage(attachment.url));
    embed.setTitle("Content");
    embed.setDescription(message.content);
    embed.setURL(message.url)
    embed.addField("Author", message.author, true);
    embed.addField("Channel", message.channel, true);
    embed.setFooter(`⭐ ${count} stars • ${message.createdAt.toDateString()}`);

    return embed;
}

function addMessageMapping(original, starmessage) {
    db.get('reactions').push({id: original.id, reaction: starmessage.id}).write();
}

function removeMessageMapping(original) {
    reactionmessage = db.get('reactions').find(reaction => reaction.id == original.id).value();
    db.get('reactions').remove(reactionmessage).write();
}

function setMessageStarcount(starboard, message, reaction) {
    // Look up if this message has been reacted to before
    reactionmessage = db.get('reactions').find(reaction => reaction.id == message.id).value();

    // Calculate the count of the message 
    let count = new Number(reaction.count);
    if (reaction.users.has(message.author.id)) {
        count -= 1;
        console.log("user had reacted to his own message");
    }
    
    // If the message has no more stars, remove the old message reaction
    if (count == 0) {
        if (reactionmessage != undefined) {
            console.log(`Removing reaction message.`);
            removeMessageMapping(message);
            starboard.fetchMessage(reactionmessage.reaction).then(message => {
                return message.delete();
            }).catch(console.error);
        }

        return;
    }
    
    // If it is the first star, create a message and store it in the db
    if (reactionmessage == undefined) {
        console.log(`Created new reaction message.`);
        starboard.send('', createMessageRichEmbed(reaction.message, count))
            .then(starmessage => addMessageMapping(message, starmessage))
            .catch(console.error);
    }
    // Otherwise, get the original reaction message and edit it
    else {
        console.log(`Editing reaction message.`);
        starboard.fetchMessage(reactionmessage.reaction).then(message => {
            return message.edit(createMessageRichEmbed(reaction.message, count));
        }).catch( error => {
            console.log(error);
            removeMessageMapping(message);
        });
    }
}

client.on('messageReactionAdd', (reaction, user) => {
    // We are only interested in stars
    if (reaction._emoji.name == "⭐") {
        console.log(`Message got starred! :)`);

        // User can't star himself
        if (user.id == reaction.message.author.id) {
            reaction.message.channel.send(`${user}, you can't star your own messages.`);
            return;
        }

        // Find the starboard of this guild
        const starboard = reaction.message.guild.channels.find(ch => ch.name === "starboard");
        if (starboard == undefined) {
            console.log(`No starboard found for guild ${reaction.message.guild.name}.`);
            return;
        }

        // Reply with the amount of stars if this message
        setMessageStarcount(starboard, reaction.message, reaction);
    }
});

client.on('messageReactionRemove', reaction => {
    // We are only interested in stars
    if (reaction.emoji.name == "⭐") {
        console.log(`Message got unstarred! :(`);

        // Find the starboard of this guild
        const starboard = reaction.message.guild.channels.find(ch => ch.name === "starboard");
        if (starboard == undefined) {
            console.log(`No starboard found for guild ${reaction.message.guild.name}.`);
            return;
        }

        // Reply with the amount of stars if this message
        setMessageStarcount(starboard, reaction.message, reaction);
    }
});

//https://github.com/AnIdiotsGuide/discordjs-bot-guide/blob/master/coding-guides/raw-events.md
client.on('raw', packet => {
    // We don't want this to run on unrelated packets
    if (!['MESSAGE_REACTION_ADD', 'MESSAGE_REACTION_REMOVE'].includes(packet.t)) return;
    
    // Grab the channel to check the message from
    const channel = client.channels.get(packet.d.channel_id);
    
    // There's no need to emit if the message is cached, because the event will fire anyway for that
    if (channel.messages.has(packet.d.message_id)) return;
    
    // Since we have confirmed the message is not cached, let's fetch it
    channel.fetchMessage(packet.d.message_id).then(message => {
        
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

client.login(process.env.CLIENT_SECRET_KEY);