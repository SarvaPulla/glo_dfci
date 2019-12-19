from django.http import JsonResponse, HttpResponse, Http404
from django.contrib.auth.decorators import login_required, user_passes_test
from sqlalchemy.orm.exc import ObjectDeletedError
from sqlalchemy.exc import IntegrityError
from .model import *
from .app import GloDfci
from .utils import user_permission_test, process_meta_file, \
    get_point_county_name, get_polygon_county_name, process_shapefile, \
    get_shapefile_attributes, get_layer_options, get_point_style_xml, \
    get_polygon_style_xml, get_polygons_geom, get_points_geom, get_line_style_xml
from shapely.geometry import shape
import os
import json
from django.utils.encoding import smart_str
import geojson
import math
import requests
import json
from urllib.parse import urljoin
from .config import geoserver_rest_url, \
    geoserver_credentials, \
    geoserver_wfs_url


@user_passes_test(user_permission_test)
def point_add(request):

    Session = GloDfci.get_persistent_store_database('layers', as_sessionmaker=True)
    session = Session()
    try:

        if request.is_ajax() and request.method == 'POST':
            info = request.POST

            attributes = info.get('attributes')
            layer_name = info.get('layer_name')
            point = info.get('point')
            longitude = point.split(',')[0]
            latitude = point.split(',')[1]

            county = get_point_county_name(longitude, latitude)

            meta_dict = {}

            meta_text = info.get('meta_text')
            meta_file = info.get('meta_file')

            if meta_text:
                meta_text = meta_text.split(',')

            if meta_file:
                meta_file = meta_file.split(',')

            if len(meta_text) > 0:
                for txt in meta_text:
                    meta_dict[txt] = info.get(txt)

            if len(meta_file) > 0:
                for file in meta_file:
                    meta_dict[file] = process_meta_file(request.FILES.getlist(file)[0])

            attr_dict = {}

            if attributes:
                attributes = attributes.split(',')
                attr_dict = {attr.split(':')[0]: attr.split(':')[1] for attr in attributes}

            point = Points(layer_name=layer_name, latitude=latitude, longitude=longitude, county=county,
                           approved=False, attr_dict=attr_dict, meta_dict=meta_dict)
            session.add(point)

            session.commit()
            session.close()

            response = {"success": "success"}

            return JsonResponse(response)

    except Exception as e:
        session.close()
        return JsonResponse({'error': "There is a problem with your request. " + str(e)})


@user_passes_test(user_permission_test)
def point_update(request):
    """
    Controller for updating a point.
    """
    Session = GloDfci.get_persistent_store_database('layers', as_sessionmaker=True)
    session = Session()

    if request.is_ajax() and request.method == 'POST':
        # get/check information from AJAX request
        post_info = request.POST

        point_id = post_info.get('point_id')
        point_layer_name = post_info.get('point_layer_name')
        point_latitude = post_info.get('point_latitude')
        point_longitude = post_info.get('point_longitude')
        point_attribute = post_info.get('point_attribute')
        point_approved = post_info.get('point_approved')
        point_approved = json.loads(point_approved)

        county = get_point_county_name(point_longitude, point_latitude)

        meta_text = post_info.get('meta_text')
        meta_file = post_info.get('meta_file')

        meta_dict = {}

        if meta_text:
            meta_text = meta_text.split(',')

        if meta_file:
            meta_file = meta_file.split(',')

        if len(meta_text) > 0:
            for txt in meta_text:
                meta_dict[txt] = post_info.get(txt)

        if len(meta_file) > 0:
            for file in meta_file:
                f_result = post_info.get(file)
                if f_result is not None:
                    meta_dict[file] = f_result
                else:
                    meta_dict[file] = process_meta_file(request.FILES.getlist(file)[0])

        attr_dict = {}

        if point_attribute:
            attributes = point_attribute.split(',')
            attr_dict = {attr.split(':')[0]: attr.split(':')[1] for attr in attributes}

        # check data
        if not point_id or not point_layer_name  or not \
                point_latitude or not point_longitude:
            return JsonResponse({'error': "Missing input data."})
        # make sure id is id
        try:
            int(point_id)
        except ValueError:
            return JsonResponse({'error': 'Point id is faulty.'})

        point = session.query(Points).get(point_id)
        try:
            point.latitude = point_latitude
            point.longitude = point_longitude
            point.attr_dict = attr_dict
            point.approved = point_approved
            point.geometry = 'SRID=4326;POINT({0} {1})'.format(point_longitude, point_latitude)
            point.meta_dict = meta_dict
            point.county = county

            session.commit()
            session.close()
            return JsonResponse({'success': "Point successfully updated!"})
        except Exception as e:
            session.close()
            return JsonResponse({'error': "There is a problem with your request. " + str(e)})


