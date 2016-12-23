const Discord = require('discord.js');
const actions = require('./actions');
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
    case 'tricode':
      dispatch(actions.TRICODE, message);
      return;
  }
  if (command.split(' ')[0] === 'bs' && command.split(' ')[1].length === 10 && !isNaN(command.split(' ')[1])) {
    dispatch(actions.BOX_SCORE, message, command.split(' ')[1]);
  } else if (command.split(' ')[0] === 'player' && command.split(' ').length > 1) {
    dispatch(actions.PLAYER, message, command.substring(command.indexOf(' ') + 1));
  } else if (command.length === 3) {
    dispatch(actions.TEAM, message, command);
  } else {
    dispatch(actions.SCORES_OR_SCHEDULES, message);
  }
};
const onReady = () => {
  console.log('ready');
  client.user.setGame('NBA');
};

client.on('ready', onReady);

client.on('message', onReceiveMessage);

client.login('MjYwOTgxOTAzMTMyMzI3OTM2.CzuU1A.UHl2hlDz1R5HB1Et5wbnlJs7oK4');
