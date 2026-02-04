require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const { CLIENT_ID, GUILD_ID } = process.env;

const commands = [
  new SlashCommandBuilder()
    .setName('viewkey')
    .setDescription('View the redeem key for a specific request (Admin only)')
    .addIntegerOption(option =>
      option.setName('id')
        .setDescription('The request ID')
        .setRequired(true)
    )
    .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error deploying commands:', error);
  }
})();
