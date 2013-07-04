var Wfst = function(url,typename){
    this.url = url;
    this.typename = typename;
    this.workspace = this.typename.replace(/:.*/,'');

    // These get filled in by _init 
    this.namespace = null;
    this.featureinfo = null;
    this.ready = false; // we need to get the feature info

    // A compatibility layer because browsers argue about the right way to do getElementsByTagName when namespaces are involved
    this.getElementsByTagName = function(xml,name){
        var tag = xml.getElementsByTagName(name);
        if(!tag || tag === null || tag.length === 0){
            tag = xml.getElementsByTagName(name.replace(/.*:/,''));
        }
        if(!tag || tag === null || tag.length === 0){
            tag = xml.getElementsByTagNameNS('', name.replace(/.*:/,''));
        }
        return tag;
    };

    // Insert a leaflet object via WFS-T
    // Returns true/false if the request was sent/or not
    this.insert = function(obj,options){
        if(!this.ready){ return false; }


        defaults = {
            autoincrement: false
            // success : undefined,
            // failure : undefined
        };


        options = $.extend(defaults,options);

        var geomField = this._fieldsByAttribute('type','gml:GeometryPropertyType',1)[0];
        if(typeof geomField != 'undefined'){
            geomField = geomField.getAttribute('name');
        }else if(typeof obj.geometry_name != 'undefined'){
            geomField = obj.geometry_name;
        }

        var xml = this._xmlpre;
        xml += "<wfs:Insert>";
        xml += "<" + this.typename + ">";
        xml += "<" + this.workspace + ":" + geomField + ">";
        xml += obj.toGML();
        xml += "</" + this.workspace + ":" + geomField + ">";

        var elems = this._fieldsByAttribute();

        // workaround for geoserver issue
        if(elems.length === 0){
            for(var v in obj.feature.properties){
                xml += "<" + this.workspace + ":" + v + ">";
                xml += obj.feature.properties[v];
                xml += "</" + this.workspace + ":" + v + ">";
            }
        }

        var attr;

        // Any elements which are not nillable get a value, hopefully from obj.properties
        // If autoincrement is set then any values which are non-nillable and which have minOccurs and maxOccurs == 1 are assumed to be primary keys which are set to auto-increment
        // If a value is present then it autoincrement is overridden
        for(var p = 0;p < elems.length;p++){
            attr = elems[p].getAttribute('name');

            if(typeof obj.feature.properties != 'undefined' && typeof obj.feature.properties[attr] != 'undefined'){
                xml += "<" + this.workspace + ":" + attr +">";
                xml += obj.feature.properties[attr];
                xml += "</" + this.workspace + ":" + attr +">";
            }else if(elems[p].getAttribute('nillable') == 'false'){
                if(elems[p].getAttribute('maxOccurs') == "1" && elems[p].getAttribute('minOccurs') == "1" && options.autoincrement){
                    continue; 
                }else{

                    // Should be set in geomField above!
                    if(elems[p].getAttribute('type') == 'gml:GeometryPropertyType'){
                        continue;
                    }

                    xml += "<" + this.workspace + ":" + attr +">";
                    switch(elems[p].getAttribute('type')){
                        case 'xsd:string':
                            xml += "";
                            break;
                        case 'xsd:dateTime':
                            xml += this._ISO8601TimeStamp();
                            break;
                        default:
                            console.log("Using 0 for default for " + elems[p].getAttribute('type'));
                            xml += 0; // works for string, int, double, bool! It's amazing!...but not for date time or geometry
                    }
                    xml += "</" + this.workspace + ":" + attr +">";
                }
            }
        }

        xml += "</" + this.typename + ">";
        xml += "</wfs:Insert>";
        xml += "</wfs:Transaction>";

        this._post(xml,options.success,options.failure);
        return true;
    };

    // Remove a leaflet object via WFS-T
    // Returns true/false if the request was sent/or not
    this.remove = function(where,options){
        if(!this.ready){ return false; }

        /* 
        where = {
        propertyName : 
        propertyValue
        }

        options = {
        success: function,
        failure: function
        }
        */


        where = $.extend({},where);
        options = $.extend({},options);

        var xml = this._xmlpre;
        xml += '<wfs:Delete typeName="' + this.typename + '">';

        var whereXml = this._whereFilter(where);
        if(whereXml === false){
            return false;
        }
        xml += whereXml;

        xml += '</wfs:Delete>';
        xml += '</wfs:Transaction>';

        this._post(xml,options.success,options.failure);
    };

    this.update = function(obj,where,options){
        where = $.extend({},where);

        var xml = this._xmlpre;
        xml += '<wfs:Update typeName="' + this.typename + '">';

        var geomField = this._fieldsByAttribute('type','gml:GeometryPropertyType',1)[0];
        if(typeof geomField != 'undefined'){
            geomField = geomField.getAttribute('name');
        }else if(typeof obj.geometry_name != 'undefined'){
            geomField = obj.geometry_name;
        }

        xml += '<wfs:Property>';
        xml += '<wfs:Name>';
        xml += geomField;
        xml += '</wfs:Name>';
        xml += '<wfs:Value>';
        xml += obj.toGML();
        xml += '</wfs:Value>';
        xml += '</wfs:Property>';

        // Update non spatial properties
        var elems = this._fieldsByAttribute();
        for(var p = 0;p < elems.length;p++){
            attr = elems[p].getAttribute('name');

            if(typeof obj.feature.properties != 'undefined' && typeof obj.feature.properties[attr] != 'undefined'){
                xml += "<wfs:Property>";
                xml += "<wfs:Name>" + attr +"</wfs:Name>";
                xml += "<wfs:Value>" + obj.feature.properties[attr] + "</wfs:Value>";
                xml += "</wfs:Property>";
            }
        }

        var whereXml = this._whereFilter(where);
        if(whereXml === false){
            return false;
        }
        xml += whereXml;
        xml += '</wfs:Update>';
        xml += '</wfs:Transaction>';

        this._post(xml,options.success,options.failure);
    };

    this._init = function(){
        // generate from featuredesc 
        // http://hostname/geoserver/wfs/?typename=BLAH:geofence_static&request=DescribeFeatureType
        var self = this;
        var req = {
            url : this.url + '?request=DescribeFeatureType&typename=' + this.typename,
            dataType: "xml",
            success : function(xml){
                var exception = self.getElementsByTagName(xml,'ows:ExceptionReport');
                if(exception.length === 0){ 
                    self.featureinfo = xml;
                    self._xmlpre();
                    self.ready = true;
                }
            }
        };
        $.ajax(req);
    };

    this._xmlpre = function(){
        var target = this.getElementsByTagName(this.featureinfo,'xsd:schema')[0].getAttribute('targetNamespace');

        var _xmlpre = '';
        _xmlpre = '';
        _xmlpre += '<wfs:Transaction service="WFS" version="1.1.0"'; 
        _xmlpre += ' xmlns:wfs="http://www.opengis.net/wfs"';
        _xmlpre += ' xmlns:gml="http://www.opengis.net/gml"';
        _xmlpre += ' xmlns:' + this.workspace + '="' + target + '"';
        _xmlpre += ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"';
        _xmlpre += ' xsi:schemaLocation="http://www.opengis.net/wfs http://schemas.opengis.net/wfs/1.0.0/WFS-transaction.xsd';
        _xmlpre += ' ' + this.url + '?request=DescribeFeatureType&amp;typename=' + this.typename;
        _xmlpre += '">';
        this._xmlpre = _xmlpre;
    };

    this._whereFilter = function(where){
        var xml = '<' + this.workspace + ':Filter>';
        if(typeof where.propertyName != 'undefined'){
            xml += '<PropertyIsEqualTo>';
            xml += '<PropertyName>' + where.propertyName + '</PropertyName>';
            xml += '<Literal>' + where.propertyValue + '</Literal>';
            xml += '</PropertyIsEqualTo>'; 
        }else{
            // Later we can add more filter types...
            return false;
        }
        xml += '</' + this.workspace + ':Filter>';
        return xml;
    };

    this._fieldsByAttribute = function(attribute,value,max){
        var seq = this.getElementsByTagName(this.featureinfo,'xsd:sequence')[0];
        if(typeof seq == 'undefined'){
            return [];
        }
        var elems = this.getElementsByTagName(seq,'xsd:element');
        var found = [];

        var foundVal;
        for(var e = 0;e < elems.length;e++){
            if(typeof attribute == 'undefined'){
                found.push(elems[e]);
            }else if(elems[e].getAttribute(attribute) == value){
                found.push(elems[e]);
                if(typeof max == 'number' && found.length == max){
                    return found;
                }
            }
        }

        return found;
    };

    // Used to pad timestamp parts
    this._zeroPad = function(n){
        return n < 10 ? '0' + n : n; 
    };

    // generate timestamps if not provided
    this._ISO8601TimeStamp = function(){
        var d = new Date();
        return d.getUTCFullYear() + '-' + this._zeroPad(d.getUTCMonth() + 1) + '-' + this._zeroPad(d.getUTCDate()) + 'T' + this._zeroPad(d.getUTCHours()) + ':' + this._zeroPad(d.getUTCMinutes()) + ':' + this._zeroPad(d.getUTCSeconds()) + 'Z';
    };

    this._post = function(postData,success,failure){
        var req = {
            type: "POST",
            url: this.url,
            dataType: "xml",
            contentType : "text/xml",
            data: postData
        };

        var self = this;
        if(typeof success == 'function'){
            req.success = function(xml){
                var exception = self.getElementsByTagName(xml,'ows:ExceptionReport');
                if(exception.length > 0){ 
                    if(typeof failure == 'function'){
                        failure(xml);
                    }
                }else{
                    success(xml);
                }
            };
        }
        if(typeof failure == 'function'){
            req.failure = failure;
        }
        $.ajax(req);
    };

    this._init();
};
