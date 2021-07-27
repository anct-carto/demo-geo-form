

// geocode
const api_admin = "https://geo.api.gouv.fr/communes?nom=";

// ****************************************************************************



let search_group_template = {
    template: `
            <div id="search-bar-container">
                <div class="input-group">
                        <input ref="input" class="form-control"
                                id="search-field" type="search"
                                :placeholder="placeholderTag" 
                                v-model="inputAdress"
                                @keyup="onKeypress($event)" 
                                @keydown.down="onKeyDown"
                                @keydown.up="onKeyUp"
                                @keyup.enter="onEnter">
                </div>
                <div class="list-group" v-if="isOpen">
                    <div class="list-group-item" v-for="(suggestion, i) in suggestionsList"
                        @click="onClickSuggest(suggestion)"
                        @keydown.esc="isOpen=false"
                        @mouseover="onMouseover(i)"
                        :class="{ 'is-active': i === index }">
                        <div v-if="searchType === 'address'">
                            <span class="search-result-label">
                                {{ suggestion.properties.label }}
                            </span><br>
                            <span class="search-result-context">
                                {{ suggestion.properties.context }}
                            </span>
                            <span class="search-result-type">
                                {{ suggestion.properties.type }}
                            </span>
                        </div>
                        <div v-else>
                            <span class="search-result-label">
                                {{ suggestion.nom }}
                            </span>
                            <span class="search-result-type">
                                {{ suggestion.codesPostaux[0] }}
                            </span>
                        </div>
                    </div>
                </div><br>
                Code postal
                <input type="text" class="form-control" id="lname" name="lname" :value="code_postal" disabled><br>
                Code Insee
                <input type="text" class="form-control" id="lname" name="lname" :value="code_insee" disabled><br>
                Département  
                <input type="text" class="form-control" id="lname" name="lname" :value="departement" disabled>
            </div>`,
    data() {
        return {
            searchType:'admin',
            inputAdress:'',
            isOpen:false,
            index:0,
            suggestionsList:[],
            code_insee:'',
            code_dept:'',
            code_postal:'',
            lib_dep:'',
            departement:'',
        }
    },
    computed: {
        placeholderTag() {
            if(this.searchType == "address") {
                return "Saisissez une adresse ..."
            } else {
                return "Saisissez un nom de commune ..."
            }
        }
    },
    watch: {
        inputAdress() {
            if(!this.inputAdress) {
                this.isOpen = !this.isOpen;
                this.index = 0;
                this.suggestionsList = [];
            }
        },
        code_dept() {
            this.retrieveDepNoun(this.code_dept);
        }
    },
    methods: {
        onChange(e) {
            this.searchType = e.target.name;
            this.inputAdress = '';
        },
        returnType(type) {
            switch (type) {
                case "housenumber":
                    return type = "Numéro";
                case "street":
                    return type = "Rue";
                case "locality":
                    return type = "Lieu-dit";
                case "municipality":
                    return type = "Commune";
                    break;
            };
        },
        onKeypress(e) {
            this.isOpen = true;
            let val = this.inputAdress;
            
            if(val === '') {
                this.isOpen = false;                
            };

            if (val != undefined && val != '') {
                if(this.searchType == 'address') {
                    fetch(api_adresse.concat(val, "&autocomplete=1"))
                        .then(res => res.json())
                        .then(res => {
                            let suggestions = [];
                            if(res && res.features) {
                                let features = res.features;
                                features.forEach(e => {
                                    e.properties.type = this.returnType(e.properties.type)
                                    suggestions.push(e);
                                });
                            };
                            this.suggestionsList = suggestions;
                        }).catch(error => console.throw(error));
                } else if(this.searchType == 'admin') {
                    fetch(api_admin.concat(val,"&limit=5"))
                    .then(res => res.json())
                    .then(res => {
                        let suggestions = [];
                        if(res) {
                            res.forEach(e => {
                                suggestions.push(e);
                            });
                        };
                        this.suggestionsList = suggestions;
                    }).catch(error => console.error(error));
                }
            }
        },
        onKeyUp(e) {
            if (this.index > 0) {
                this.index = this.index - 1;
            }
        },
        onKeyDown(e) {
            if (this.index < this.suggestionsList.length) {
                this.index = this.index + 1;
            }
        },
        onMouseover(e) {
            this.index = e;
        },
        onEnter() {
            this.isOpen = !this.isOpen;
            if(this.suggestionsList.length != 0) {
                suggestion = this.suggestionsList[this.index];
                if(this.searchType == "address") {
                    this.inputAdress = suggestion.properties.label;
                    // send data
                    this.$emit("searchResult", {
                        resultType:'address',
                        resultCoords: [suggestion.geometry.coordinates[1],suggestion.geometry.coordinates[0]], 
                        resultLabel: suggestion.properties.label
                    })
                } else {
                    this.inputAdress = suggestion.nom;
                    this.code_insee = suggestion.code;
                    this.code_postal = suggestion.codesPostaux[0];
                    this.code_dept = suggestion.codeDepartement;
                    this.$emit('searchResult', {
                        resultType:'dep',
                        resultCode:suggestion.code
                    });
                }
                this.suggestionsList = [];
                this.index = -1;
            }
        },
        onClickSuggest(suggestion) {            
            if(this.searchType == 'address') {
                // reset search
                this.inputAdress = suggestion.properties.label;
                // get address coordinates to pass to map
                let coordinates = suggestion.geometry.coordinates;
                let latlng_adress = [coordinates[1], coordinates[0]];
    
                // send data
                this.$emit("searchResult", {
                    resultType:'address',
                    resultCoords: latlng_adress, 
                    resultLabel: this.inputAdress
                });
            } else {
                this.inputAdress = suggestion.nom;
                this.code_postal = suggestion.codesPostaux[0];
                this.code_insee = suggestion.code;
                this.code_dept = suggestion.codeDepartement;
            // send data
                this.$emit("searchResult", {
                    resultType:'dep',
                    resultCode:suggestion.code
                });                
            }
            
            this.suggestionsList = [];
            this.isOpen = !this.isOpen;

        },
        retrieveDepNoun(e) {
            fetch("https://geo.api.gouv.fr/departements?code="+e)
            .then(res=>res.json())
            .then(res => { 
                console.log(res[0].nom);
                this.lib_dep = res[0].nom;
                this.departement = this.lib_dep + ' (' + this.code_dept + ')';

            })
        },
        handleClickOutside(evt) {
            if (!this.$el.contains(evt.target)) {
              this.isOpen = false;
              this.index = -1;
            }
        },
        clearSearch() {
            this.inputAdress = '';
            this.$emit('clearSearch')
        }
    },
    mounted() {
        document.addEventListener("click", this.handleClickOutside);
        document.addEventListener("keyup", (e) => {
            if(e.key === "Escape") {
                this.isOpen = false;
                this.index = -1;

            }
        });
        
    },
    destroyed() {
        document.removeEventListener("click", this.handleClickOutside);
        document.removeEventListener("keyup", (e) => {
            if(e.key === "Escape") {
                this.isOpen = false;
                this.index = -1
                this.handleClickOutside();
            }
        });
    }

};


// finale instance vue
let vm = new Vue({
    el: '#app',
    components: {
        'search-group':search_group_template,
    },
});
