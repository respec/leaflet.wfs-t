var map; // the map object
var layers = {};
var drawControl;

function initMap(){
    // create a map in the "map" div, set the view to a given place and zoom
    map = L.map('map').setView([45, -93], 11);

    // add an OpenStreetMap tile layer
    L.tileLayer('http://a.tiles.mapbox.com/v3/stuporglue.map-hh45gv8x/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://mapbox.com">Mapbox.com</a>'
    }).addTo(map);

    // Initialize the FeatureGroup to store editable layers
    var drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    // Initialize the draw control and pass it the FeatureGroup of editable layers
    var drawControl = new L.Control.Draw({
        edit: {
            featureGroup: drawnItems
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
        map.addLayer(layer);
    });

}
