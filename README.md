leaflet.wfs-t and leaflet.gml
=============

Leaflet plug-in for WFS Transactional (WFS-T) support.

WFS-T is an OGC standard protocol which allows you to add, update and delete features and 
attributes from a compliant server. 

One easy way to use the leaflet.wfs-t plugin is with the Leaflet.Draw plugin. With 
leaflet.wfs-t the shapes you draw, modify or delete from the map will have their status
reflected on your WFS-T server.

Included with leaflet.wfs-t is leaflet.gml which adds a toGML() function to each Leaflet 
geometry type (although, they're not all implemented yet). 

Current Status and Known Bugs
-----------------------------

 * leaflet.wfs-t has only been tested with GeoServer 2.3.2. It might not work with any other 
  wfs-t servers yet. 
 * It might not even work with GeoServer 2.3.2. This is an early release
 * It currently extends the GeoJSON layer type for reading, but writes GML. Since WFS-T is a 
 GML oriented protocol it should implement a GML reader eventually. For now you need GeoJSON 
 output enabled in GeoServer.
 * Only points and polygons can be saved right now. Circles and polylines don't work yet and 
 should be implemented in leaflet.gml.js.
 * Probably lots of unknown bugs. 
 * leaflet.gml doesn't handle polygons which wrap around the map. Use 
 ````noWrap: true```` in tile layers to visualize where the boundaries are.
 * It works for me, YMMV, etc.

Installing, Testing
-------------------

Set up a Leaflet map with the Leaflet.Draw plugin.

Add the WFST layer. It currently extends the L.GeoJSON layer so any GeoJSON options should work too.

    // A global layers object
    layers = {};

    // Initialize the WFST layer to store editable layers
    // The options object (2nd parameter) has 4 required fields:
    // 1) url             : The WFS service URL
    // 2) featureNS       : The feature Namespace
    // 3) featureType     : The feature Type within the namespace
    // 4) primaryKeyField : The primary key field

    layers.drawnItems = L.wfst(null,{
        url : 'http://localhost/geoserver/wfsttest/wfs',
        featureNS : 'wfsttest',
        featureType : 'doodles',
        primaryKeyField: 'id',
    }).addTo(map);

Point Leaflet.Draw at the wfst layer.

    // Initialize the draw control and pass it the FeatureGroup of editable layers
    var drawControl = new L.Control.Draw({
        edit: {
            featureGroup: layers.drawnItems
        }
    });

Add Leaflet.Draw handlers for the draw:created and draw:edited events.

    map.on('draw:created', function (e) {
        layers.drawnItems.addLayer(e.layer);
    });
    map.on('draw:edited', function (e) {
        layers.drawnItems.wfstSave(e.layers);
    });
