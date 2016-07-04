///<reference path="Main-Status-PartyMember.ts"/>

module SimpleQuest {
    export module Menu {
        export class Main_StatusPanel extends Egg.UiComponent {
            constructor() {
                super({});
                this.element.classList.add("panel","status");
                RPG.Party.members.forEach((member, i) => {
                    this.addChild(new Main_PartyMember({ index: i, member: member }));
                });
            }
        }
    }
}