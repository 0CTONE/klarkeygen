const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Set up the key redemption and stock buttons'),
    async execute(interaction) {
        const redeemButton = new ButtonBuilder()
            .setCustomId('start_redeem')
            .setLabel('Redeem a Key')
            .setStyle(ButtonStyle.Primary);

        const stockButton = new ButtonBuilder()
            .setCustomId('check_stock')
            .setLabel('Check Stock')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(redeemButton, stockButton);

        await interaction.channel.send({ content: 'Click a button to proceed:', components: [row] });
        await interaction.reply({ content: 'Buttons have been set up!', ephemeral: true });
    },
};
