#!/bin/sh

Cmus_output=$(cmus-remote -Q | grep 'file')
No_suffix=${Cmus_output%.mp3}
echo ${No_suffix} > song.txt
