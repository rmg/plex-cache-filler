# plex-cache-filler

A trivial little script that queries the Plex Media Server running on localhost
and any time there are videos playing, this script streams them to `/dev/null`.

This is a hack to work around Plex Media Server not being designed for reading
videos off of a network share and re-streaming them back out to the network.
The hack is to simply read the open files in to memory to force them in to the
OS's filesystem cache.
