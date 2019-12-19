/*****************************************************************************
 * FILE:    Delete End Point
 * DATE:    20 OCTOBER 2019
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
            addSuccessMessage('Endpoint Deleted Successfully!');
        }
    };

    init_jquery_vars = function(){

    };


    add_endpoint = function(){

        reset_alert();
        var layer_name = $("#layer-select-input option:selected").val();

        var xhr = ajax_update_database("submit", {"layer_name": layer_name});
        xhr.done(function(return_data){
            if("success" in return_data){
                reset_form(return_data);
            }else if("error" in return_data){
                addErrorMessage(return_data["error"]);
            }
        });
    };

    $("#submit-delete-endpoint").click(add_endpoint);

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