@user_passes_test(user_permission_test)
def point_delete(request):
    """
    Controller for deleting a point.
    """
    Session = GloDfci.get_persistent_store_database('layers', as_sessionmaker=True)
    session = Session()

    if request.is_ajax() and request.method == 'POST':
        # get/check information from AJAX request
        post_info = request.POST

        point_id = post_info.get('point_id')

        try:
            # delete point
            try:
                point = session.query(Points).get(point_id)
            except ObjectDeletedError:
                session.close()
                return JsonResponse({'error': "The point to delete does not exist."})

            session.delete(point)
            session.commit()
            session.close()
            return JsonResponse({'success': "Point successfully deleted!"})
        except IntegrityError:
            session.close()
            return JsonResponse({'error': "There is a problem with your request."})


@user_passes_test(user_permission_test)
def polygon_add(request):

    Session = GloDfci.get_persistent_store_database('layers', as_sessionmaker=True)
    session = Session()
    try:
        if request.is_ajax() and request.method == 'POST':
            info = request.POST

            attributes = info.get('attributes')
            layer = info.get('layer')
            polygon = info.get('polygon')
            polygon = geojson.loads(polygon)
            geom = shape(polygon)

            county = get_polygon_county_name(geom.wkt)

            meta_dict = {}

            meta_text = info.get('meta_text')
            meta_file = info.get('meta_file')

            if meta_text:
                meta_text = meta_text.split(',')

            if meta_file:
                meta_file = meta_file.split(',')

            if len(meta_text) > 0:
                for txt in meta_text:
                    meta_dict[txt] = info.get(txt)

            if len(meta_file) > 0:
                for file in meta_file:
                    meta_dict[file] = process_meta_file(request.FILES.getlist(file)[0])

            attr_dict = {}

            if attributes:
                attributes = attributes.split(',')
                attr_dict = {attr.split(':')[0]: attr.split(':')[1] for attr in attributes}

            polygon = Polygons(layer_name=layer, county=county, attr_dict=attr_dict,
                               approved=False, geometry=geom.wkt, meta_dict=meta_dict)
            session.add(polygon)
            session.commit()
            session.close()

            response = {"success": "success"}

            return JsonResponse(response)
    except Exception as e:
        session.close()
        response = {"error": str(e)}
        return JsonResponse(response)


@user_passes_test(user_permission_test)
def polygon_update(request):
    """
    Controller for updating a polygon.
    """
    Session = GloDfci.get_persistent_store_database('layers', as_sessionmaker=True)
    session = Session()
    if request.is_ajax() and request.method == 'POST':
        # get/check information from AJAX request
        post_info = request.POST
        polygon_id = post_info.get('polygon_id')
        polygon_approved = post_info.get('polygon_approved')
        polygon_attribute = post_info.get('polygon_attribute')
        polygon_approved = json.loads(polygon_approved)

        # check data
        if not polygon_id:
            return JsonResponse({'error': "Missing input data."})
        # make sure id is id
        try:
            int(polygon_id)
        except ValueError:
            return JsonResponse({'error': 'Polygon id is faulty.'})

        meta_text = post_info.get('meta_text')
        meta_file = post_info.get('meta_file')

        meta_dict = {}

        if meta_text:
            meta_text = meta_text.split(',')

        if meta_file:
            meta_file = meta_file.split(',')

        if len(meta_text) > 0:
            for txt in meta_text:
                meta_dict[txt] = post_info.get(txt)

        if len(meta_file) > 0:
            for file in meta_file:
                f_result = post_info.get(file)
                if f_result is not None:
                    meta_dict[file] = f_result
                else:
                    meta_dict[file] = process_meta_file(request.FILES.getlist(file)[0])

        attr_dict = {}

        if polygon_attribute:
            attributes = polygon_attribute.split(',')
            attr_dict = {attr.split(':')[0]: attr.split(':')[1] for attr in attributes}

        polygon = session.query(Polygons).get(polygon_id)
        try:

            polygon.approved = polygon_approved
            polygon.meta_dict = meta_dict
            polygon.attr_dict = attr_dict

            session.commit()
            session.close()
            return JsonResponse({'success': "polygon successfully updated!"})
        except Exception as e:
            session.close()
            return JsonResponse({'error': "There is a problem with your request. " + str(e)})


