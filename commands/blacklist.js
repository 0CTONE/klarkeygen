const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const { setBlacklist } = require('../config/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blacklist')
        .setDescription('Blacklist a user from redeeming keys for a specified duration')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to blacklist')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('The duration of the blacklist (e.g., 24hr, 168hr, 730hr)')
                .setRequired(true)),
    async execute(interaction) {
        const roleId = process.env.BLACKLIST_ROLE_ID;
        const member = interaction.guild.members.cache.get(interaction.user.id);

        if (!member.roles.cache.has(roleId)) {
            await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
            return;
        }

        const user = interaction.options.getUser('user');
        const duration = interaction.options.getString('duration');

        let blacklistEnd = new Date();
        if (duration === '24hr') blacklistEnd.setDate(blacklistEnd.getDate() + 1);
        else if (duration === '168hr') blacklistEnd.setDate(blacklistEnd.getDate() + 7);
        else if (duration === '730hr') blacklistEnd.setMonth(blacklistEnd.getMonth() + 1);
        else {
            await interaction.reply({ content: 'Invalid duration specified.', ephemeral: true });
            return;
        }

        await setBlacklist(user.id, blacklistEnd);

        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('User Blacklisted')
            .setDescription(`User ${user.username} has been blacklisted until ${blacklistEnd.toISOString()}`);
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
