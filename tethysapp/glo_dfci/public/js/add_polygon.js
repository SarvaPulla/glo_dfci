/*****************************************************************************
 * FILE:    MAP JS
 * DATE:    29 JUNE 2019
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
    var input_counter,
        layers,
        map,
        proj_coords,
        public_interface;				// Object returned by the module




    /************************************************************************
     *                    PRIVATE FUNCTION DECLARATIONS
     *************************************************************************/
    var add_polygon,
        add_meta_input,
        clear_coords,
        init_events,
        init_jquery_vars,
        init_all,
        init_map,
        reset_alert,
        reset_form;

    /************************************************************************
     *                    PRIVATE FUNCTION IMPLEMENTATIONS
     *************************************************************************/

    clear_coords = function(){
        $("#polygon-lat-lon").val('');
    };

    //Reset the alerts if everything is going well
    reset_alert = function(){
        $("#message").addClass('hidden');
        $("#message").empty()
            .addClass('hidden')
            .removeClass('alert-success')
            .removeClass('alert-info')
            .removeClass('alert-warning')
            .removeClass('alert-danger');
    };

    //Reset the form when the request is made succesfully
    reset_form = function(result){
        if("success" in result){
            $("#polygon-input").val('');
            $("#year-input").val('');
            $("#attribute-input").val('');
            $("#meta-group").html('');
            input_counter = 1;
            addSuccessMessage('Polygon Upload Complete!');
        }
    };

    init_jquery_vars = function(){
        input_counter = 1;
    };

    init_map = function(){
        var projection = ol.proj.get('EPSG:3857');
        var baseLayer = new ol.layer.Tile({
            source: new ol.source.BingMaps({
                key: '5TC0yID7CYaqv3nVQLKe~xWVt4aXWMJq2Ed72cO4xsA~ApdeyQwHyH_btMjQS1NJ7OHKY8BK-W-EMQMrIavoQUMYXeZIQOUURnKGBOC7UCt4',
                imagerySet: 'AerialWithLabels' // Options 'Aerial', 'AerialWithLabels', 'Road'
            })
        });
        var fullScreenControl = new ol.control.FullScreen();
        var view = new ol.View({
            center: ol.proj.transform([-97.4,29.1], 'EPSG:4326','EPSG:3857'),
            projection: projection,
            zoom: 6
        });
        var vector_source = new ol.source.Vector({
            wrapX: false
        });

        var vector_layer = new ol.layer.Vector({
            name: 'my_vectorlayer',
            source: vector_source,
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

        layers = [baseLayer, vector_layer];

        map = new ol.Map({
            target: document.getElementById("map"),
            layers: layers,
            view: view
        });

        var mousePositionControl = new ol.control.MousePosition({
            coordinateFormat: ol.coordinate.createStringXY(4),
            projection: 'EPSG:4326',
            // comment the following two lines to have the mouse position
            // be placed within the map.
            className: 'custom-mouse-position',
            target: document.getElementById('mouse-position'),
            undefinedHTML: '&nbsp;'
        });
        map.addControl(mousePositionControl);

        //Code for adding interaction for drawing on the map
        var lastFeature, draw, snap,featureType;

        //Clear the last feature before adding a new feature to the map
        var removeLastFeature = function () {
            if (lastFeature) vector_source.removeFeature(lastFeature);
        };

        var modify = new ol.interaction.Modify({source: vector_source});
        map.addInteraction(modify);

        //Add interaction to the map based on the selected interaction type
        var addInteraction = function (geomtype) {
            var typeSelect = document.getElementById('interaction-type');
            var value = typeSelect.value;
            $('#data').val('');
            if (value !== 'None') {
                if (draw)
                    map.removeInteraction(draw);

                draw = new ol.interaction.Draw({
                    source: vector_source,
                    type: geomtype
                });


                map.addInteraction(draw);
                snap = new ol.interaction.Snap({source: vector_source});
                map.addInteraction(snap);
            }
            if (featureType === 'Point' || featureType === 'Polygon') {

                draw.on('drawend', function (e) {
                    lastFeature = e.feature;

                });

                draw.on('drawstart', function (e) {
                    vector_source.clear();
                });

            }

        };

        vector_layer.getSource().on('addfeature', function(event){
            //Extracting the point/polygon values from the drawn feature
            var feature_json = saveData();
            var parsed_feature = JSON.parse(feature_json);
            var feature_type = parsed_feature["features"][0]["geometry"]["type"];
            if (feature_type == 'Polygon'){
                var coords = parsed_feature["features"][0]["geometry"]["coordinates"][0];
                proj_coords = [];
                coords.forEach(function (coord) {
                    var transformed = ol.proj.transform(coord,'EPSG:3857','EPSG:4326');
                    proj_coords.push('['+transformed+']');
                });
                var json_object = '{"type":"Polygon","coordinates":[['+proj_coords+']]}';
                $("#poly-lat-lon").val(json_object);
                $("#polygon-input").val(json_object);
            }
        });

        vector_layer.getSource().on('changefeature', function(event){
            //Extracting the point/polygon values from the drawn feature
            var feature_json = saveData();
            var parsed_feature = JSON.parse(feature_json);
            var feature_type = parsed_feature["features"][0]["geometry"]["type"];
            if (feature_type == 'Polygon'){
                var coords = parsed_feature["features"][0]["geometry"]["coordinates"][0];
                proj_coords = [];
                coords.forEach(function (coord) {
                    var transformed = ol.proj.transform(coord,'EPSG:3857','EPSG:4326');
                    proj_coords.push('['+transformed+']');
                });
                var json_object = '{"type":"Polygon","coordinates":[['+proj_coords+']]}';
                $("#poly-lat-lon").val(json_object);
                $("#polygon-input").val(json_object);

            }
        });

        function saveData() {
            // get the format the user has chosen
            var data_type = 'GeoJSON',
                // define a format the data shall be converted to
                format = new ol.format[data_type](),
                // this will be the data in the chosen format
                data;
            try {
                // convert the data of the vector_layer into the chosen format
                data = format.writeFeatures(vector_layer.getSource().getFeatures());
            } catch (e) {
                // at time of creation there is an error in the GPX format (18.7.2014)
                $('#data').val(e.name + ": " + e.message);
                return;
            }
            // $('#data').val(JSON.stringify(data, null, 4));
            return data;

        }


        $('#interaction-type').change(function (e) {
            featureType = $(this).find('option:selected').val();
            if(featureType == 'None'){
                $('#data').val('');
                clear_coords();
                map.removeInteraction(draw);
                vector_layer.getSource().clear();
            }else if(featureType == 'Point')
            {
                clear_coords();
                addInteraction(featureType);
            }else if(featureType == 'Polygon'){
                clear_coords();
                addInteraction(featureType);
            }
        }).change();

    };

    init_events = function(){

    };

    add_polygon = function(){
        reset_alert();

        var layer = $("#select-layer option:selected").val();
        var attributes = $("#attribute-input").val();
        var polygon = $("#polygon-input").val();

        if(polygon == ""){
            addErrorMessage("Please select a point on the map!");
            return false;
        }else{
            reset_alert();
        }

        var data = new FormData();
        var meta_text = [];
        var meta_file = [];

        var inputValues = $('#meta-group :input').map(function() {
            var type = $(this).prop("type");
            var id = $(this).prop("id");


            if (type == "text") {
                var link_text = $(this).val();
                data.append(id, link_text);
                meta_text.push(id);
            }

            else if (type == "file") {
                var file_content = $(this)[0].files;
                data.append(id, file_content[0]);
                meta_file.push(id);
            }
        });

        data.append("layer", layer)
        data.append("attributes", attributes);
        data.append("polygon", polygon);
        data.append("meta_text", meta_text);
        data.append("meta_file", meta_file);

        var xhr = ajax_update_database_with_file("submit", data);
        xhr.done(function(return_data){
            if("success" in return_data){
                reset_form(return_data);
            }else if("error" in return_data){
                addErrorMessage(return_data["error"]);
            }
        });

    };

    $("#submit-add-polygon").click(add_polygon);

    add_meta_input = function(){
        var input_type = $("#select-meta option:selected").val();
        if(input_type == 'text'){
            var input_id = 'meta_'+input_counter+'_'+input_type;
            $("#meta-group").append('<div class="input-group">\n' +
                '<input type="text" class="form-control"  id="' + input_id +'" placeholder="External Link" >' +
                '<div class="input-group-btn">' +
                '<button class="btn btn-default remove" type="submit">' +
                '<i class="glyphicon glyphicon-remove"></i>' +
                '</button>' +
                '</div>' +
                '</div>');
            $('.remove').click(function() {
                $(this).parent().parent().remove();
            });
            input_counter ++;
        }
        if(input_type == 'file'){
            var input_id = 'meta_'+input_counter+'_'+input_type;
            $("#meta-group").append('<div class="input-group">\n' +
                '<input type="file" class="form-control"  id="' + input_id +'" placeholder="External File" >' +
                '<div class="input-group-btn">' +
                '<button class="btn btn-default remove" type="submit">' +
                '<i class="glyphicon glyphicon-remove"></i>' +
                '</button>' +
                '</div>' +
                '</div>');
            $('.remove').click(function() {
                $(this).parent().parent().remove();
            });
            input_counter ++;
        }


    };

    $("#submit-add-meta").click(add_meta_input);

    init_all = function(){
        init_jquery_vars();
        init_map();
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
    });

    return public_interface;

}()); // End of package wrapper
// NOTE: that the call operator (open-closed parenthesis) is used to invoke the library wrapper
// function immediately after being parsed.
