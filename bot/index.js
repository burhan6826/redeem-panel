require('dotenv').config();
const { Client, Events, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const database = require('../server/database');

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Store active message IDs for button interactions
const activeMessages = new Map();

// Function to format timestamp
function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString();
}

// Function to create request embed
function createRequestEmbed(request) {
  const embed = new EmbedBuilder()
    .setColor(request.status === 'PENDING' ? '#f39c12' : 
              request.status === 'APPROVED' ? '#27ae60' : '#e74c3c')
    .setTitle(`🔔 Redeem Request #${request.id}`)
    .addFields(
      { name: '👤 Client Name', value: request.name, inline: true },
      { name: '🔑 Redeem Key', value: `\`${request.redeemKey}\``, inline: true },
      { name: '📧 Email', value: request.email, inline: false }
    );

  // Add Order ID if it exists
  if (request.orderId) {
    embed.addFields({ name: '🛒 Order ID', value: request.orderId, inline: true });
  }

  embed.addFields(
    { name: '🔗 Invite Link', value: request.inviteLink, inline: false },
    { name: '📊 Status', value: request.status, inline: true },
    { name: '🕐 Timestamp', value: formatTimestamp(request.timestamp), inline: true }
  );

  if (request.ipAddress) {
    embed.addFields({ name: '🌐 IP Address', value: `\`${request.ipAddress}\``, inline: true });
  }

  embed.setTimestamp()
       .setFooter({ text: 'Redeem Panel Bot' });

  return embed;
}

// Function to create action buttons
function createActionButtons(requestId) {
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`approve_${requestId}`)
        .setLabel('✅ Approve')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`reject_${requestId}`)
        .setLabel('❌ Reject')
        .setStyle(ButtonStyle.Danger)
    );

  return row;
}

// Function to send new request notification
async function sendNewRequestNotification(request) {
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

    const embed = createRequestEmbed(request);
    const buttons = createActionButtons(request.id);

    const message = await channel.send({
      embeds: [embed],
      components: [buttons]
    });

    // Store message ID for later reference
    activeMessages.set(request.id, message.id);

    console.log(`Sent notification for request #${request.id}`);
  } catch (error) {
    console.error('Error sending new request notification:', error);
  }
}

// Function to update existing request message
async function updateRequestMessage(requestId, status) {
  try {
    const logsChannelId = process.env.REDEEM_LOGS_CHANNEL_ID;
    if (!logsChannelId) return;

    const channel = await client.channels.fetch(logsChannelId);
    if (!channel) return;

    const messageId = activeMessages.get(requestId);
    if (!messageId) return;

    const message = await channel.messages.fetch(messageId);
    if (!message) return;

    const request = await database.getRequestById(requestId);
    if (!request) return;

    const embed = createRequestEmbed(request);

    // Remove buttons if request is no longer pending
    if (status !== 'PENDING') {
      await message.edit({
        embeds: [embed],
        components: []
      });
    } else {
      const buttons = createActionButtons(requestId);
      await message.edit({
        embeds: [embed],
        components: [buttons]
      });
    }

    console.log(`Updated message for request #${requestId} with status: ${status}`);
  } catch (error) {
    console.error('Error updating request message:', error);
  }
}

// Check for new pending requests periodically
async function checkForNewRequests() {
  try {
    const pendingRequests = await database.getRequestsByStatus('PENDING');
    
    for (const request of pendingRequests) {
      // Check if we already sent a notification for this request
      if (!activeMessages.has(request.id)) {
        await sendNewRequestNotification(request);
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } catch (error) {
    console.error('Error checking for new requests:', error);
  }
}

// Handle button interactions
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  const customId = interaction.customId;
  
  if (customId.startsWith('approve_') || customId.startsWith('reject_')) {
    const [action, requestId] = customId.split('_');
    
    try {
      const request = await database.getRequestById(requestId);
      if (!request) {
        await interaction.reply({
          content: '❌ Request not found.',
          ephemeral: true
        });
        return;
      }

      if (request.status !== 'PENDING') {
        await interaction.reply({
          content: `❌ This request has already been ${request.status.toLowerCase()}.`,
          ephemeral: true
        });
        return;
      }

      const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
      
      // Update request status in database
      await database.updateRequestStatus(requestId, newStatus);
      
      // Update the message
      await updateRequestMessage(requestId, newStatus);
      
      // Confirm the action
      await interaction.update({
        content: `✅ Request #${requestId} has been **${newStatus}** by ${interaction.user.tag}`,
        components: [] // Remove buttons after action
      });

      console.log(`Request #${requestId} ${newStatus.toLowerCase()} by ${interaction.user.tag}`);
      
    } catch (error) {
      console.error('Error handling button interaction:', error);
      await interaction.reply({
        content: '❌ An error occurred while processing your request.',
        ephemeral: true
      });
    }
  }
});

// Bot ready event
client.once(Events.ClientReady, c => {
  console.log(`🤖 Discord bot ready! Logged in as ${c.user.tag}`);
  
  // Start checking for new requests every 30 seconds
  setInterval(checkForNewRequests, 30000);
  
  // Check immediately on startup
  checkForNewRequests();
});

// Error handling
client.on('error', error => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);