@user_passes_test(user_permission_test)
def polygon_delete(request):
    """
    Controller for deleting a polygon.
    """
    Session = GloDfci.get_persistent_store_database('layers', as_sessionmaker=True)
    session = Session()
    if request.is_ajax() and request.method == 'POST':
        # get/check information from AJAX request
        post_info = request.POST

        polygon_id = post_info.get('polygon_id')

        try:
            # delete point
            try:
                polygon = session.query(Polygons).get(polygon_id)
            except ObjectDeletedError:
                session.close()
                return JsonResponse({'error': "The point to delete does not exist."})

            session.delete(polygon)
            session.commit()
            session.close()
            return JsonResponse({'success': "Point successfully deleted!"})
        except IntegrityError:
            session.close()
            return JsonResponse({'error': "There is a problem with your request."})


def get_popup_info(request):
    """
    Controller for getting relevant data to populate the popup
    """

    post_info = request.POST

    id = post_info.get("id")
    primary_key = id.split('.')[1]
    table = id.split('.')[0]

    json_obj = {}

    json_obj['type'] = table

    Session = GloDfci.get_persistent_store_database('layers', as_sessionmaker=True)
    session = Session()

    try:

        info = None

        if table == 'points':
            info = session.query(Points).get(primary_key)
        elif table == 'polygons':
            info = session.query(Polygons).get(primary_key)

        json_obj['county'] = info.county
        json_obj['meta_dict'] = info.meta_dict
        json_obj['attr_dict'] = info.attr_dict
        json_obj['layer_name'] = info.layer_name
        json_obj['success'] = 'success'

        session.close()

    except Exception as e:
        session.close()
        json_obj['error'] = str(e)

    return JsonResponse(json_obj)


def get_meta_file(request):

    file = request.GET['file']

    app_workspace = app.get_app_workspace()
    f_path = os.path.join(app_workspace.path, file)

    if os.path.exists(f_path):
        with open(f_path, 'rb') as fh:
            response = HttpResponse(fh.read(), content_type='application/force-download')
            response['Content-Disposition'] = 'attachment; filename=%s' % smart_str(file)
            response['X-Sendfile'] = smart_str(f_path)
            return response
    raise Http404


def download_layers(request):
    if request.is_ajax():
        points_url = f'{geoserver_wfs_url}?service=WFS&version=1.0.0&request=GetFeature' \
            f'&typeName=glo_dfci:points&outputFormat=shape-zip'
        polygons_url = f'{geoserver_wfs_url}?service=WFS&version=1.0.0&request=GetFeature' \
            f'&typeName=glo_dfci:polygons&outputFormat=shape-zip'

        response = {"success": "success",
                    "points_url": points_url,
                    "polygons_url": polygons_url}

        return JsonResponse(response)


def download_interaction(request):
    json_obj = {}

    if request.is_ajax():
        info = request.POST
        feature = info.get('feature')
        point_features = get_points_geom(feature)
        polygon_features = get_polygons_geom(feature)
        json_obj['points'] = json.loads(point_features)
        json_obj['polygons'] = json.loads(polygon_features)
        json_obj["success"] = "success"

        return JsonResponse(json_obj)


@user_passes_test(user_permission_test)
def get_shp_attributes(request):

    response = {}

    if request.is_ajax() and request.method == 'POST':

        try:

            shapefile = request.FILES.getlist('shapefile')

            attributes = get_shapefile_attributes(shapefile)

            response = {"success": "success",
                        "attributes": attributes}

            return JsonResponse(response)

        except Exception as e:
            json_obj = {'error': json.dumps(e)}

            return JsonResponse(json_obj)


