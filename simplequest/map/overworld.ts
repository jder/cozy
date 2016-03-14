module SimpleQuest {
    export class Map_Overworld extends SimpleQuest.Map {
        constructor() {
            super('map/overworld.tmx');
            this.music = SimpleQuest.music['overworld'];
        }

        enter_town(args) {
            this.map_switch(new Map_Town(), 8, 1);
        }

        enter_forest(args) {
            if (args.tx == 13 && args.ty == 7) {
                this.map_switch(new Map_Forest(), 7, 43);
            } else {
                this.map_switch(new Map_Forest(), 32, 1);
            }
        }

        examine_ship(args) {
            this.doScene([
                "You can't leave this place until you've found what you're looking for."
            ]);
        }
    }
}