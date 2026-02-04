const { REST, Routes } = require('discord.js');
const { CLIENT_ID, GUILD_ID } = process.env;

// No slash commands needed for this version
// The bot works through database polling and button interactions
const commands = [];

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
