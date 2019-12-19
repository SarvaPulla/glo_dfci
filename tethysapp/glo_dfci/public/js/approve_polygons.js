/*****************************************************************************
 * FILE:    Approve Polygond JS
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
    var gs_wms_url,
        input_counter,
        layers,
        map,
        m_uploading_data,
        m_results_per_page,
        $modalUpdate,
        public_interface,				// Object returned by the module
        wms_source,
        wms_layer;





    /************************************************************************
     *                    PRIVATE FUNCTION DECLARATIONS
     *************************************************************************/
    var clear_coords,
        delete_polygon,
        init_events,
        init_jquery_vars,
        init_all,
        init_map,
        init_table,
        reset_alert,
        reset_form,
        submit_update_polygon,
        update_form,
        view_polygon;

    /************************************************************************
     *                    PRIVATE FUNCTION IMPLEMENTATIONS
     *************************************************************************/

    m_results_per_page = 5;

    clear_coords = function(){
        $("#polygon-lon").val('');
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
            $("#attribute-input").val('');
            $("#id-input").val('');
            $("#layer-input").val('');
            addSuccessMessage('Polygon Upload Complete!');
        }
        if("reset" in result){
            $("#attribute-input").val('');
            $("#id-input").val('');
            $("#layer-input").val('');
        }
    };

    $('#update-modal').on('hide.bs.modal', function () {
        reset_form({"reset": "reset"});
    });

    init_jquery_vars = function(){
        var $meta_element = $("#metadata");
        gs_wms_url = $meta_element.attr('data-wms-url');
        $modalUpdate = $("#update-modal");
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
            center: ol.proj.transform([-95.4,29.76], 'EPSG:4326','EPSG:3857'),
            projection: projection,
            zoom: 6
        });

        wms_source = new ol.source.ImageWMS({
            url: 'http://hydropad.org:8181/geoserver/wms',
            params: {'LAYERS': 'glo_dfci:polygons'},
            serverType: 'geoserver',
            crossOrigin: 'Anonymous'
        });

        // 'CQL_FILTER': 'layer_name=\'HighWaterMarks_Int\''
        wms_layer = new ol.layer.Image({
            source: wms_source
        });


        layers = [baseLayer];

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

        var scaleLineControl = new ol.control.ScaleLine({units:'us'});
        map.addControl(scaleLineControl);

    };

    init_events = function(){

    };

    var viewIcon = function(cell, formatterParams){ //plain text value
        return "<span class='glyphicon glyphicon-sunglasses view-point-tabulator'></span>";
    };

    var deleteIcon = function(cell, formatterParams){ //plain text value
        return "<span class='glyphicon glyphicon-remove'></span>";
    };

    var updateIcon = function(cell, formatterParams){ //plain text value
        return "<span class='glyphicon glyphicon-floppy-disk'></span>";
    };


    init_table = function(){
        var table = new Tabulator("#tabulator-table", {
            height:"311px",
            responsiveLayout:true, // enable responsive layouts
            layout:"fitColumns",
            ajaxURL:"tabulator",
            ajaxProgressiveLoad:"load",
            paginationSize:10,
            placeholder:"No Data Set",
            columns:[
                {title:"ID", field:"id", sorter:"number", align:"center"},
                {title:"View", formatter:viewIcon, align:"center", cellClick:function(e, cell){view_polygon(e, cell)}},
                {title:"Update", formatter:updateIcon, align:"center", cellClick:function(e, cell){update_form(e, cell)}},
                {title:"Delete", formatter:deleteIcon, align:"center", cellClick:function(e, cell){delete_polygon(e, cell)}},
                {title:"Layer Name", field:"layer_name", sorter:"string", headerFilter:"select", headerFilterParams:{values:true}},
                {title:"County", field:"county", align:"center", sorter:"string", headerFilter:"select", headerFilterParams:{values:true}},
                {title:"Attributes", field:"attributes", align:"center", sorter:"string"},
                {title:"Metadata", field:"metadata", align:"center", sorter:"string"},
                {title:"Approved", field:"approved", align:"center", sorter:"boolean", headerFilter:"select", headerFilterParams:{values:true}}
            ]
        });
    };


    view_polygon = function(e, cell){
        var polygon_id = cell.getRow().getData().id;
        map.removeLayer(wms_layer);
        var sld_string = '<StyledLayerDescriptor version="1.0.0"><NamedLayer><Name>glo_dfci:polygons</Name><UserStyle><FeatureTypeStyle>\
                        <Rule>\
                        <PointSymbolizer>\
                        <Graphic>\
                        <Mark>\
                        <WellKnownName>circle</WellKnownName>\
                        <Fill>\
                        <CssParameter name="fill">#FF0000</CssParameter>\
                        </Fill>\
                        </Mark>\
                        <Size>16</Size>\
                        </Graphic>\
                        </PointSymbolizer>\
                        </Rule>\
                        </FeatureTypeStyle>\
                        </UserStyle>\
                        </NamedLayer>\
                        </StyledLayerDescriptor>';
        wms_source = new ol.source.ImageWMS({
            url: gs_wms_url,
            params: {'LAYERS': 'glo_dfci:polygons',
                'FeatureID': polygon_id},
            serverType: 'geoserver',
            crossOrigin: 'Anonymous'
        });
        wms_layer = new ol.layer.Image({
            source: wms_source
        });

        map.addLayer(wms_layer);
    };

    delete_polygon = function(e, cell){
        var data = {
            polygon_id: cell.getRow().getData().id
        };
        //update database
        var xhr = deleteRowData($(this), data);
        if (xhr != null) {
            xhr.done(function (data) {
                if ('success' in data) {
                    addSuccessMessage("Polygon Successfully Deleted!");
                    cell.getRow().delete();
                }
            });
        }
    };

    update_form = function(e, cell){
        $modalUpdate.modal('show');
        $("#meta-group").html('');
        //scroll back to top
        window.scrollTo(0,0);
        //clear messages
        $('#message').addClass('hidden');
        $('#message').empty()
            .addClass('hidden')
            .removeClass('alert-success')
            .removeClass('alert-info')
            .removeClass('alert-warning')
            .removeClass('alert-danger');

        //check data store input
        var cell_data = cell.getRow().getData();
        var polygon_id = cell_data.id;
        var polygon_layer_name = cell_data.layer_name;

        var polygon_attribute = cell_data.attributes;
        // polygon_attribute = polygon_attribute.replace(/\'/g, "\"");
        polygon_attribute = JSON.parse(polygon_attribute);
        polygon_attribute = Object.keys(polygon_attribute).map( function(key){ return key+":"+polygon_attribute[key] }).join(",");

        var polygon_approved = cell_data.approved;
        var polygon_meta = cell_data.metadata;
        // polygon_meta = polygon_meta.replace(/\'/g, "\"");


        $("#id-input").val(polygon_id);
        $("#layer-input").val(polygon_layer_name);
        $("#attribute-input").val(polygon_attribute);
        $("#approved-input option::selection").val(polygon_approved).change();

        if(polygon_meta!==undefined){
            polygon_meta = JSON.parse(polygon_meta);
            input_counter = Object.keys(polygon_meta).length + 1;
            $.map(polygon_meta, function(key, val){
                var input_id = val;

                if(val.indexOf('text') !== -1){
                    $("#meta-group").append('<div class="input-group">\n' +
                        '<input type="text" class="form-control"  id="' + input_id +'" placeholder="External Link" value="'+key+'">' +
                        '<div class="input-group-btn">' +
                        '<button class="btn btn-default remove" type="submit">' +
                        '<i class="glyphicon glyphicon-remove"></i>' +
                        '</button>' +
                        '</div>' +
                        '</div>');
                    $('.remove').click(function() {
                        $(this).parent().parent().remove();
                    });
                }
                if(val.indexOf('file') !== -1){
                    $("#meta-group").append('<div class="input-group">\n' +
                        '<input type="text" class="form-control"  id="' + input_id +'" placeholder="External File" value="'+key+'" readonly>' +
                        '<div class="input-group-btn">' +
                        '<button class="btn btn-default remove" type="submit">' +
                        '<i class="glyphicon glyphicon-remove"></i>' +
                        '</button>' +
                        '</div>' +
                        '</div>');
                    $('.remove').click(function() {
                        $(this).parent().parent().remove();
                    });
                }
            });

        }

    };

    submit_update_polygon = function(){
        var polygon_id = $("#id-input").val();
        var polygon_layer_name = $("#layer-input").val();
        var polygon_attribute = $("#attribute-input").val();
        var polygon_approved = $("#approved-input").val();

        var data = new FormData();


        data.append("polygon_id", polygon_id);
        data.append("polygon_layer_name", polygon_layer_name);
        data.append("polygon_attribute", polygon_attribute);
        data.append("polygon_approved", polygon_approved);

        var meta_text = [];
        var meta_file = [];

        var inputValues = $('#meta-group :input').map(function() {
            var type = $(this).prop("type");
            var id = $(this).prop("id");

            if (id.indexOf("text") !== -1) {
                var link_text = $(this).val();
                data.append(id, link_text);
                meta_text.push(id);
            }

            else if (id.indexOf("file") !== -1) {
                if(type=="file"){
                    var file_content = $(this)[0].files;
                    data.append(id, file_content[0]);
                    meta_file.push(id);
                }else{
                    data.append(id, $(this).val());
                    meta_file.push(id);
                }

            }
        });

        data.append("meta_text", meta_text);
        data.append("meta_file", meta_file);

        var xhr = ajax_update_database_with_file("submit", data);
        xhr.done(function(return_data){
            if("success" in return_data){
                // reset_form(return_data)
                addSuccessMessage("Polygon Update Successful!");
                init_table();
            }else if("error" in return_data){
                addErrorMessage(return_data["error"]);
            }
        });
    };

    $(".submit-update-polygon").click(submit_update_polygon);


    init_all = function(){
        init_jquery_vars();
        init_map();
        init_events();
        init_table();
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
        m_uploading_data = false;
    });

    return public_interface;

}()); // End of package wrapper
// NOTE: that the call operator (open-closed parenthesis) is used to invoke the library wrapper
// function immediately after being parsed.
