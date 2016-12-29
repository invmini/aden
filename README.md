[![Build Status](https://travis-ci.org/chewong/Aden.svg?branch=master)](https://travis-ci.org/chewong/Aden)
![Heroku](https://camo.githubusercontent.com/8b13ffa419f97fb10bcac89231a26f1a43e43b58/687474703a2f2f6865726f6b752d62616467652e6865726f6b756170702e636f6d2f3f6170703d616e67756c61726a732d63727970746f267374796c653d666c6174267376673d3126726f6f743d696e6465782e68746d6c)
[![Discord](https://discordapp.com/api/guilds/196084053936439297/widget.png)]()

# Project Aden

[Click here to add Aden to your server](https://discordapp.com/oauth2/authorize?&client_id=260981903132327936&scope=bot)

Discord Chat Bot with Real Time NBA Scores, Schdules, and Stats!

![](https://zippy.gfycat.com/MemorableRectangularAgouti.gif)

## Documentation
```/nba live```

Display the scores of current live games

```/nba [date]```

Display relevant NBA scores/schedules on a given date (YYYYMMDD) (e.g. /nba 20161031)

Alias: ```/nba yesterday```, ```/nba today```, ```/nba tomorrow```

```/nba teams```

Display all NBA teams and their tricode

```/nba team [nickname]```

Display upcoming matches and current active roster of the chosen team (e.g. /nba team raptors)

```/nba standings```

Display the current standings

```/nba estandings```

Display the current Easten Conference standings

```/nba wstandings```

Display the current Western Conference standings

```/nba player [player name]```

Display the current stats of the chosen player

```/nba bs [nickname|game id]```

Display the box score of the chosen game (e.g. /nba bs raptors, /nba bs 0021600454)

(Note: If nickname is used, the boxscore of the most recent ongoing/finished game will be displayed)

```/nba remind [nickname|game id]```

Set a reminder to a future game

(Note: If nickname is used, the upcoming game will be reminded)

```/nba hl [nickname|game id]```

YouTube video of the selected game highlight

## Development
```
npm install
npm run dev
```
## Contribution
This repo is completely open soure (will add a license soon), feel free to make an [issue](https://github.com/chewong/Aden/issues) or a [PR](https://github.com/chewong/Aden/pulls)!

## Special Thanks
[Discord.js](https://discord.js.org/)

[nba.js](https://github.com/kshvmdn/nba.js)

## TODO
Basic NLP

Timezone
