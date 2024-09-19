const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const { getCooldown, setCooldown, getKey, getAllKeys, getUserGlobalCooldown, setUserGlobalCooldown, getBlacklist } = require('../config/database');
const { products, durations } = require('../config/constants');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (interaction.isCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        } else if (interaction.isButton()) {
            if (interaction.customId === 'start_redeem') {
                const productOptions = products.map(product => ({
                    label: product.name,
                    value: product.value,
                }));

                // Check if user is blacklisted
                const blacklist = await getBlacklist(interaction.user.id);
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
                const userGlobalCooldown = await getUserGlobalCooldown(interaction.user.id);
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

                // Acknowledge the interaction immediately
                await interaction.deferReply({ ephemeral: true });

                const productSelect = new StringSelectMenuBuilder()
                    .setCustomId('select_product')
                    .setPlaceholder('Select a product')
                    .addOptions(productOptions);

                const row = new ActionRowBuilder().addComponents(productSelect);

                await interaction.editReply({ content: 'Select a product:', components: [row] });
            } else if (interaction.customId === 'check_stock') {
                // Acknowledge the interaction immediately
                await interaction.deferReply({ ephemeral: true });

                const keys = await getAllKeys();
                const stockMap = {};

                // Group keys by product and time
                keys.forEach(key => {
                    const productTime = `${key.product}-${key.time}`;
                    if (!stockMap[productTime]) {
                        stockMap[productTime] = 0;
                    }
                    stockMap[productTime]++;
                });

                // Format the stock message
                const stockMessage = Object.entries(stockMap)
                    .map(([productTime, count]) => {
                        const [product, time] = productTime.split('-');
                        const productName = products.find(p => p.value === product)?.name || product;
                        const timeName = durations.find(d => d.value === time)?.name || time;
                        return `${productName} ${timeName} - (${count})`;
                    })
                    .join('\n') || 'No keys available';

                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('Stock Information')
                    .setDescription(stockMessage);

                await interaction.editReply({ embeds: [embed] });
            }
        } else if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'select_product') {
                const selectedProduct = interaction.values[0];
                const timeOptions = durations.map(duration => ({
                    label: duration.name,
                    value: `${selectedProduct}:${duration.value}`,
                }));

                const timeSelect = new StringSelectMenuBuilder()
                    .setCustomId('select_time')
                    .setPlaceholder('Select a time period')
                    .addOptions(timeOptions);

                const row = new ActionRowBuilder().addComponents(timeSelect);

                await interaction.update({ content: 'Select a time period:', components: [row], ephemeral: true });
            } else if (interaction.customId === 'select_time') {
                const [selectedProduct, selectedTime] = interaction.values[0].split(':');
                // Handle the selected product and time
                await handleRedemption(interaction, selectedProduct, selectedTime);
            }
        }
    },
};

async function handleRedemption(interaction, product, time) {
    const userId = interaction.user.id;
    const username = interaction.user.username;
    if (!product || !time) {
        await interaction.reply({ content: 'Invalid product or time selection.', ephemeral: true });
        return;
    }

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
}
