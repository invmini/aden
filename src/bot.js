const Discord = require('discord.js');
const actions = require('./actions');
const config = require('./config');
const dispatch = actions.dispatch;

const client = new Discord.Client();

const onReceiveMessage = message => {
  if (message.author.bot || message.content.substring(0, 4) !== '/nba') {
    return;
  }
  if (message.content.trim() === '/nba') {
    dispatch(actions.HELP, message);
    return;
  }
  const command = message.content.replace('/nba ', '').toLowerCase().trim();
  // For string-only commands
  switch (command) {
    case 'standings':
      dispatch(actions.STANDINGS, message);
      return;
    case 'estandings':
      dispatch(actions.E_STANDINGS, message);
      return;
    case 'wstandings':
      dispatch(actions.W_STANDINGS, message);
      return;
    case 'teams':
      dispatch(actions.TEAMS, message);
      return;
  }

  // For commands that have arguments
  switch (command.split(' ')[0].toLowerCase()) {
    case 'bs':
      if (command.split(' ')[1] && command.split(' ').length > 1) {
        dispatch(actions.BOX_SCORE, message, command.substring(command.indexOf(' ') + 1));
      }
      break;
    case 'player':
      if (command.split(' ').length > 1) {
        dispatch(actions.PLAYER, message, command.substring(command.indexOf(' ') + 1));
      }
      break;
    case 'team':
      if (command.split(' ').length > 1) {
        dispatch(actions.TEAM, message, command.substring(command.indexOf(' ') + 1));
      }
      break;
    case 'remind':
      if (command.split(' ').length > 1) {
        dispatch(actions.REMIND, message, command.substring(command.indexOf(' ') + 1));
      }
      break;
    default:
      dispatch(actions.SCORES_OR_SCHEDULES, message);
      break;
  }
};
const onReady = () => {
  console.log('ready');
  client.user.setGame('NBA');
};

client.on('ready', onReady);

client.on('message', onReceiveMessage);

client.login(process.env.BOT_TOKEN || config.BOT_TOKEN);
