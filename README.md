# pTracker

Hello everyone, I’m releasing a lite version of my “player stats” script.

Currently, this version provides three features: getting the total play time, a leaderboard and the last connection date of a player.
I managed to make this script standalone and compatible with all “gamemode” so it will work everywhere with all resources.

The only resource required is “hardcap”, actually the script needs an event that is triggered when a player is successfully connected.

# Commands
- /time [hex or player’s name or nothing for you] -> Get the total play time on the server.
- /seen [hex or player’s name or nothing for you] -> Get the last connecting date.
- /leaderboard -> Get the playtime leaderboard.

# Building
- npm i
- npm run build