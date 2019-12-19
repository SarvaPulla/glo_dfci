/*****************************************************************************
 * FILE:    Set Layer Style
 * DATE:    9 SEPTEMBER 2019
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
    var public_interface;				// Object returned by the module


    /************************************************************************
     *                    PRIVATE FUNCTION DECLARATIONS
     *************************************************************************/

    var init_all,
        init_jquery_vars,
        init_dropdown,
        reset_alert,
        reset_form,
        set_layer_style;



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
            var polygon_stroke = $("#polygon-stroke").val('');
            var point_size = $("#point-size-input").val('');
            var polygon_opacity = $("#polygon-fill-opacity").val('');
            var polygon_stroke_width = $("#polygon-stroke-width").val('');
            var stroke_dash_array = $("#stroke-dash-array").val('');
            var symbol_dash_array = $("#symbol-dash-array").val('');
            var stroke_dash_offset = $("#stroke-dash-offset").val('');
            var stroke_width = $("#stroke-width").val('');
            var symbol_size = $("#symbol-size").val('');
            var point_stroke = $("#point-stroke-input").val('');

            addSuccessMessage('Layer Style Set Successfully!');
        }
    };

    init_jquery_vars = function(){

    };

    set_layer_style = function(){
        reset_alert();
        var layer = $("#layer-select-input option:selected").val();
        var point_fill =$("#point-fill").val();
        var polygon_fill = $("#polygon-fill").val();
        var polygon_stroke = $("#polygon-stroke").val();
        var point_size = $("#point-size-input").val();
        var point_symbology = $("#select-point-symbology option:selected").val();
        var polygon_opacity = $("#polygon-fill-opacity").val();
        var polygon_stroke_width = $("#polygon-stroke-width").val();
        var poly_type = $("#poly-selector option:selected").val();
        var line_stroke = $("#line-stroke").val();
        var stroke_dash_array = $("#stroke-dash-array").val();
        var symbol_dash_array = $("#symbol-dash-array").val();
        var stroke_dash_offset = $("#stroke-dash-offset").val();
        var stroke_width = $("#stroke-width").val();
        var line_symbology = $("#select-line-symbology option:selected").val();
        var symbol_size = $("#symbol-size").val();
        var point_stroke_size = $("#point-stroke-input").val();
        var point_stroke_fill = $("#stroke-fill").val();

        if (layer === "") {
            addErrorMessage("Layer name cannot be empty!");
            return false;
        } else {
            reset_alert();
        }
        addInfoMessage("Setting Layer Style. Please wait...", "message");

        var submit_button = $("#submit-set-layer");
        var submit_button_html = submit_button.html();
        submit_button.text('Setting Style...');
        var data = {"poly_type": poly_type, "layer": layer, "point_fill": point_fill,
            "polygon_fill": polygon_fill, "polygon_stroke": polygon_stroke,
            "point_size": point_size, "point_symbology": point_symbology,
            "point_stroke_size": point_stroke_size, "point_stroke_fill": point_stroke_fill,
            "polygon_opacity": polygon_opacity, "polygon_stroke_width": polygon_stroke_width,
            "line_stroke": line_stroke, "stroke_dash_array": stroke_dash_array, "symbol_dash_array": symbol_dash_array,
            "stroke_dash_offset": stroke_dash_offset, "stroke_width": stroke_width, "line_symbology": line_symbology, "symbol_size": symbol_size};
        var xhr = ajax_update_database("submit", data); //Submitting the data through the ajax function, see main.js for the helper function.
        xhr.done(function (return_data) { //Reset the form once the data is added successfully
            if ("success" in return_data) {
                submit_button.html(submit_button_html);
                reset_form(return_data);
            }
        });
    };

    $("#submit-set-layer").click(set_layer_style);

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
        $("#layer-select-input").change(function(){
            var layer_info = $("#layer-select-input option:selected").val();
            var layer_type = layer_info.split('|')[1];
            if(layer_type == 'points'){
                $('.point_form').removeClass('hidden');

                $(".poly_selector").addClass("hidden");
                $('.line_form').addClass('hidden');
                $('.polygon_form').addClass('hidden');
            }else{
                $(".poly_selector").removeClass("hidden");
                $('.point_form').addClass('hidden');
                $("#poly-selector").change(function(){
                    var poly_type = $("#poly-selector option:selected").val();
                    if(poly_type==='Polygon'){
                        $('.polygon_form').removeClass('hidden');
                        $('.line_form').addClass('hidden');
                    }else{
                        $('.line_form').removeClass('hidden');
                        $('.polygon_form').addClass('hidden');
                    }
                }).change();
                // $('.polygon_form').removeClass('hidden');
            }
        }).change();
    });


    return public_interface;

}()); // End of package wrapper
// NOTE: that the call operator (open-closed parenthesis) is used to invoke the library wrapper
// function immediately after being parsed.