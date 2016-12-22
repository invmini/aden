const Discord = require('discord.js');
const moment = require('moment');
const actions = require('./actions');
const teams = require('./constants').teams

const client = new Discord.Client();

const onReceiveMessage = message => {
  if (message.author.bot || message.content.substring(0, 4) !== '/nba') {
    return;
  }
  if (message.content.trim() === '/nba') {
    actions.dispatch(actions.HELP, message);
    return;
  }
  const command = message.content.replace('/nba ', '');
  // For string-only commands
  switch (command.toLowerCase().trim()) {
    case 'standings':
      actions.dispatch(actions.STANDINGS, message);
      return;
    case 'estandings':
      actions.dispatch(actions.E_STANDINGS, message);
      return;
    case 'wstandings':
      actions.dispatch(actions.W_STANDINGS, message);
      return;
  }
  actions.dispatch(actions.SCORES_OR_SCHEDULES, message);
};

const onReady = () => {
  console.log('ready');
};

client.on('ready', onReady);

client.on('message', onReceiveMessage);

client.login('MjYwOTgxOTAzMTMyMzI3OTM2.CzuU1A.UHl2hlDz1R5HB1Et5wbnlJs7oK4');