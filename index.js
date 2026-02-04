const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { Client, Collection, Events, GatewayIntentBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { initializeStorage, isKeyUsed, isUserOnCooldown, setUserCooldown, markKeyAsUsed, saveRequest } = require('./storage');

// Initialize storage
initializeStorage();

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

// Load commands
client.commands = new Collection();

// Handle slash command interactions
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'redeem') {
    await handleRedeemCommand(interaction);
  }
});

// Handle modal submissions
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isModalSubmit()) return;
  
  if (interaction.customId === 'redeemModal') {
    await handleRedeemModal(interaction);
  }
});

// Handle /redeem command
async function handleRedeemCommand(interaction) {
  const userId = interaction.user.id;
  const username = interaction.user.tag;

  // Check if user is on cooldown
  if (isUserOnCooldown(userId)) {
    const cooldownEmbed = new EmbedBuilder()
      .setColor('#ff6b6b')
      .setTitle('⏰ Cooldown Active')
      .setDescription('You must wait 10 minutes between redeem requests.')
      .setTimestamp();

    return await interaction.reply({ 
      embeds: [cooldownEmbed], 
      ephemeral: true 
    });
  }

  // Create and show modal
  const modal = new ModalBuilder()
    .setCustomId('redeemModal')
    .setTitle('Redeem Key');

  const redeemKeyInput = new TextInputBuilder()
    .setCustomId('redeemKey')
    .setLabel('Redeem Key')
    .setPlaceholder('Enter your redeem key...')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const inviteLinkInput = new TextInputBuilder()
    .setCustomId('inviteLink')
    .setLabel('Discord Server Invite Link')
    .setPlaceholder('https://discord.gg/your-invite-code')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const firstActionRow = new ActionRowBuilder().addComponents(redeemKeyInput);
  const secondActionRow = new ActionRowBuilder().addComponents(inviteLinkInput);

  modal.addComponents(firstActionRow, secondActionRow);

  await interaction.showModal(modal);
}

// Handle modal submission
async function handleRedeemModal(interaction) {
  const userId = interaction.user.id;
  const username = interaction.user.tag;
  const redeemKey = interaction.fields.getTextInputValue('redeemKey').trim();
  const inviteLink = interaction.fields.getTextInputValue('inviteLink').trim();
  const email = process.env.REDEEM_EMAIL || 'burhanw997@gmail.com';

  // Validate inputs
  if (!redeemKey) {
    const errorEmbed = new EmbedBuilder()
      .setColor('#ff6b6b')
      .setTitle('❌ Invalid Input')
      .setDescription('Redeem key cannot be empty.')
      .setTimestamp();

    return await interaction.reply({ 
      embeds: [errorEmbed], 
      ephemeral: true 
    });
  }

  // Validate Discord invite link format
  if (!isValidDiscordInvite(inviteLink)) {
    const errorEmbed = new EmbedBuilder()
      .setColor('#ff6b6b')
      .setTitle('❌ Invalid Invite Link')
      .setDescription('Please provide a valid Discord.gg invite link.')
      .setTimestamp();

    return await interaction.reply({ 
      embeds: [errorEmbed], 
      ephemeral: true 
    });
  }

  // Check if key is already used
  if (isKeyUsed(redeemKey)) {
    const errorEmbed = new EmbedBuilder()
      .setColor('#ff6b6b')
      .setTitle('❌ Key Already Used')
      .setDescription('This redeem key has already been used.')
      .setTimestamp();

    return await interaction.reply({ 
      embeds: [errorEmbed], 
      ephemeral: true 
    });
  }

  // Set user cooldown
  setUserCooldown(userId);

  // Mark key as used
  markKeyAsUsed(redeemKey);

  // Create request data
  const requestData = {
    userId,
    username,
    redeemKey,
    invite: inviteLink,
    email,
    status: 'PENDING',
    timestamp: new Date().toISOString(),
  };

  // Save request
  saveRequest(requestData);

  // Send immediate processing message
  const processingEmbed = new EmbedBuilder()
    .setColor('#f39c12')
    .setTitle('⏳ Processing Request')
    .setDescription('Processing your request...')
    .setTimestamp();

  await interaction.reply({ 
    embeds: [processingEmbed], 
    ephemeral: true 
  });

  // Update with confirmation message
  setTimeout(async () => {
    try {
      const confirmEmbed = new EmbedBuilder()
        .setColor('#27ae60')
        .setTitle('✅ Request Received')
        .setDescription('Your request has been received. You\'ll be updated shortly.')
        .addFields(
          { name: 'Redeem Key', value: `\`${redeemKey}\``, inline: true },
          { name: 'Status', value: 'PENDING', inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [confirmEmbed], ephemeral: true });
    } catch (error) {
      console.error('Error updating interaction:', error);
    }
  }, 1000);

  // Log to admin channel
  await logToAdminChannel(requestData);
}

// Validate Discord invite link format
function isValidDiscordInvite(link) {
  const discordInviteRegex = /^https:\/\/discord\.gg\/[a-zA-Z0-9]+$/;
  return discordInviteRegex.test(link);
}

// Log to admin channel
async function logToAdminChannel(requestData) {
  try {
    const logsChannelId = process.env.REDEEM_LOGS_CHANNEL_ID;
    if (!logsChannelId) {
      console.error('REDEEM_LOGS_CHANNEL_ID not configured');
      return;
    }

    const channel = await client.channels.fetch(logsChannelId);
    if (!channel) {
      console.error('Could not find logs channel');
      return;
    }

    const logEmbed = new EmbedBuilder()
      .setColor('#3498db')
      .setTitle('🔔 New Redeem Request')
      .addFields(
        { name: 'User', value: `${requestData.username} (${requestData.userId})`, inline: false },
        { name: 'Redeem Key', value: `\`${requestData.redeemKey}\``, inline: true },
        { name: 'Invite Link', value: requestData.invite, inline: true },
        { name: 'Email', value: requestData.email, inline: true },
        { name: 'Status', value: requestData.status, inline: true },
        { name: 'Timestamp', value: new Date(requestData.timestamp).toLocaleString(), inline: false }
      )
      .setTimestamp()
      .setFooter({ text: 'Redeem Bot Logs' });

    await channel.send({ embeds: [logEmbed] });
  } catch (error) {
    console.error('Error logging to admin channel:', error);
  }
}

// Bot ready event
client.once(Events.ClientReady, c => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
  
  // Clean up old cooldowns on startup
  const { cleanupOldCooldowns } = require('./storage');
  cleanupOldCooldowns();
});

// Error handling
client.on('error', error => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

// Login to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);
