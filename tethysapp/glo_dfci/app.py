from tethys_sdk.base import TethysAppBase, url_map_maker
from tethys_sdk.app_settings import PersistentStoreDatabaseSetting, PersistentStoreConnectionSetting


class GloDfci(TethysAppBase):
    """
    Tethys app class for Drainage Flood Control Infrastructure.
    """

    name = 'Drainage Flood Control Infrastructure'
    index = 'glo_dfci:home'
    icon = 'glo_dfci/images/logo.jpg'
    package = 'glo_dfci'
    root_url = 'glo-dfci'
    color = '#16a085'
    description = 'Drainage Flood Control Infrastructure'
    tags = ''
    enable_feedback = False
    feedback_emails = []

    def url_maps(self):
        """
        Add controllers
        """
        UrlMap = url_map_maker(self.root_url)

        url_maps = (
            UrlMap(
                name='home',
                url='glo-dfci',
                controller='glo_dfci.controllers.home'
            ),
            UrlMap(
                name='popup-info',
                url='glo-dfci/popup-info',
                controller='glo_dfci.controllers_ajax.get_popup_info'
            ),
            UrlMap(
                name='get-meta-file',
                url='glo-dfci/get-meta-file',
                controller='glo_dfci.controllers_ajax.get_meta_file'
            ),
            UrlMap(
                name='add-point',
                url='glo-dfci/add-point',
                controller='glo_dfci.controllers.add_point'
            ),
            UrlMap(
                name='delete-layer',
                url='glo-dfci/delete-layer',
                controller='glo_dfci.controllers.delete_layer'
            ),
            UrlMap(
                name='submit-delete-layer',
                url='glo-dfci/delete-layer/submit',
                controller='glo_dfci.controllers_ajax.layer_delete'
            ),
            UrlMap(
                name='add-point-ajax',
                url='glo-dfci/add-point/submit',
                controller='glo_dfci.controllers_ajax.point_add'
            ),
            UrlMap(
                name='approve-points',
                url='glo-dfci/approve-points',
                controller='glo_dfci.controllers.approve_points'
            ),
            UrlMap(
                name='approve-points_tabulator',
                url='glo-dfci/approve-points/tabulator',
                controller='glo_dfci.controllers_ajax.points_tabulator'
            ),
            UrlMap(
                name='update-points-ajax',
                url='glo-dfci/approve-points/submit',
                controller='glo_dfci.controllers_ajax.point_update'
            ),
            UrlMap(
                name='delete-points-ajax',
                url='glo-dfci/approve-points/delete',
                controller='glo_dfci.controllers_ajax.point_delete'
            ),
            UrlMap(
                name='add-polygon',
                url='glo-dfci/add-polygon',
                controller='glo_dfci.controllers.add_polygon'
            ),
            UrlMap(
                name='add-polygon-ajax',
                url='glo-dfci/add-polygon/submit',
                controller='glo_dfci.controllers_ajax.polygon_add'
            ),
            UrlMap(
                name='approve-polygons',
                url='glo-dfci/approve-polygons',
                controller='glo_dfci.controllers.approve_polygons'
            ),
            UrlMap(
                name='approve-polygons-tabulator',
                url='glo-dfci/approve-polygons/tabulator',
                controller='glo_dfci.controllers_ajax.polygons_tabulator'
            ),
            UrlMap(
                name='update-polygons-ajax',
                url='glo-dfci/approve-polygons/submit',
                controller='glo_dfci.controllers_ajax.polygon_update'
            ),
            UrlMap(
                name='delete-polygons-ajax',
                url='glo-dfci/approve-polygons/delete',
                controller='glo_dfci.controllers_ajax.polygon_delete'
            ),
            UrlMap(
                name='add-new-layer',
                url='glo-dfci/add-new-layer',
                controller='glo_dfci.controllers.add_new_layer'
            ),
            UrlMap(
                name='get-new-layer-attributes',
                url='glo-dfci/add-new-layer/get-attributes',
                controller='glo_dfci.controllers_ajax.get_shp_attributes'
            ),
            UrlMap(
                name='add-new-layer-ajax',
                url='glo-dfci/add-new-layer/submit',
                controller='glo_dfci.controllers_ajax.new_layer_add'
            ),
            UrlMap(
                name='set-layer-style',
                url='glo-dfci/set-layer-style',
                controller='glo_dfci.controllers.set_layer_style'
            ),
            UrlMap(
                name='set-layer-style-ajax',
                url='glo-dfci/set-layer-style/submit',
                controller='glo_dfci.controllers_ajax.layer_style_set'
            ),
            UrlMap(
                name='add-endpoint',
                url='glo-dfci/add-endpoint',
                controller='glo_dfci.controllers.add_endpoint'
            ),
            UrlMap(
                name='add-endpoint-submit',
                url='glo-dfci/add-endpoint/submit',
                controller='glo_dfci.controllers_ajax.endpoint_add'
            ),
            UrlMap(
                name='delete-endpoint',
                url='glo-dfci/delete-endpoint',
                controller='glo_dfci.controllers.delete_endpoint'
            ),
            UrlMap(
                name='delete-endpoint-submit',
                url='glo-dfci/delete-endpoint/submit',
                controller='glo_dfci.controllers_ajax.endpoint_delete'
            ),
            UrlMap(
                name='get-layers-info',
                url='glo-dfci/api/get-layers-info',
                controller='glo_dfci.api.get_layers_info'
            ),
            UrlMap(
                name='get-layers-by-county',
                url='glo-dfci/api/get-layers-by-county',
                controller='glo_dfci.api.get_layers_by_county'
            ),
            UrlMap(
                name='get-points-by-county',
                url='glo-dfci/api/get-points-by-county',
                controller='glo_dfci.api.get_points_by_county'
            ),
            UrlMap(
                name='get-polygons-by-county',
                url='glo-dfci/api/get-polygons-by-county',
                controller='glo_dfci.api.get_polygons_by_county'
            ),
            UrlMap(
                name='get-points-by-layer',
                url='glo-dfci/api/get-points-by-layer',
                controller='glo_dfci.api.get_points_by_layer'
            ),
            UrlMap(
                name='get-polygons-by-layer',
                url='glo-dfci/api/get-polygons-by-layer',
                controller='glo_dfci.api.get_polygons_by_layer'
            ),
            UrlMap(
                name='get-points-by-geometry',
                url='glo-dfci/api/get-points-by-geometry',
                controller='glo_dfci.api.get_points_by_geom'
            ),
            UrlMap(
                name='get-polygons-by-geometry',
                url='glo-dfci/api/get-polygons-by-geometry',
                controller='glo_dfci.api.get_polygons_by_geom'
            ),
            UrlMap(
                name='dowloand-layers',
                url='glo-dfci/download-layers',
                controller='glo_dfci.controllers_ajax.download_layers'
            ),
            UrlMap(
                name='download-interaction',
                url='glo-dfci/download-interaction',
                controller='glo_dfci.controllers_ajax.download_interaction'
            ),
            UrlMap(
                name='download-points-csv',
                url='glo-dfci/api/download-points-csv',
                controller='glo_dfci.api.download_points_csv'
            ),
            UrlMap(
                name='download-polygons-csv',
                url='glo-dfci/api/download-polygons-csv',
                controller='glo_dfci.api.download_polygons_csv'
            ),
            UrlMap(
                name='download-layer-csv',
                url='glo-dfci/api/download-layer-csv',
                controller='glo_dfci.api.download_layer_csv'
            ),
        )

        return url_maps

    def persistent_store_settings(self):
        """
        Define Persistent Store Settings.
        """
        ps_settings = (
            PersistentStoreDatabaseSetting(
                name='layers',
                description='layers database',
                initializer='glo_dfci.model.init_layer_db',
                required=True,
                spatial=True
            ),
        )

        return ps_settings
