# Cozy

A generic game engine. For now this is pretty hacked together. Things might get better in the future!

Currently this is only set up to work on Windows. It should be fairly straightforward to get it working on other platforms, but I don't have ready access to them.


## Plans

Do I look like someone who is planning things in advance?

Really though, the plan is to take my hacked together pile of crap and make small games with them (the example games) to figure out what I actually need in the engine and how I actually want things to look and to work. Over time I will update and replace pieces as necessary. If you've somehow gotten access to this repository, hopefully I've actually given it to you and you know what's up.

Ultimately the development is driven by what I want out of the engine. I have a lot of games I want to make at some point. I'd like to build myself the tools I need to build those games. If you (the hypothetical reader) have a use-case that I'm not meeting, then maybe in the future it will come up. For the time being though, it's more than likely you'll have to address that yourself.


## Usage

Just run the Cozy shortcut (or `.engine/cozy.exe`). This will open the launcher/project manager.

If you want to work on the engine itself, you'll need to have NPM installed; run `npm install` in .engine/resources/app/.


## Current technologies

- Electron: <https://github.com/atom/electron>
- PIXI.js: <http://www.pixijs.com/>
- Underscore: <http://underscorejs.org>
- Typescript: <http://typescriptlang.org>


## Roadmap

This is stuff I intend to do, and/or am actively working on. I'm trying to keep this up to date with my commits.

- Finish the rename
- Bugs/Unsorted
    - userconfig.json in userdatadir
        - Defaults in project config.json
        - In-game input config
    - Manager should only run one game at a time, or at least only one copy of a particular game
    - Menus need some polish
        - Menu should have .menu and .active; selection container should have .selections, and it should just get added by setupSelections
        - Need to provide a better way for menus to return a value to a previous menu -- promises?
- Exporting
    - Make glob.js easier to recreate
    - Split config.json into necessary game setup vs. player configuration (bake non-player config into game setup on export, leave config as only player config, or play config should be in userdataDir)
- **=== SIMPLEQUEST RELEASE [ENGINE 0.1]===**
- Bugs/Unsorted
    - Make browser NOT close the currently active game
        - or just revisit the whole browser interface in general
    - If a project has a `build.js`/`build.ts`, run it after TS compilation
- RPGKit
    - Add scripted movement for entities on the map
    - Add scripted movement for entities in Scenes
    - Can I just slurp in all of the map .ts files automatically instead of having to reference each one?
    - It'd be nice if the persistent stuff in map was easier to use in general
- Data Editor
    - Manages .json files; top level is an object with a ".schemas" key plus "tables" of typed objects
- Reconcile File stuff
    - Don't make it required that the current working directory is actually the gamepath
- Other platforms
    - Mac OS
    - Linux
- config.json should be able to define an expected version, Cozy should be smart enough to do the right thing
    - I think this means "shipping" compiled .js blobs of previous versions along with the engine, and having the player select the right one
    - This is irrelevant for exported games; they'll be packaged with the version they were used to create it
- Documentation
    - Better docs on core functions
    - Higher level intro, etc
    - Tutorials
- Testing
    - Investigate this
- Release stuff
    - Check if `.engine/src` exists and do not do core watch or compiles if it doesn't
- **=== ENGINE RELEASE 1.0 ===**

## Wish list/Ideas (some day maybe):

Stuff I've thought of and would be nice, or might be useful. I may or may not ever get around to these or consider them worthwhile.

- Other Kits
    - Beef up the Kit system to make it easier to share/use them
    - PlatformerKit (for Metroidvania type games)
    - ActionAdventureKit (for Zelda type games)
    - etc.
- More complex songs -- intros, loops, multiple tracks that you can control separately
- Slim down Electron so the executable isn't so huge
- Replace rendering engine with something native
    - SDL? OpenGL?
- Post-process filters, scaling filters (CRT emulation?)
    - <http://chadaustin.me/2015/11/crts-pixels-and-video-games/>
- Integrate SCSS? ReactJS?
- Other platforms
    - Browser
    - Mobile


## Examples

- **SimpleQuest** - SimpleQuest, a small but complete RPG
    - See simplequest/README.md for more information
    - Currently still a work in progress
- **examples/EggInvaders** - A simple 2-player pong game
- **examples/EggPong** - A partial Space Invaders clone
- **toys** - Random junk that demonstrates something

To run the examples, simply click them in the game list in the launcher.



## Who is responsible for this mess

[Shamus Peveril](http://shamuspeveril.com) -- architect, lead (only) developer, example maker