@user_passes_test(user_permission_test)
def new_layer_add(request):

    response = {}

    if request.is_ajax() and request.method == 'POST':
        info = request.POST

        layer_name = info.get('layer')

        shapefile = request.FILES.getlist('shapefile')

        attributes = info.get('attributes')

        attributes = attributes.split(',')

        response = process_shapefile(shapefile, layer_name, attributes)

        return JsonResponse(response)


@user_passes_test(user_permission_test)
def points_tabulator(request):

    json_obj = {}

    info = request.GET

    page = int(request.GET.get('page'))
    page = page - 1
    size = int(request.GET.get('size'))

    Session = GloDfci.get_persistent_store_database('layers', as_sessionmaker=True)
    session = Session()
    # RESULTS_PER_PAGE = 10
    num_points = session.query(Points).count()
    last_page = math.ceil(int(num_points) / int(size))

    # # Query DB for data store types
    points = session.query(Points).order_by(Points.id.desc()) \
        [(page * size):((page+1) * size)]

    data_dict = []

    for point in points:
        json_obj = {}
        json_obj["id"] = point.id
        json_obj["layer_name"] = point.layer_name
        json_obj["latitude"] = point.latitude
        json_obj["longitude"] = point.longitude
        json_obj["county"] = point.county
        json_obj["attributes"] = json.dumps(point.attr_dict)
        json_obj["metadata"] = json.dumps(point.meta_dict)
        json_obj["approved"] = point.approved
        data_dict.append(json_obj)

    session.close()

    response = {"data": data_dict, "last_page": last_page}

    return JsonResponse(response)


@user_passes_test(user_permission_test)
def polygons_tabulator(request):

    json_obj = {}

    info = request.GET

    page = int(request.GET.get('page'))
    page = page - 1
    size = int(request.GET.get('size'))

    Session = GloDfci.get_persistent_store_database('layers', as_sessionmaker=True)
    session = Session()
    # RESULTS_PER_PAGE = 10
    num_polygons = session.query(Polygons).count()
    last_page = math.ceil(int(num_polygons) / int(size))

    # # Query DB for data store types
    polygons = session.query(Polygons).order_by(Polygons.id.desc()) \
        [(page * size):((page+1) * size)]

    data_dict = []

    for polygon in polygons:
        json_obj = {}
        json_obj["id"] = polygon.id
        json_obj["layer_name"] = polygon.layer_name
        json_obj["county"] = polygon.county
        json_obj["attributes"] = json.dumps(polygon.attr_dict)
        json_obj["metadata"] = json.dumps(polygon.meta_dict)
        json_obj["approved"] = polygon.approved
        data_dict.append(json_obj)

    session.close()

    response = {"data": data_dict, "last_page": last_page}

    return JsonResponse(response)


@user_passes_test(user_permission_test)
def layer_delete(request):
    """
    Controller for deleting a polygon.
    """
    if request.is_ajax() and request.method == 'POST':
        # get/check information from AJAX request
        post_info = request.POST

        layer = post_info.get('layer')
        counties = post_info.get('counties')
        counties = tuple(counties.split(','))

        layer_options = get_layer_options()
        table_type = [key for key, value in layer_options.items() if layer in layer_options[key]][0]

        Session = GloDfci.get_persistent_store_database('layers', as_sessionmaker=True)
        session = Session()
        try:
            # delete layer
            try:
                if table_type == 'polygons':
                    polygons = session.query(Polygons).filter(Polygons.layer_name == layer,
                                                              Polygons.county.in_(counties))
                    polygons.delete(synchronize_session=False)
                    session.commit()
                else:
                    points = session.query(Points).filter(Points.layer_name == layer, Points.county.in_(counties))
                    points.delete(synchronize_session=False)
                    session.commit()
            except ObjectDeletedError:
                session.close()
                return JsonResponse({'error': "The layer to delete does not exist."})

            session.close()
            return JsonResponse({'success': "Layer successfully deleted!"})
        except IntegrityError:
            session.close()
            return JsonResponse({'error': "There is a problem with your request."})


