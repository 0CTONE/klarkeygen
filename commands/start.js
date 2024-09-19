const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('start')
        .setDescription('Start the key redemption process'),
    async execute(interaction) {
        const button = new ButtonBuilder()
            .setCustomId('start_redeem')
            .setLabel('Redeem a Key')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);

        await interaction.reply({ content: 'Click the button to redeem a key:', components: [row], ephemeral: true });
    },
};
