const { MessageEmbed } = require('discord.js');

function createEmbed(color, title, description) {
    return new MessageEmbed()
        .setColor(color)
        .setTitle(title)
        .setDescription(description);
}

module.exports = {
    createEmbed,
};
