/*****************************************************************************
 * FILE:    Add New Layer
 * DATE:    22 AUGUST 2019
 * AUTHOR: Sarva Pulla
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
    var public_interface,				// Object returned by the module
        $shp_input;


    /************************************************************************
     *                    PRIVATE FUNCTION DECLARATIONS
     *************************************************************************/

    var add_layer,
        get_shp_attributes,
        init_all,
        init_jquery_vars,
        init_dropdown,
        reset_alert,
        reset_form;



    /************************************************************************
     *                    PRIVATE FUNCTION IMPLEMENTATIONS
     *************************************************************************/
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
            $("#layer-input").val('');
            $("#shp-upload-input").val('');
            $(".attributes").addClass('hidden');
            addSuccessMessage('Layer Upload Complete!');
        }
    };

    init_jquery_vars = function(){
        $shp_input = $("#shp-upload-input");

    };

    init_dropdown = function () {

        $(".select_attributes").select2();
    };

    add_layer = function(){
        reset_alert();
        var layer;
        var add_option = $("#add-new-select option:selected").val();

        if(add_option==='True'){
            layer = $("#layer-text-input").val();
        }else{
            layer =  $("#layer-select-input option:selected").val();
        }
        var shapefiles = $("#shp-upload-input")[0].files;
        var attributes = $("#select_attributes").val();

        if(layer === ""){
            addErrorMessage("Layer name cannot be empty!");
            return false;
        }else{
            reset_alert();
        }
        addInfoMessage("Adding Layer. Please wait...","message");
        var data = new FormData();
        data.append("layer", layer);
        data.append("attributes", attributes)
        for(var i=0;i < shapefiles.length;i++){
            data.append("shapefile",shapefiles[i]);
        }
        var submit_button = $("#submit-add-layer");
        var submit_button_html = submit_button.html();
        submit_button.text('Submitting ...');
        var xhr = ajax_update_database_with_file("submit",data); //Submitting the data through the ajax function, see main.js for the helper function.
        xhr.done(function(return_data){ //Reset the form once the data is added successfully
            if("success" in return_data){
                submit_button.html(submit_button_html);
                reset_form(return_data);
            }
        });
    };

    $("#submit-add-layer").click(add_layer);

    get_shp_attributes = function(){

        var shapefiles = $("#shp-upload-input")[0].files;
        if($shp_input.val() === ""){
            addErrorMessage("Layer Shape File cannot be empty!");
            return false;
        }else{
            reset_alert();
        }

        addInfoMessage("Getting attributes. Please wait...","message");
        var data = new FormData();
        for(var i=0;i < shapefiles.length;i++){
            data.append("shapefile",shapefiles[i]);
        }
        var submit_button = $("#submit-get-attributes");
        var submit_button_html = submit_button.html();
        submit_button.text('Submitting ...');
        var xhr = ajax_update_database_with_file("get-attributes",data); //Submitting the data through the ajax function, see main.js for the helper function.
        xhr.done(function(return_data){ //Reset the form once the data is added successfully
            if("success" in return_data){
                submit_button.html(submit_button_html);
                $(".attributes").removeClass('hidden');
                $("#select_attributes").html('');
                var attributes = return_data["attributes"];
                attributes.forEach(function(attr,i){
                    var new_option = new Option(attr, attr);
                    $("#select_attributes").append(new_option);
                });
                $(".add").removeClass('hidden');
            }
        });
    };

    $("#submit-get-attributes").click(get_shp_attributes);

    init_all = function(){
        init_jquery_vars();
        init_dropdown();
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
        $("#add-new-select").change(function(){
            var add_option = $("#add-new-select option:selected").val();
            if(add_option=='True'){
                $('.layer_text').removeClass('hidden');
                $('.layer_select').addClass('hidden');
            }else{
                $('.layer_text').addClass('hidden');
                $('.layer_select').removeClass('hidden');
            }
        }).change();
    });

    return public_interface;

}()); // End of package wrapper
// NOTE: that the call operator (open-closed parenthesis) is used to invoke the library wrapper
// function immediately after being parsed.