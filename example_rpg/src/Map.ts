///<reference path="rpg/RPGKit.ts"/>

module SimpleQuest {
    var potsSmashed:Array<any> = [];
    var switchesFlipped:any = {};
    var spriteLayer:RPG.MapLayer;

    export class Map extends RPG.Map {
        doScene(steps:Array<any>) {
            var s = RPG.Scene.start();

            _.each(steps, function(step) {
                if (typeof step === "string") {
                    s = s.then(function() {
                        RPG.Textbox.show(step);
                        return RPG.Scene.waitForButton("confirm");
                    });
                } else {
                    s = s.then(step);
                }
            }.bind(this));

            return s.then(function() {
                RPG.Textbox.hide();
                RPG.Scene.finish();
            }.bind(this));
        }

        open() {
            super.open();
            spriteLayer = RPG.map.getLayerByName("#spritelayer");

            // TODO this is such a dumb way to do this; need to split this out
            if (this.filename === 'map/town.tmx') {
                _.each(potsSmashed, function(coords) {
                    var tx = Math.floor(coords[0] / this.tileSize.x);
                    var ty = Math.floor(coords[1] / this.tileSize.y);
                    var t = this.layers[1].getTile(tx, ty);
                    if (t == 53) {
                        this.layers[1].setTile(tx, ty, t + 3);
                        spriteLayer.getTriggerByPoint(coords[0], coords[1]).solid = false;
                    }
                }.bind(this));
            } else if(this.filename === 'map/forest.tmx') {
                if (switchesFlipped['trigger_forest_door_switch']) {
                    var trigger = spriteLayer.getTriggersByName('trigger_forest_door_switch')[0];
                    var tx = Math.floor(trigger.rect.x / this.tileSize.x);
                    var ty = Math.floor(trigger.rect.y / this.tileSize.y);
                    this.layers[1].setTile(tx, ty, this.layers[1].getTile(tx, ty) + 2);

                    trigger = spriteLayer.getTriggersByName('locked_door')[0];
                    tx = Math.floor(trigger.rect.x / this.tileSize.x);
                    ty = Math.floor(trigger.rect.y / this.tileSize.y);
                    this.layers[1].setTile(tx, ty, this.layers[1].getTile(tx, ty) + 3);
                    trigger.solid = false;
                }
            }
        }

        open_door(args) {
            var t = this.layers[1].getTile(args.tx, args.ty);
            if (t == 5) {
                this.layers[1].setTile(args.tx, args.ty, 6);
            }
        }

        trigger_pot(args) {
            var t = this.layers[1].getTile(args.tx, args.ty);
            if (t == 53) {
                this.layers[1].setTile(args.tx, args.ty, t + 1);
                potsSmashed.push([args.x, args.y]);
                args.trigger.solid = false;
                if (potsSmashed.length === 4) {
                    this.doScene([
                        "You've broken all the pots.",
                        "Are you proud of yourself now?"
                    ]);
                }
            }
        }

        trigger_chest(args) {
            var t = this.layers[1].getTile(args.tx, args.ty);
            if (t == 37) {
                this.layers[1].setTile(args.tx, args.ty, t + 1);
                RPG.Scene.start()
                    .then(function() {
                        RPG.Textbox.show("There was nothing in the chest.\n\nHow disappointing.");
                        return RPG.Scene.waitForButton("confirm");
                    }.bind(this))
                    .then(function() {
                        RPG.Textbox.hide();
                        RPG.Scene.finish();
                    }.bind(this));
            }
        }

        // -- map switches

        enter_town(args) {
            RPG.startMap(new Map("map/town.tmx"), 8, 1);

            _.each(potsSmashed, function(pt) {
                RPG.map.layers[1].setTile(pt.x, pt.y, 56);
            }.bind(this));
        }

        exit_town(args) {
            RPG.startMap(new Map("map/overworld.tmx"), 14, 12);
        }

        enter_forest(args) {
            if (args.tx == 13 && args.ty == 7) {
                RPG.startMap(new Map("map/forest.tmx"), 7, 43);
            } else {
                RPG.startMap(new Map("map/forest.tmx"), 32, 1);
            }
        }

        exit_forest(args) {
            if (args.ty == 0) {
                RPG.startMap(new Map("map/overworld.tmx"), 16, 5);
            } else {
                RPG.startMap(new Map("map/overworld.tmx"), 13, 9)
            }
        }

