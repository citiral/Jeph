import { Client, Message, RichEmbed, MessageReaction, TextChannel, User } from "discord.js";

module.exports = (client: Client, db: any) => {
    function createMessageRichEmbed(message: Message, count: number) {
        const embed = new RichEmbed();

        message.attachments.forEach(attachment => embed.setImage(attachment.url));
        embed.setTitle("Content");
        embed.setDescription(message.content);
        embed.setURL(message.url)
        embed.addField("Author", message.author, true);
        embed.addField("Channel", message.channel, true);
        embed.setFooter(`⭐ ${count} stars • ${message.createdAt.toDateString()}`);

        return embed;
    }

    function addMessageMapping(original: Message, starmessage: Message) {
        db.get('reactions').push({id: original.id, reaction: starmessage.id}).write();
    }

    function removeMessageMapping(original: Message) {
        let reactionmessage: any = db.get('reactions').find((reaction: any) => reaction.id == original.id).value();
        db.get('reactions').remove(reactionmessage).write();
    }

    function setMessageStarcount(starboard: TextChannel, message: Message, reaction: MessageReaction) {
        // Look up if this message has been reacted to before
        let reactionmessage: any = db.get('reactions').find((reaction: any) => reaction.id == message.id).value();

        // Calculate the count of the message 
        let count: number = reaction.count;
        if (reaction.users.has(message.author.id)) {
            count -= 1;
            console.log("user had reacted to his own message");
        }
        
        // If the message has not enough stars, remove the old message reaction
        if (count < 1) {
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
                .then((starmessage: Message | Message[]) => addMessageMapping(message, starmessage as Message))
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

    client.on('messageReactionAdd', (reaction: MessageReaction, user: User) => {
        // We are only interested in stars
        if ((reaction as any)._emoji.name == "⭐") {
            console.log(`Message got starred! :)`);

            // User can't star himself
            if (user.id == reaction.message.author.id) {
                reaction.message.channel.send(`${user}, you can't star your own messages.`);
                return;
            }

            // Find the starboard of this guild
            const starboard: TextChannel = reaction.message.guild.channels.find(ch => ch.name === "starboard") as TextChannel;
            if (starboard == undefined) {
                console.log(`No starboard found for guild ${reaction.message.guild.name}.`);
                return;
            }

            // Reply with the amount of stars if this message
            setMessageStarcount(starboard, reaction.message, reaction);
        }
    });

    client.on('messageReactionRemove', (reaction: MessageReaction) => {
        // We are only interested in stars
        if (reaction.emoji.name == "⭐") {
            console.log(`Message got unstarred! :(`);

            // Find the starboard of this guild
            const starboard: TextChannel = reaction.message.guild.channels.find(ch => ch.name === "starboard") as TextChannel;
            if (starboard == undefined) {
                console.log(`No starboard found for guild ${reaction.message.guild.name}.`);
                return;
            }

            // Reply with the amount of stars if this message
            setMessageStarcount(starboard, reaction.message, reaction);
        }
    });
}