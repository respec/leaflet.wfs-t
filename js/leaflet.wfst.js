L.WFST = L.GeoJSON.extend({

    // These functions overload the parent (GeoJSON) functions with some WFS-T
    // operations and then call the parent functions to do the Leaflet stuff

    initialize: function(geojson,options){
        // These come from OL demo: http://openlayers.org/dev/examples/wfs-protocol-transactions.js
        var initOptions = {
            showExisting : true, // Show existing features in WFST layer on map?
            version : "1.1.0",
            url : undefined,
            featureNS : undefined, 
            featureType : undefined
            // srsName : "EPSG:4326", not needed for leaflet?
            // geometryName : null, // not needed at all, detected by gml:GeometryPropertyType
        };

        for(var o in options){
            initOptions[o] = options[o];
        }

        if(typeof initOptions['url'] == 'undefined'){
            throw "ERROR: No WFST url declared";
        }
        if(typeof initOptions['featureNS'] == 'undefined'){
            throw "ERROR: featureNS not declared";
        }
        if(typeof initOptions['featureType'] == 'undefined'){
            throw "ERROR: featureType not declared";
        }

        // Call to parent initialize
        L.GeoJSON.prototype.initialize.call(this,geojson,initOptions);

        // Now maybe an ajax call to get existing features
        if(this.options.showExisting){
            this._loadExistingFeatures();
        }
    },
    // Additional functionality for these functions
    addLayer: function(layer) {
        console.log("Do wfst add");

        // Call to parent addLayer
        L.GeoJSON.prototype.addLayer.call(this,layer);
    },
    removeLayer: function(layer) {
        console.log("Do wfst remove");

        // Call to parent removeLayer
        L.GeoJSON.prototype.removeLayer.call(this,layer);
    },


    // These functions are unique to WFST

    /* Make an ajax request
     * options: {
        url: url to fetch (required),
        method : GET, POST (optional, default is GET),
        success : function (optional), must accept a string if present
        failure: function (optional), must accept a string if present
     }
    */

    _doRequest: function(options){
        options.method = options.method || 'GET';
        options.success = options.success || function(r){};
        options.failure = options.failure || function(r){};
        options.self = options.self || this;

        var xmlhttpreq = (window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject('Microsoft.XMLHTTP'));
        xmlhttpreq.onreadystatechange=function() {
            if(xmlhttpreq.readyState==4){
                if(xmlhttpreq.status==200){
                    options.success(xmlhttpreq.responseText);
                }else{
                    options.failure(xmlhttpreq.responseText);
                }
            }
        };
        xmlhttpreq.open(options.method,options.url,true);
        xmlhttpreq.send();
    },

    _loadExistingFeatures: function(){
        var geoJsonUrl = this.options.url + '?service=WFS&version=1.0.0&request=GetFeature&typeName=' + this.options.featureNS + ':' + this.options.featureType + '&outputFormat=json';
        this._doRequest({
            url: geoJsonUrl,
            success: function(res){
                res = JSON.parse(res);
                this.self.addData(res.features)
            }
        });
    }

    // Todo: create/handle onchange

});

L.wfst = function(geojson,options){
    return new L.WFST(geojson,options);
};
