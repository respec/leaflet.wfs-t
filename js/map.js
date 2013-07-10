var map; // the map object
var layers = {};
var drawControl;

function initMap(){
    // create a map in the "map" div, set the view to a given place and zoom
    map = L.map('map').setView([45, -93], 3);

    // Set the map background to our WMS layer of the world boundaries
    layers.world = L.tileLayer.wms("/geoserver/wfsttest/wms", {
        layers: 'wfsttest:world',
        format: 'image/png',
        transparent: true,
        attribution: "CDC"
    }).addTo(map);

    // Initialize the FeatureGroup to store editable layers
    layers.drawnItems = L.wfst(null,{
        url : 'http://localhost/geoserver/wfsttest/ows',
        featureNS : 'wfsttest',
        featureType : 'doodles'
    }).addTo(map);

    // Initialize the draw control and pass it the FeatureGroup of editable layers
    var drawControl = new L.Control.Draw({
        edit: {
            featureGroup: layers.drawnItems
        }
    });

    map.addControl(drawControl);

    map.on('draw:created', function (e) {
        var type = e.layerType,
        layer = e.layer;

        if (type === 'marker') {
            // Do marker specific actions
        }

        // Do whatever else you need to. (save to db, add to map etc)
        layers.drawnItems.addLayer(layer);
    });
}
