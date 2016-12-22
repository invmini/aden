const Discord = require('discord.js');
const moment = require('moment');
const actions = require('./actions');

const client = new Discord.Client();

const onReceiveMessage = message => {
  if (message.author.bot || message.content.substring(0, 4) !== '/nba') {
    return;
  }
  if (message.content.trim() === '/nba') {
    actions.dispatch(actions.HELP, message);
    return;
  }
  const command = message.content.replace('/nba ', '').toLowerCase().trim();
  // For string-only commands
  switch (command) {
  case 'standings':
    actions.dispatch(actions.STANDINGS, message);
    return;
  case 'estandings':
    actions.dispatch(actions.E_STANDINGS, message);
    return;
  case 'wstandings':
    actions.dispatch(actions.W_STANDINGS, message);
    return;
  case 'tricode':
    actions.dispatch(actions.TRICODE, message);
    return;
  }
  if (command.split(' ')[0] === 'bs' && command.split(' ')[1].length === 10 && !isNaN(command.split(' ')[1])) {
    actions.dispatch(actions.BOX_SCORE, message, command.split(' ')[1]);
  } else if (command.split(' ')[0] === 'player') {
    actions.dispatch(actions.PLAYER, message, command.split(' ')[1]);
  } else {
    actions.dispatch(actions.SCORES_OR_SCHEDULES, message);
  }
};

const onReady = () => {
  console.log('ready');
};

client.on('ready', onReady);

client.on('message', onReceiveMessage);

client.login('MjYwOTgxOTAzMTMyMzI3OTM2.CzuU1A.UHl2hlDz1R5HB1Et5wbnlJs7oK4');