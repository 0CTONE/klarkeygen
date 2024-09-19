const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const { getAllKeys } = require('../config/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stock')
        .setDescription('Display current stock of keys in the database'),
    async execute(interaction) {
        const allKeys = await getAllKeys();
        const stockCount = allKeys.reduce((acc, key) => {
            const keyIdentifier = `${key.product} - ${key.time}`;
            if (!acc[keyIdentifier]) {
                acc[keyIdentifier] = 0;
            }
            acc[keyIdentifier]++;
            return acc;
        }, {});

        const stockDescription = Object.entries(stockCount)
            .map(([key, count]) => `${key}: ${count}`)
            .join('\n');

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Current Stock')
            .setDescription(stockDescription || 'No keys available.');

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