@user_passes_test(user_permission_test)
def layer_style_set(request):

    if request.is_ajax() and request.method == 'POST':
        post_info = request.POST
        layer_info = post_info.get('layer')
        layer_name = layer_info.split('|')[0]
        layer_type = layer_info.split('|')[1]
        style_name = layer_name.replace(r' ', '_').lower()

        get_styles_url = geoserver_rest_url + 'styles.json'
        r_get = requests.get(get_styles_url, auth=geoserver_credentials)
        styles_json = r_get.json()
        styles_list = styles_json["styles"]["style"]
        exists = any(d['name'] == style_name for d in styles_list)

        if layer_type == 'points':
            point_size = post_info.get('point_size')
            point_symbology = post_info.get('point_symbology')
            point_fill = post_info.get('point_fill')
            point_stroke_size = post_info.get('point_stroke_size')
            point_stroke_fill = post_info.get('point_stroke_fill')
            point_xml = get_point_style_xml(point_size, point_symbology, point_fill,
                                            point_stroke_fill, point_stroke_size, layer_name, exists)
        if layer_type == 'polygons':
            poly_type = post_info.get('poly_type')
            if poly_type == 'Polygon':
                polygon_fill = post_info.get('polygon_fill')
                polygon_stroke = post_info.get('polygon_stroke')
                polygon_opacity = post_info.get('polygon_opacity')
                polygon_stroke_width = post_info.get('polygon_stroke_width')
                polygon_xml = get_polygon_style_xml(polygon_fill, polygon_stroke, polygon_opacity,
                                                    polygon_stroke_width, layer_name, exists)

            if poly_type == 'Line':
                line_stroke = post_info.get('line_stroke')
                stroke_dash_array = post_info.get('stroke_dash_array')
                symbol_dash_array = post_info.get('symbol_dash_array')
                stroke_dash_offset = post_info.get('stroke_dash_offset')
                stroke_width = post_info.get('stroke_width')
                line_symbology = post_info.get('line_symbology')
                symbol_size = post_info.get('symbol_size')
                line_xml = get_line_style_xml(line_stroke, stroke_dash_array, symbol_dash_array, stroke_dash_offset,
                                              stroke_width, line_symbology, symbol_size, layer_name, exists)

    return JsonResponse({'success': 'Layer style set successfully.'})


@user_passes_test(user_permission_test)
def endpoint_add(request):

    json_obj = {}

    Session = GloDfci.get_persistent_store_database('layers', as_sessionmaker=True)
    session = Session()

    if request.is_ajax() and request.method == 'POST':
        post_info = request.POST
        layer_name = post_info.get('layer_name')
        layer_type = post_info.get('type')
        url = post_info.get('endpoint')
        meta_dict = {}

        if layer_type == 'wfs':
            fill = post_info.get('fill')
            stroke = post_info.get('stroke')
            opacity = post_info.get('opacity')
            stroke_width = post_info.get('stroke_width')
            meta_dict['fill'] = fill
            meta_dict['stroke'] = stroke
            meta_dict['opacity'] = opacity
            meta_dict['stroke_width'] = stroke_width

            endpoint = Endpoints(layer_name=layer_name, layer_type=layer_type, url=url, meta_dict=meta_dict)
            session.add(endpoint)
            session.commit()
            session.close()

            json_obj["success"] = "success"

        if layer_type == 'wms':
            wms_layer_name = post_info.get('wms_layers_input')
            url = url
            meta_dict['LAYERS'] = wms_layer_name

            endpoint = Endpoints(layer_name=layer_name, layer_type=layer_type, url=url, meta_dict=meta_dict)
            session.add(endpoint)
            session.commit()
            session.close()
            json_obj["success"] = "success"

    return JsonResponse(json_obj)


@user_passes_test(user_permission_test)
def endpoint_delete(request):

    json_obj = {}

    Session = GloDfci.get_persistent_store_database('layers', as_sessionmaker=True)
    session = Session()

    if request.is_ajax() and request.method == 'POST':
        try:
            post_info = request.POST
            layer_name = post_info.get('layer_name')

            endpoint = session.query(Endpoints).filter(Endpoints.layer_name == layer_name)
            endpoint.delete(synchronize_session=False)
            session.commit()
            session.close()

            json_obj["success"] = "success"
        except ObjectDeletedError:
            session.close()
            return JsonResponse({'error': "The layer to delete does not exist."})

    return JsonResponse(json_obj)


