#!/bin/sh

read -r -p "MorTeam or MorScout? [T/S] " response
case $response in
	[mM][oO][rR][tT][eE][aA][mM]|[tT])
		project="morteam"
		;;
	[mM][oO][rR][sS][cS][oO][uU][tT]|[sS])
		project="morscout"
		;;
	*)
esac

if tmux has-session -t $project 2>/dev/null; then
	read -r -p "Already exists. Kill? [y/N] " response
	case $response in
		[yY][eE][sS]|[yY])
			tmux kill-session -t $project
			;;
		*)
			exit 1
			;;
	esac
fi

tmux start-server
tmux new-session -d -s $project
if [ $project = "morteam" ]; then
	tmux split-window -v -p 30
	tmux split-window -h -p 66
	tmux split-window -h -p 50
	tmux send-keys -t morteam:0.0 'cd ~/morteam-web' Enter vim Enter Enter :NERDTreeTabsToggle Enter /src Enter o
	tmux send-keys -t morteam:0.1 'cd ~/morteam-web; clear' Enter clear Enter
	tmux send-keys -t morteam:0.2 'cd ~/mornetwork; clear' Enter 'npm start' Enter
	tmux send-keys -t morteam:0.3 'cd ~/morteam-web; clear' Enter 'npm run watch' Enter
	tmux select-pane -t 0
fi

if [ $project = "morscout" ]; then
	tmux split-window -v -p 30
	tmux split-window -h -p 50
	tmux send-keys -t morscout:0.0 'cd ~/morscout-web' Enter vim Enter Enter :NERDTreeTabsToggle Enter
	tmux send-keys -t morscout:0.1 'cd ~/morscout-web; clear' Enter clear Enter
	tmux send-keys -t morscout:0.2 'cd ~/mornetwork; clear' Enter 'npm start' Enter
	tmux select-pane -t 0
fi

