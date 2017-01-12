import Discord from 'discord.js';
import * as actions from './actions';
import config from './config';
import Logger from 'js-logger';
import _ from 'lodash';
import redis from 'redis';

const dispatch = actions.dispatch;
const client = new Discord.Client();
const cache = redis.createClient(process.env.REDIS_URL || config.REDIS_URL);

Logger.useDefaults();

const onReceiveMessage = message => {
  if (message.author.bot || message.content.substring(0, 4) !== '/nba') {
    return;
  }

  Logger.info(`Incoming message: ${message.content}`);

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
    case 'hl':
      if (command.split(' ').length > 1) {
        dispatch(actions.HIGHLIGHT, message, command.substring(command.indexOf(' ') + 1));
      }
      break;
    default:
      dispatch(actions.SCORES_OR_SCHEDULES, message);
      break;
  }
};

const onReady = () => {
  Logger.info(`Project Aden: Activated`);
  client.user.setGame('NBA');

  // Re-setup game reminder because heroku
  // restarts the bot every 24 hours
  _.each(client.channels.keyArray(), key => {
    cache.keys(`${key}-*`, (err, cacheKeys) => {
      if (err || cacheKeys.length === 0) return;
      _.each(cacheKeys, cacheKey => {
        const gameId = cacheKey.split('-')[1];
        const message = {
          id: key,
          channel: client.channels.find('id', key),
        };
        Logger.info(`Aden restarted: setting game reminder ${gameId}`);
        dispatch(actions.SET_REMINDER, message, gameId);
      });
    });
  });
  cache.quit();
};

client.on('ready', onReady);

client.on('message', onReceiveMessage);

client.login(process.env.BOT_TOKEN || config.BOT_TOKEN);
