///<reference path="Main-Items-Item.ts"/>

module SimpleQuest {
    export module Menu {
        var html:string = `
            <section class="layout-row title-row">Items</section>
            <section class="layout-row items-row">
                <ul class="items selections">
                </ul>
            </section>
            <section class="layout-row description-row"></section>
        `;
        export class Main_ItemsSubmenu extends RPG.Menu {
            firstFixScroll:boolean = false;
            constructor() {
                super({ html: html, cancelable: true });
                this.element.classList.add('panel','items-submenu','layout-column');
                this.rerenderItemList();
            }

            rerenderItemList() {
                var listContainer = this.find('ul.items');

                RPG.Party.getInventory().forEach((it:RPG.InventoryEntry) => {
                    this.addChild(new Main_ItemListElement(it), listContainer);
                });

                this.setupSelections(listContainer);
            }

            update() {
                if (this.selections.length < 1) return;

                if (!this.firstFixScroll) this.fixScroll();
                var entry = RPG.Party.inventory[this.selectionIndex];
                this.find('.description-row').innerHTML = entry.item.description;
            }

            fixScroll() {
                super.fixScroll();

                if (document.contains(this.element)) {
                    this.firstFixScroll = true;
                    var itemsRow = this.find('.items-row');
                    var st = this.selectionContainer.scrollTop;
                    var sh = this.selectionContainer.scrollHeight;
                    var ch = this.selectionContainer.clientHeight;

                    if (ch < sh) {
                        st > 0 ? itemsRow.classList.add('can-scroll-up') : itemsRow.classList.remove('can-scroll-up');
                        st < sh - ch ? itemsRow.classList.add('can-scroll-down') : itemsRow.classList.remove('can-scroll-down');
                    }
                }
            }
        }
    }
}
