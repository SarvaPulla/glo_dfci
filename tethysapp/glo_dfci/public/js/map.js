/*****************************************************************************
 * FILE:    MAP JS
 * DATE:    1 JUNE 2019
 * AUTHOR: Sarva Pulla
 * COPYRIGHT: (c) 2019
 * LICENSE: BSD 2-Clause
 *****************************************************************************/

/*****************************************************************************
 *                      LIBRARY WRAPPER
 *****************************************************************************/

var LIBRARY_OBJECT = (function() {
    // Wrap the library in a package function
    "use strict"; // And enable strict mode for this library

    /************************************************************************
     *                      MODULE LEVEL / GLOBAL VARIABLES
     *************************************************************************/
    var $btnUpload,
        current_layer,
        counties_source,
        counties_layer,
        element,
        endpoint_options,
        geolocation,
        gs_wms_url,
        layers,
        layersDict,
        layer_options,
        map,
        $modalUpload,
        popup,
        popup_content,
        proj_coords,
        public_interface,				// Object returned by the module
        shpSource,
        shpLayer,
        view,
        wms_layer,
        wms_source;



    /************************************************************************
     *                    PRIVATE FUNCTION DECLARATIONS
     *************************************************************************/
    var add_vli_layers,
        get_db_file,
        get_popup,
        init_events,
        init_jquery_vars,
        init_all,
        init_map;

    /************************************************************************
     *                    PRIVATE FUNCTION IMPLEMENTATIONS
     *************************************************************************/

    init_jquery_vars = function(){
        var $meta_element = $("#metadata");
        gs_wms_url = $meta_element.attr('data-wms-url');
        layer_options = $meta_element.attr('data-layer-options');
        layer_options = JSON.parse(layer_options);
        endpoint_options = $meta_element.attr('data-endpoint-options');
        endpoint_options = JSON.parse(endpoint_options);
        $modalUpload = $("#modalUpload");
        $btnUpload = $("#btn-add-shp");
    };

    init_map = function(){

        // var base_map =  new ol.layer.Tile({
        // 	source: new ol.source.OSM()
        // });

        wms_source = new ol.source.ImageWMS({
            url: gs_wms_url,
            params: {'LAYERS': 'glo_dfci:points'},
            serverType: 'geoserver',
            crossOrigin: 'Anonymous'
        });
        // 'CQL_FILTER': 'layer_name=\'HighWaterMarks_Int\''
        wms_layer = new ol.layer.Image({
            source: wms_source
        });

        var attribution = new ol.Attribution({
            html: 'Tiles © <a href="https://services.arcgisonline.com/ArcGIS/rest/services/">ArcGIS</a>'
        });

        layersDict = {};

        // var base_map = new ol.layer.Tile({
        //     name:'Base Map 1',
        //     source: new ol.source.BingMaps({
        //         key: '5TC0yID7CYaqv3nVQLKe~xWVt4aXWMJq2Ed72cO4xsA~ApdeyQwHyH_btMjQS1NJ7OHKY8BK-W-EMQMrIavoQUMYXeZIQOUURnKGBOC7UCt4',
        //         imagerySet: 'AerialWithLabels' // Options 'Aerial', 'AerialWithLabels', 'Road'
        //     }),
        //     baseLayer:true,
        //     title:"Bing",
        //     visible:false
        // });
        var base_map = new ol.layer.Tile({
            name:'Base Map 1',
            crossOrigin: 'anonymous',
            source: new ol.source.XYZ({
                attributions: [attribution],
                url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer' +
                    '/tile/{z}/{y}/{x}'
            }),
            baseLayer:true,
            visible:false,
            title: "World Imagery"

        });
        var basemap_labels = new ol.layer.Tile({
            name:'Base Map Labels',
            crossOrigin: 'anonymous',
            source: new ol.source.XYZ({
                attributions: [attribution],
                url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer' +
                    '/tile/{z}/{y}/{x}'
            }),
            visible:false,
            title: "Boundary Labels"

        });
        var base_map2 = new ol.layer.Tile({
            name:'Base Map 2',
            crossOrigin: 'anonymous',
            source: new ol.source.OSM(),
            baseLayer:true,
            title: "Open Street Map"

        });

        counties_source = new ol.source.ImageWMS({
            url: gs_wms_url,
            params: {
                'LAYERS': 'glo_vli:TexasCounties'
            },
            serverType: 'geoserver',
            crossOrigin: 'Anonymous'
        });

        counties_layer = new ol.layer.Image({
            name: 'Counties',
            title: "Counties",
            source: counties_source
        });

        //Creating an empty source and layer to store the shapefile geojson object
        shpSource = new ol.source.Vector();
        shpLayer = new ol.layer.Vector({
            source: shpSource,
            displayInLayerSwitcher: false
        });

        //Creating an empty source and layer to store the point/polygon features.
        var source = new ol.source.Vector({
            wrapX: false
        });
        var vector_layer = new ol.layer.Vector({
            name: 'my_vectorlayer',
            source: source,
            displayInLayerSwitcher: false,
            style: new ol.style.Style({
                fill: new ol.style.Fill({
                    color: 'rgba(255, 255, 255, 0.2)'
                }),
                stroke: new ol.style.Stroke({
                    color: '#ffcc33',
                    width: 2
                }),
                image: new ol.style.Circle({
                    radius: 7,
                    fill: new ol.style.Fill({
                        color: '#ffcc33'
                    })
                })
            })
        });

        layers = [base_map, base_map2, basemap_labels, vector_layer, shpLayer, counties_layer];

        view = new ol.View({
            center: ol.proj.transform([-94.40, 30.20], 'EPSG:4326', 'EPSG:3857'),
            zoom: 9,
            minZoom: 2,
            maxZoom: 18
        });
        map = new ol.Map({
            target: 'map',
            view:view,
            layers: layers,
            moveTolerance: 10
        });

        element = document.getElementById('popup');

        popup = new ol.Overlay({
            element: element,
            positioning: 'bottom-center',
            stopEvent: true
        });
        map.addOverlay(popup);

        var scaleLineControl = new ol.control.ScaleLine({units:'us'});
        map.addControl(scaleLineControl);

        var switcher = new ol.control.LayerSwitcher(
            {	target:$(".layerSwitcher").get(0),
                show_progress:true,
                extent: true,
            });

        map.addControl(switcher);

        var download = document.createElement('button');
        download.innerHTML = '<span class="glyphicon glyphicon-download-alt"></span>';

        var handleDownloadLayers = function(e) {
            // var xhr = ajax_update_database("download-layers", {});
            //
            // xhr.done(function(return_data){
            //     var points_url = return_data['points_url'];
            //     var polygons_url = return_data['polygons_url'];
            //     var polygons_csv = '/apps/glo-dfci/api/download-polygons-csv/';
            //     var points_csv = '/apps/glo-dfci/api/download-points-csv/';
            //     window.open(points_csv);
            //     window.open(polygons_csv);
            //     window.open(points_url);
            //     window.open(polygons_url);
            // });
            $("#download-modal").modal('show');
        };

        download.addEventListener('click', handleDownloadLayers, false);

        var print = document.createElement('button');
        print.innerHTML = '<span class="glyphicon glyphicon-print"></span>';

        var printMap = function(e){
            map.once('postcompose', function(event) {
                var canvas = event.context.canvas;
                if (navigator.msSaveBlob) {
                    navigator.msSaveBlob(canvas.msToBlob(), 'map.png');
                } else {
                    canvas.toBlob(function(blob) {
                        saveAs(blob, 'map.png');
                    });
                }
            });
            map.renderSync();
        };
        var print_element = document.createElement('div');
        print_element.className = 'print-map ol-unselectable ol-control';
        print_element.appendChild(print);
        print.addEventListener('click', printMap, false);
        var PrintMapControl = new ol.control.Control({
            element: print_element
        });
        map.addControl(PrintMapControl);

        var div_element = document.createElement('div');
        div_element.className = 'download-layers ol-unselectable ol-control';
        div_element.appendChild(download);

        var DownloadLayersControl = new ol.control.Control({
            element: div_element
        });
        map.addControl(DownloadLayersControl);

        var interact = document.createElement('button');
        interact.innerHTML = '<span class="glyphicon glyphicon-pencil"></span>';

        var handleInteract = function(e) {
            $("#interaction-modal").modal('show');
        };

        interact.addEventListener('click', handleInteract, false);

        var int_element = document.createElement('div');
        int_element.className = 'interaction-control ol-unselectable ol-control';
        int_element.appendChild(interact);

        var InteractLayersControl = new ol.control.Control({
            element: int_element
        });
        map.addControl(InteractLayersControl);

        var lastFeature, draw, featureType;

        //Remove the last feature before drawing a new one
        var removeLastFeature = function () {
            if (lastFeature) source.removeFeature(lastFeature);
        };

        //Add the point/polygon interaction to the map
        var addInteraction = function (geomtype) {
            var typeSelect = document.getElementById('types');
            var value = typeSelect.value;
            $('#data').val('');
            if (value !== 'None') {
                if (draw)
                    map.removeInteraction(draw);

                draw = new ol.interaction.Draw({
                    source: source,
                    type: geomtype
                });


                map.addInteraction(draw);
            }
            if (featureType === 'Point'|| featureType === 'Polygon') {

                // draw.on('drawend', function (e) {
                //     removeLastFeature();
                //     lastFeature = e.feature;
                // });
                draw.on('drawend', function (e) {
                    lastFeature = e.feature;

                });

                draw.on('drawstart', function (e) {
                    source.clear();
                });

            }


        };

        //Extracting information from the saved json object data
        vector_layer.getSource().on('addfeature', function(event){
            var feature_json = saveData();
            var parsed_feature = JSON.parse(feature_json);
            var feature_type = parsed_feature["features"][0]["geometry"]["type"];

            if (feature_type === 'Polygon'){
                $("#loading-modal").modal("show");
                var data = {"feature": feature_json};
                var xhr = ajax_update_database("download-interaction", data);

                xhr.done(function(return_data){
                    // var point_download = document.getElementById('point-download');
                    // point_download.href = 'data:text/json;charset=utf-8,'+return_data;
                    var a = document.createElement("a");
                    var file = new Blob([JSON.stringify(return_data)], {type: 'application/json'});
                    a.href = URL.createObjectURL(file);
                    a.download = 'features.json';
                    a.click();
                    $("#loading-modal").modal("hide");
                });
            }
        });

        //Save the drawn feature as a json object
        function saveData() {
            // get the format the user has chosen
            var data_type = 'GeoJSON',
                // define a format the data shall be converted to
                format = new ol.format[data_type](),
                // this will be the data in the chosen format
                data;
            try {
                // convert the data of the vector_layer into the chosen format
                data = format.writeFeatures(vector_layer.getSource().getFeatures(),{
                    dataProjection: 'EPSG:4326',
                    featureProjection: 'EPSG:3857'
                });
            } catch (e) {
                // at time of creation there is an error in the GPX format (18.7.2014)
                $('#data').val(e.name + ": " + e.message);
                return;
            }
            // $('#data').val(JSON.stringify(data, null, 4));
            return data;

        }

        //Change the map based on the interaction type. Add/remove interaction accordingly.
        $('#types').change(function (e) {
            featureType = $(this).find('option:selected').val();
            if(featureType == 'None'){
                $('#data').val('');
                map.removeInteraction(draw);
                vector_layer.getSource().clear();
                shpLayer.getSource().clear();
            }else if(featureType=='Polygon'){
                shpLayer.getSource().clear();
                addInteraction(featureType);
            }
            else if(featureType =='Upload'){
                vector_layer.getSource().clear();
                shpLayer.getSource().clear();
                map.removeInteraction(draw);
                $("#interaction-modal").modal('hide');
                $modalUpload.modal('show');

            }
        }).change();




    };

    get_popup = function(evt){

        var clickCoord = evt.coordinate; //Get the coordinate of the clicked point
        popup.setPosition(clickCoord);
        // map.getLayers().item(1).getSource().clear();

        var view = map.getView();
        var viewResolution = view.getResolution();

        var layer_type = current_layer.get('layer_type');

        if(layer_type==='wfs') {
            var lname = current_layer.get('title');
            var attr_text_html = '';
            var feature = map.forEachFeatureAtPixel(evt.pixel,
                function (feature, layer) {
                    return feature;
                });
            if (feature) {
                var props = feature.getProperties();
                if (Object.keys(props).length > 0) {
                    $.each(props, function (key, val) {
                        if (key !== 'geometry') {
                            attr_text_html += '<tr><td><span>'+key+':' +val+'</span></td></tr>'
                        }

                    });
                    popup_content = '<table class="table"><tr class="bg-primary"><td>Layer Name: '+lname+'</td></tr>'+attr_text_html;

                    $(element).popover({
                        'placement': 'top',
                        'html': true,
                        //Dynamically Generating the popup content
                        'content': popup_content
                    });

                    $(element).popover('show');
                    $(element).next().css('cursor', 'text');
                }
            }
        }

        if(layer_type === 'wms' || layer_type==='dbms') {
            var wms_url = current_layer.getSource().getGetFeatureInfoUrl(evt.coordinate, viewResolution, view.getProjection(), {'INFO_FORMAT': 'application/json'}); //Get the wms url for the clicked point
        }
        if (layer_type==='wms') {
            //Retrieving the details for clicked point via the url
            $.ajax({
                type: "GET",
                url: wms_url,
                dataType: 'json',
                success: function (result) {
                    var lname = current_layer.get('title');
                    var attr_text_html = '';
                    var feature = result["features"][0];
                    var prop = feature["properties"];
                    $.each(prop, function (key, val) {
                        if (key !== 'geometry') {
                            attr_text_html += '<tr><td><span>'+key+':' +val+'</span></td></tr>'
                        }
                    });

                    popup_content = '<table class="table"><tr class="bg-primary"><td>Layer Name: '+lname+'</td></tr>'+attr_text_html;

                    $(element).popover({
                        'placement': 'top',
                        'html': true,
                        //Dynamically Generating the popup content
                        'content': popup_content
                    });

                    $(element).popover('show');
                    $(element).next().css('cursor', 'text');

                }
            })
        }
        if (layer_type==='dbms') {
            //Retrieving the details for clicked point via the url
            $.ajax({
                type: "GET",
                url: wms_url,
                dataType: 'json',
                success: function (result) {

                    var id = result["features"][0]["id"];
                    var data = {"id": id};
                    var xhr = ajax_update_database("popup-info", data);

                    xhr.done(function(return_data){

                        if("success" in return_data){
                            var lname = return_data["layer_name"];
                            var meta_dict = return_data["meta_dict"];
                            var file_text_html = '';
                            var attr_text_html = '';
                            if(Object.keys(meta_dict).length>0){
                                $.each(meta_dict, function (key, val) {
                                    if(key.indexOf('file') !== -1){
                                        var get_req = '/apps/glo-dfci/get-meta-file/?file='+val;
                                        file_text_html += '<a href="'+get_req+'">'+val+'</a><br>'
                                    }
                                    if(key.indexOf('text') !== -1){
                                        file_text_html += '<a href="'+val+'" target="_blank">'+val+'</a><br>'
                                    }
                                });
                            }else{
                                file_text_html += 'No Links/Files';
                            }
                            var attr_dict = return_data["attr_dict"];
                            if(Object.keys(attr_dict).length>0){
                                $.each(attr_dict, function (key, val) {
                                    attr_text_html += '<tr><td><span>'+key+':'+val+'</span></td></tr>'
                                    // attr_text_html += '<span>'+key+':'+val+'</span><br>'
                                });
                            }else{
                                attr_text_html += 'No Attributes';
                            }
                            // popup_content = '<table class="table"><tbody><tr class="bg-primary"><th>Layer Name</th><th>Attributes</th><th colspan="10"></th><th>Links/Files</th></tr>'+
                            //     '<tr><td>'+lname+'</td><td colspan="11">'+attr_text_html+'</td><td>'+file_text_html+'</td></tr></tbody></table>';
                            popup_content = '<table class="table"><tr class="bg-primary"><td>Layer Name: '+lname+'</td></tr>'+attr_text_html+'<tr><td>Links/Files<br>'+file_text_html+'</td></tr>'
                        }else if("error" in return_data){
                            console.log(return_data["error"]);
                        }


                        $(element).popover({
                            'placement': 'top',
                            'html': true,
                            //Dynamically Generating the popup content
                            'content': popup_content
                        });

                        $(element).popover('show');
                        $(element).next().css('cursor', 'text');
                    });



                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    console.log(Error);
                }
            });
        }
    };

    init_events = function(){
        (function () {
            var target, observer, config;
            // select the target node
            target = $('#app-content-wrapper')[0];

            observer = new MutationObserver(function () {
                window.setTimeout(function () {
                    map.updateSize();
                }, 350);
            });
            $(window).on('resize', function () {
                map.updateSize();
            });

            config = {attributes: true};

            observer.observe(target, config);
        }());

        //Only show the pointer for layers that aren't base layer, shapefile layer and the point/polygon feature layer
        map.on('pointermove', function(evt) {
            if (evt.dragging) {
                return;
            }
            var pixel = map.getEventPixel(evt.originalEvent);
            var hit = map.forEachLayerAtPixel(pixel, function(layer) {
                if (layer !== layers[0] && layer !== layers[1] && layer !== layers[2] && layer !== layers[3] && layer !== layers[4]  && layer !== layers[5]){
                    current_layer = layer;
                    return true;
                }
            });
            map.getTargetElement().style.cursor = hit ? 'pointer' : '';
        });

        map.on('singleclick', function(evt) {
            $(element).popover('destroy');

            if (map.getTargetElement().style.cursor === "pointer") {
                get_popup(evt);
            }
        });

    };


    add_vli_layers = function(){
        $.each(layer_options, function(lyr_key, lyrs){
            lyrs.forEach(function(lyr, i){
                var visible = false;
                var gs_layer = 'glo_dfci:' + lyr_key;
                var cql_str = 'layer_name=' + '\'' + lyr + '\' AND approved=True';
                var style = lyr.replace(/ /g,"_").toLowerCase();

                wms_source = new ol.source.TileWMS({
                    url: gs_wms_url,
                    params: {
                        'LAYERS': gs_layer,
                        'CQL_FILTER': cql_str,
                        'STYLES': style,
                        'TILED': true
                    },
                    serverType: 'geoserver',
                    crossOrigin: 'Anonymous'
                });

                wms_layer = new ol.layer.Tile({
                    source: wms_source,
                    name:lyr,
                    visible:visible,
                    title: lyr,
                    layer_type: 'dbms'
                });

                map.addLayer(wms_layer);

                layersDict[lyr] = wms_layer;
            });
        });
        $.each(endpoint_options, function(lyr_key, lyrs){
            if(lyrs.layer_type==='wfs'){

                var s_fill = lyrs.meta['fill'];
                var stroke_width = lyrs.meta['stroke_width'];
                var stroke_color = lyrs.meta['stroke_color'];
                var featureStyle = new ol.style.Style({
                    fill: new ol.style.Fill({
                        color: "#"+s_fill
                    }),
                    stroke: new ol.style.Stroke({
                        color: "#"+stroke_color,
                        width: stroke_width,
                        lineCap: 'round'
                    })
                });

                var vectorSource = new ol.source.Vector({
                    format: new ol.format.GeoJSON(),
                    crossOrigin: 'Anonymous',
                    url: function(extent) {
                        return lyrs.url+'&srsname=EPSG:3857&' +
                            'bbox=' + extent.join(',') + ',EPSG:3857';
                    },
                    strategy: ol.loadingstrategy.bbox
                });

                var vector = new ol.layer.Vector({
                    source: vectorSource,
                    title: lyrs.layer_name,
                    layer_type: lyrs.layer_type,
                    visible:false,
                    style: featureStyle
                });
                map.addLayer(vector);
            }else{
                var wms_url = lyrs.url;
                var wms_layers = lyrs.meta['LAYERS'];
                var wms_legend_url = lyrs.legend_url;
                wms_source = new ol.source.TileWMS({
                    url: wms_url,
                    params: {
                        'LAYERS': wms_layers,
                        'TILED': true
                    },
                    // serverType: 'geoserver',
                    crossOrigin: 'Anonymous'
                });
                //
                wms_layer = new ol.layer.Tile({
                    source: wms_source,
                    name:lyrs.layer_name,
                    visible:false,
                    title: lyrs.layer_name,
                    layer_type: 'wms'
                });
                //
                map.addLayer(wms_layer);
            }

        });
    };

    get_db_file = function(){
        var layer_type = $("#layer-types option:selected").val();
        if(layer_type==='layer_csv'){
            var csv_layer = $("#layer-select-input option:selected").val();
            var csv_layer_type = csv_layer.split('|')[1];
            var layer_name = csv_layer.split('|')[0];
            var req_url = '/apps/glo-dfci/api/download-layer-csv/?layer_type='+csv_layer_type+'&layer_name='+layer_name;
            window.open(req_url);
        }else{
            var xhr = ajax_update_database("download-layers", {});

            xhr.done(function(return_data){
                var points_url = return_data['points_url'];
                var polygons_url = return_data['polygons_url'];
                if(layer_type==='point_shp'){
                    window.open(points_url);
                }else{
                    window.open(polygons_url);

                }
            });
        }
    };

    $("#btn-download-file").click(get_db_file);

    init_all = function(){
        init_jquery_vars();
        init_map();
        add_vli_layers();
        init_events();
    };
    /************************************************************************
     *                        DEFINE PUBLIC INTERFACE
     *************************************************************************/
    /*
     * Library object that contains public facing functions of the package.
     * This is the object that is returned by the library wrapper function.
     * See below.
     * NOTE: The functions in the public interface have access to the private
     * functions of the library because of JavaScript function scope.
     */
    public_interface = {

    };

    /************************************************************************
     *                  INITIALIZATION / CONSTRUCTOR
     *************************************************************************/

    // Initialization: jQuery function that gets called when
    // the DOM tree finishes loading
    $(function() {
        init_all();
        $("#help-modal").modal('show');
        // geolocation = new ol.Geolocation({
        //     projection: view.getProjection(),
        //     tracking: true
        // });
        //
        //
        // geolocation.once('change', function() {
        //     view.setCenter(geolocation.getPosition());
        //     view.setResolution(12);
        // });
        $("#layer-types").change(function(){
            var layer_type = $("#layer-types option:selected").val();
            if(layer_type==='layer_csv'){
                $('.layer_csv_select').removeClass('hidden');
            }else{
                $('.layer_csv_select').addClass('hidden');
            }
        });

        $("#select-county").change(function() {
            var counties = ($("#select-county").val());

            if(counties){
                var county_str = "'" + counties.join("','") + "'";
                counties_source.updateParams({'CQL_FILTER': 'CNTY_NM IN ('+ county_str +')'});
                for (var key in layersDict) {
                    var layer_source = layersDict[key].getSource();
                    var layer_name = layersDict[key].get('name');
                    map.getLayers().forEach(function (el) {
                        if (el.get('name') === key) {
                            var county_cql_str = ' AND layer_name=' + '\'' + layer_name + '\' AND approved=True';
                            layer_source.updateParams({'CQL_FILTER': 'county IN ('+ county_str +')'+ county_cql_str});
                        }
                    });
                }
            }else{
                var county_options = $("#select-county")[0].options;
                var values = $.map(county_options, function( elem ) {
                    return (elem.value);
                });
                var county_str = "'" + values.join("','") + "'";
                counties_source.updateParams({'CQL_FILTER': 'CNTY_NM IN ('+ county_str +')'});
                for (var key in layersDict) {
                    var layer_source = layersDict[key].getSource();
                    var layer_name = layersDict[key].get('name');
                    map.getLayers().forEach(function (el) {
                        if (el.get('name') === key) {
                            var county_cql_str = ' AND layer_name=' + '\'' + layer_name + '\' AND approved=True';
                            layer_source.updateParams({'CQL_FILTER': 'county IN ('+ county_str +')' + county_cql_str});
                        }
                    });
                }
            }

        });

        $.each(layersDict, function(key, val){
            val.on('change:visible', function(e){
                var legend_class = key.replace(/ /g,"_").toLowerCase();
                if(val.getVisible()){
                    $('.'+legend_class).removeClass('hidden');
                }else{
                    $('.'+legend_class).addClass('hidden');
                }

            });
        });

    });

    return public_interface;

}()); // End of package wrapper
// NOTE: that the call operator (open-closed parenthesis) is used to invoke the library wrapper
// function immediately after being parsed.
