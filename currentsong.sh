#!/bin/sh

Cmus_output=$(cmus-remote -Q | grep 'file')
echo ${Cmus_output} > song.txt
