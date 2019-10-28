import { Client } from "discord.js";

let poopchance = 0.01

module.exports = (client: Client, db: any) => {
    /*client.on('message', (reaction:, user) => {
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
    });*/

}