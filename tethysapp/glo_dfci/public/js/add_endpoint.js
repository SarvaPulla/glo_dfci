/*****************************************************************************
 * FILE:    Add End Point
 * DATE:    15 OCTOBER 2019
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
    var public_interface;


    /************************************************************************
     *                    PRIVATE FUNCTION DECLARATIONS
     *************************************************************************/

    var add_endpoint,
        init_all,
        init_jquery_vars,
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
            $("#endpoint-input").val('');
            $("#wms-layers-input").val('');
            $("#name-input").val('');
            $("#polygon-fill").val('');
            $("#polygon-stroke").val('');
            $("#fill-opacity").val('');
            $("#stroke-width").val('');
            addSuccessMessage('Endpoint Added Successfully!');
        }
    };

    init_jquery_vars = function(){

    };


    add_endpoint = function(){

        reset_alert();
        var type = $("#endpoint-type option:selected").val();
        var endpoint = $("#endpoint-input").val();
        var layer_name = $("#name-input").val();
        var wms_layers_input = $("#wms-layers-input").val();
        var fill = $("#polygon-fill").val();
        var stroke = $("#polygon-stroke").val();
        var opacity = $("#fill-opacity").val();
        var stroke_width = $("#stroke-width").val();

        if(endpoint === ""){
            addErrorMessage("Please enter a REST endpoint");
            return false;
        }else{
            reset_alert();
        }
        if(type==='wms'){
            if(wms_layers_input === ""){
                addErrorMessage("Please enter a WMS Layer");
                return false;
            }else{
                reset_alert();
            }
        }

        var xhr = ajax_update_database("submit", {"type": type, "endpoint": endpoint, "layer_name": layer_name, "wms_layers_input": wms_layers_input,
            "opacity": opacity, "fill": fill, "stroke": stroke, "stroke_width": stroke_width});
        xhr.done(function(return_data){
            if("success" in return_data){
                reset_form(return_data);
            }else if("error" in return_data){
                addErrorMessage(return_data["error"]);
            }
        });
    };

    $("#submit-add-endpoint").click(add_endpoint);

    init_all = function(){
        init_jquery_vars();
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
        $("#endpoint-type").change(function(){
            var layer_type = $("#endpoint-type option:selected").val();
            console.log(layer_type);
            if(layer_type === 'wms'){
                $('.wms_layer').removeClass('hidden');
                $('.wfs_layer').addClass('hidden');
            }else{
                $('.wms_layer').addClass('hidden');
                $('.wfs_layer').removeClass('hidden');
            }
        }).change();
    });

    return public_interface;

}()); // End of package wrapper
// NOTE: that the call operator (open-closed parenthesis) is used to invoke the library wrapper
// function immediately after being parsed.