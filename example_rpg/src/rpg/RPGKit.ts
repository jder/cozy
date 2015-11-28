///<reference path="Map.ts"/>
///<reference path="Entity.ts"/>
///<reference path="Scene.ts"/>
///<reference path="Textbox.ts"/>

module RPG {
    export var player:Entity;
    export var map:Map;
    export var UILayer:Egg.Layer;
    export var loadSkip:Array<string> = [];
    export var cameraHalf:PIXI.Point;
    export enum ControlMode { None, Scene, Menu, Map };
    export var controls:ControlMode;

    export function start(loaded:Function) {
        var textures = {};
        var fonts = [];
        var directories = ['.'];
        cameraHalf = new PIXI.Point(Egg.config['width'] / 2, Egg.config['height'] / 2);

        // scrape all images under the project
        while (directories.length > 0) {
            var dir = directories.shift();
            var files = Egg.Directory.read(dir);
            _.each(files, function(f) {
                var fullPath = dir + "/" + f;
                if (_.contains(loadSkip, fullPath)) return;

                var stats = Egg.File.stat(fullPath);
                if (stats.isDirectory()) {
                    directories.push(fullPath);
                    return;
                }

                var ext = Egg.File.extension(fullPath).toLowerCase();
                if (ext == '.png' || ext == '.jpg' || ext == '.gif') {
                    textures[fullPath.substr(2)] = fullPath;
                }
            }.bind(this));
        }

        Egg.loadTextures(textures, loaded);
    }

    export function frame(dt) {
        if (controls === ControlMode.Map && map && player) {
            // handle movement
            var dx = 0, dy = 0;
            if (Egg.button('up')) dy -= player.speed * dt;
            if (Egg.button('down')) dy += player.speed * dt;
            if (Egg.button('left')) dx -= player.speed * dt;
            if (Egg.button('right')) dx += player.speed * dt;

            // diagonal movement should only be as fast as cardinal movement
            if (dx !== 0 && dy !== 0) {
                dx *= 0.707;
                dy *= 0.707;
                // correct for shuddering on diagonal movement; I kind of hate this hack
                player.sprite.setPosition(Math.round(player.position.x), Math.round(player.position.y));
            }

            player.move(dx, dy);

            // handle other input
            if (Egg.button('confirm')) {
                Egg.debounce('confirm');
                var tx = player.position.x;
                var ty = player.position.y;
                switch (player.dir) {
                    case 'u': ty -= map.tileSize.y; break;
                    case 'd': ty += map.tileSize.y; break;
                    case 'l': tx -= map.tileSize.x; break;
                    case 'r': tx += map.tileSize.x; break;
                }
                var trigger = player.layer.getTriggerByPoint(tx, ty);
                if (trigger) {
                    player.layer.map[trigger.name]({
                        sprite: this,
                        trigger: trigger,
                        x: tx, y: ty,
                        tx: Math.floor(tx / map.tileSize.x), ty: Math.floor(ty / map.tileSize.y)
                    });
                }
            }

            // position camera
            var cx = player.position.x;
            var cy = player.position.y;
            var cameraBox = new PIXI.Rectangle(0, 0, map.size.x * map.tileSize.x, map.size.y * map.tileSize.y);

            cx = Math.max(cameraBox.x + cameraHalf.x, cx);
            cx = Math.min(cameraBox.x + cameraBox.width - cameraHalf.x, cx);

            cy = Math.max(cameraBox.y + cameraHalf.y, cy);
            cy = Math.min(cameraBox.y + cameraBox.height - cameraHalf.y, cy);

            _.each(map.layers, function(layer) {
                layer.displayLayer.offset(-cx + cameraHalf.x, -cy + cameraHalf.y);
            });
        } else if (controls === ControlMode.Scene && Scene.currentScene) {
            Scene.update(dt);
        }
    }

    export function startMap(newMap:Map|string, x?:number, y?:number, layerName?:string) {
        if (typeof newMap === 'string') {
            map = new Map(newMap);
        } else {
            map = newMap;
        }
        map.open();
        UILayer = Egg.addLayer();

        player.place((x + 0.5) * map.tileSize.x, (y + 0.5) * map.tileSize.y, map.getLayerByName(layerName || '#spritelayer'));
    }
}
