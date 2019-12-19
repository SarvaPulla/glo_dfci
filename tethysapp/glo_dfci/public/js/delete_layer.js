/*****************************************************************************
 * FILE:    Delete Layer
 * DATE:    26 AUGUST 2019
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

    var delete_layer,
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
            $("#select-county").val('');
            addSuccessMessage('Layer Successfully Deleted!');
        }
    };

    init_jquery_vars = function(){

    };


    delete_layer = function(){
        if (window.confirm("Are you sure?")) {
            reset_alert();
            var layer = $("#layer-select-input option:selected").val();

            if (layer == "") {
                addErrorMessage("Layer name cannot be empty!");
                return false;
            } else {
                reset_alert();
            }
            addInfoMessage("Deleting Layer. Please wait...", "message");

            var submit_button = $("#submit-delete-layer");
            var submit_button_html = submit_button.html();
            var counties = ($("#select-county").val());
            if(counties){
                var county_str = counties.join(",");
            }else{
                var county_options = $("#select-county")[0].options;
                var values = $.map(county_options, function( elem ) {
                    return (elem.value);
                });
                var county_str = values.join(",");
            }
            var data = {"counties": county_str, "layer": layer};
            console.log(counties);
            submit_button.text('Deleting ...');
            var xhr = ajax_update_database("submit", data); //Submitting the data through the ajax function, see main.js for the helper function.
            xhr.done(function (return_data) { //Reset the form once the data is added successfully
                if ("success" in return_data) {
                    submit_button.html(submit_button_html);
                    reset_form(return_data);
                }
            });
        }
    };

    $("#submit-delete-layer").click(delete_layer);

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
    });

    return public_interface;

}()); // End of package wrapper
// NOTE: that the call operator (open-closed parenthesis) is used to invoke the library wrapper
// function immediately after being parsed.