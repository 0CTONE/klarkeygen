const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const { getCooldown, setCooldown, getKey, getUserGlobalCooldown, setUserGlobalCooldown, getBlacklist } = require('../config/database');
const { products, durations } = require('../config/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('redeem')
        .setDescription('Redeem a key')
        .addStringOption(option =>
            option.setName('product')
                .setDescription('The product to redeem')
                .setRequired(true)
                .addChoices(...products.map(product => ({ name: product.name, value: product.value }))))
        .addStringOption(option =>
            option.setName('time')
                .setDescription('The time period for the key')
                .setRequired(true)
                .addChoices(...durations.map(duration => ({ name: duration.name, value: duration.value })))),
    async execute(interaction) {
        const product = interaction.options.getString('product');
        const time = interaction.options.getString('time');
        const userId = interaction.user.id;
        const username = interaction.user.username;

        // Check if user is blacklisted
        const blacklist = await getBlacklist(userId);
        if (blacklist) {
            const blacklistEnd = new Date(blacklist.blacklist_end);
            if (blacklistEnd > new Date()) {
                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('Blacklisted')
                    .setDescription(`You are blacklisted until ${blacklistEnd.toISOString()}`);
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }
        }

        // Check for user-specific global cooldown
        const userGlobalCooldown = await getUserGlobalCooldown(userId);
        if (userGlobalCooldown) {
            const cooldownEnd = new Date(userGlobalCooldown.cooldown_end);
            if (cooldownEnd > new Date()) {
                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('Global Cooldown Active')
                    .setDescription(`You are on cooldown until ${cooldownEnd.toISOString()}`);
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }
        }

        const key = await getKey(product, time);
        if (!key) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('No Keys Available')
                .setDescription('There are no keys available for this product and time.');
            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        let cooldownEnd = new Date();
        if (time === '24hr') cooldownEnd.setDate(cooldownEnd.getDate() + 1);
        else if (time === '168hr') cooldownEnd.setDate(cooldownEnd.getDate() + 7);
        else if (time === '730hr') cooldownEnd.setMonth(cooldownEnd.getMonth() + 1);

        await setCooldown(userId, product, cooldownEnd);
        await setUserGlobalCooldown(userId, cooldownEnd);

        const logChannel = interaction.client.channels.cache.get(process.env.LOG_CHANNEL_ID);
        if (logChannel) {
            logChannel.send(`User ${username} (${userId}) redeemed a key for ${product} (${time}).`);
        }

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Key Redeemed')
            .setDescription(`Your key for ${product} (${time}) is: ${key}`);
        await interaction.user.send({ embeds: [embed] });

        const replyEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Key Redeemed')
            .setDescription('The key has been sent to your DMs.');
        await interaction.reply({ embeds: [replyEmbed], ephemeral: true });
    },
};
