const _ = require('lodash');
const axios = require('axios');

axios.get('https://gist.githubusercontent.com/kshvmdn/5946cf62a4081be2a6a23fa1cedbfba4/raw/42567a2a595ddb5a39086f72271f20d45741b33d/players.json').then(res => {
  const data = {};
  _.each (res.data, player => {
    data[player.personId] = player.name;
  });
  console.log(data);
});