        // -- specific world manipulation

        sign_house(args) {
            this.doScene([
                "<center>Mayor's Office\n\nThe mayor is: IN</center>"
            ]);
        }

        sign_shops(args) {
            this.doScene([
                "<center>Carp's Bend\nShopping Centre</center>"
            ]);
        }

        trigger_rocks(args) {
            this.doScene([
                "<center>\nFound some... rocks.</center>",
            ]);
        }

        trigger_well(args) {
            this.doScene([
                "\n<center>HP and MP restored!</center>",
                "This means nothing to you."
            ]);
        }

        trigger_forest_door_switch(args) {
            if (switchesFlipped['trigger_forest_door_switch']) return;

            switchesFlipped['trigger_forest_door_switch'] = true;
            var t = this.layers[1].getTile(args.tx, args.ty);
            this.doScene([
                function() {
                    this.layers[1].setTile(args.tx, args.ty, t + 1);
                    return RPG.Scene.waitForTime(0.5);
                }.bind(this),
                function() {
                    this.layers[1].setTile(args.tx, args.ty, t + 2);
                    return RPG.Scene.waitForTime(0.5);
                }.bind(this),
                function() {
                    var door = spriteLayer.getTriggersByName('locked_door')[0];
                    var tx = Math.floor(door.rect.x / this.tileSize.x);
                    var ty = Math.floor(door.rect.y / this.tileSize.y);
                    this.layers[1].setTile(tx, ty, this.layers[1].getTile(tx, ty) + 1);
                    door.solid = false;
                },
                "Something opened in the distance."
            ]);
        }

        locked_door(args) {
            if (switchesFlipped['trigger_forest_door_switch']) return;

            this.doScene([
                "This door is locked. It must be opened somewhere else."
            ]);
        }

        key_door(args) {
            // var switchName = 'key_door_' + args.tx + "_" + args.ty;
            // if (switchesFlipped[switchName]) return;

            this.doScene([
                "This door is locked.",
                "\n<center>Used Magical Plotkey!</center>",
                function() {
                    this.layers[1].setTile(args.tx, args.ty, this.layers[1].getTile(args.tx, args.ty) + 1);
                    args.trigger.solid = false;
                }.bind(this)
            ]);
        }

        switch_layers(args) {
            var sl = spriteLayer;

            if (RPG.player.dir === 'u') {
                spriteLayer = this.getLayerByName("#spritelayer-upper");
            } else if (RPG.player.dir === 'd') {
                spriteLayer = this.getLayerByName("#spritelayer");
            }

            if (spriteLayer !== sl) {
                RPG.player.place(RPG.player.position.x, RPG.player.position.y, spriteLayer);
            }
        }

        shopkeeper_left(args) {
            this.doScene([
                "SHOPKEEP: Don't you just love shopping?!"
            ]);
        }

        shopkeeper_right(args) {
            this.doScene([
                "SHOPKEEP: Buy somethin', will ya!"
            ]);
        }

        villager_well(args) {
            this.doScene([
                "VILLAGER: Fresh water is good for you!\nI'm so glad we have this well."
            ]);
        }

        villager_mayor(args) {
            this.doScene([
                "MAYOR JOAN: Welcome to Carp's Bend.",
                "MAYOR JOAN: Do you happen to have any experience in slaying dragons?",
                "MAYOR JOAN: We've been having trouble with a dragon that lives up north on Mount Danger.",
                "MAYOR JOAN: You would do us a great service by defeating this dragon...",
                "MAYOR JOAN: Your name would be remembered in song for at least a week or two!"
            ]);
        }

        villager_south_house(args) {
            this.doScene([
                "VILLAGER: The dragon attacks have been getting worse lately.",
                "VILLAGER: At least I have a house! Most people in this town just seem to sleep outside."
            ]);
        }

        villager_fisher(args) {
            this.doScene([
                "FISHERMAN: We like to fish, here in Carp's Bend."
            ]);
        }

        villager_bushes(args) {
            this.doScene([
                "VILLAGER: Whoa there, lady. This here's private property.",
                "VILLAGER: Go find your own dang bushes!"
            ])
        }

        examine_statue(args) {
            this.doScene([
                "The statues seem ancient, but are in remarkably good repair.",
                "It is not clear what they are supposed to represent, though."
            ])
        }
    }
}
