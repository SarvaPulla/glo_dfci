import pandas as pd
import geopandas as gpd
import os
from geoalchemy2 import Geometry, WKTElement
from sqlalchemy import *
from sqlalchemy import func
from .app import GloDfci as app
from .model import Points, Polygons, Endpoints
import requests
import json
from shapely import wkt
from shapely.geometry import Point, Polygon, MultiPolygon
import tempfile
import shutil
from django.http import JsonResponse
from pandas.io.json import json_normalize
import uuid
from urllib.parse import urljoin
from .config import geoserver_wfs_url, geoserver_wms_url, \
    geoserver_credentials, geoserver_rest_url


def user_permission_test(user):
    return user.is_superuser or user.is_staff


def get_counties_options():

    wfs_request_url = geoserver_wfs_url + '?version=1.0.0&request=GetFeature&' \
                                          'typeNames=glo_vli:TexasCounties&outputFormat=application/json'

    resp = requests.get(wfs_request_url)
    data = json.loads(resp.text)

    counties_options = []

    for feature in data['features']:
        county = feature["properties"]["CNTY_NM"]
        counties_options.append((county, county))

    return counties_options


def process_meta_file(file):

    app_workspace = app.get_app_workspace()

    f_name = file.name
    f_path = os.path.join(app_workspace.path, f_name)

    with open(f_path, 'wb') as f_local:
        f_local.write(file.read())

    return f_name


def get_counties_gdf():
    wfs_request_url = geoserver_wfs_url + '?version=1.0.0&request=GetFeature&' \
                                          'typeNames=glo_vli:TexasCounties&outputFormat=application/json'

    counties_gdf = gpd.read_file(wfs_request_url)
    counties_gdf.crs = {'init': 'epsg:4326'}
    counties_gdf = counties_gdf[['CNTY_NM', 'geometry']]

    return counties_gdf


def get_point_county_name(longitude, latitude):

    counties_gdf = get_counties_gdf()
    pdf = pd.DataFrame({'Name': ['point'], 'Latitude': [float(latitude)], 'Longitude': [float(longitude)]})
    pgdf = gpd.GeoDataFrame(pdf, geometry=gpd.points_from_xy(pdf.Longitude, pdf.Latitude))
    pgdf.crs = {'init': 'epsg:4326'}
    point_in_poly = gpd.sjoin(pgdf, counties_gdf, op='within')
    county = point_in_poly.CNTY_NM[0]

    return county


def get_polygon_county_name(geom):

    counties_gdf = get_counties_gdf()
    pdf = pd.DataFrame({'Name': ['polygon'], 'geometry': [geom]})
    pdf['geometry'] = pdf['geometry'].apply(wkt.loads)
    pgdf = gpd.GeoDataFrame(pdf, geometry='geometry')
    pgdf.crs = {'init': 'epsg:4326'}
    poly_in_poly = gpd.sjoin(pgdf, counties_gdf, op='intersects')
    county = poly_in_poly.CNTY_NM.values[0]

    return county


def get_endpoint_options():

    endpoints_list = []

    common_req_str = "?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&" \
                     "WIDTH=20&HEIGHT=20&LEGEND_OPTIONS=forceLabels:on;"

    Session = app.get_persistent_store_database('layers', as_sessionmaker=True)
    session = Session()

    endpoints = session.query(Endpoints).all()
    for opt in endpoints:
        endpoint_options = {}
        endpoint_options['layer_name'] = opt.layer_name
        endpoint_options['layer_type'] = opt.layer_type
        endpoint_options['url'] = opt.url

        if opt.layer_type == 'wms':
            wms_url = opt.url
            meta_dict = opt.meta_dict
            wms_layer = meta_dict['LAYERS']
            legend_url = wms_url + common_req_str + "&LAYER=" + wms_layer
            endpoint_options['legend_url'] = legend_url
            endpoint_options['meta'] = meta_dict

        if opt.layer_type == 'wfs':
            meta_dict = opt.meta_dict
            endpoint_options['meta'] = meta_dict

        endpoints_list.append(endpoint_options)
    return endpoints_list


def get_layer_options():

    Session = app.get_persistent_store_database('layers', as_sessionmaker=True)
    session = Session()

    point_layers = [layer[0] for layer in session.query(Points.layer_name).distinct()]

    polygon_layers = [layer[0] for layer in session.query(Polygons.layer_name).distinct()]

    layer_options = {}

    layer_options["polygons"] = polygon_layers
    layer_options["points"] = point_layers

    session.close()

    return layer_options


def get_legend_options():

    legend_options = []

    common_req_str = "?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&" \
                     "WIDTH=20&HEIGHT=20&LEGEND_OPTIONS=forceLabels:on;"

    options = get_layer_options()

    for type, layers in options.items():
        for layer in layers:
            style = layer.replace(" ", "_").lower()
            legend_url = geoserver_wms_url + common_req_str + "&LAYER=glo_dfci:" + type + "&STYLE=" + style
            legend_options.append((legend_url, style))

    return legend_options


def get_shapefile_attributes(shapefile):

    app_workspace = app.get_app_workspace()

    temp_id = uuid.uuid4()
    temp_dir = os.path.join(app_workspace.path, str(temp_id))
    os.makedirs(temp_dir)
    gbyos_pol_shp = None
    upload_csv = None
    gdf = None

    try:

        for f in shapefile:
            f_name = f.name
            f_path = os.path.join(temp_dir, f_name)

            with open(f_path, 'wb') as f_local:
                f_local.write(f.read())

        for file in os.listdir(temp_dir):
            # Reading the shapefile only
            if file.endswith(".shp"):
                f_path = os.path.join(temp_dir, file)
                gbyos_pol_shp = f_path
            if file.endswith(".csv"):
                f_path = os.path.join(temp_dir, file)
                upload_csv = f_path

        if gbyos_pol_shp is not None:
            gdf = gpd.read_file(gbyos_pol_shp)

        if upload_csv is not None:
            df = pd.read_csv(upload_csv)
            gdf = gpd.GeoDataFrame(df, crs={'init': 'epsg:4326'}, geometry=df['geometry'].apply(wkt.loads))

        attributes = gdf.columns.values.tolist()

        return attributes

    except Exception as e:
        if temp_dir is not None:
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
        return str(e)
    finally:
        # Delete the temporary directory once the shapefile is processed
        if temp_dir is not None:
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)


def process_shapefile(shapefile, layer_name, attributes):

    app_workspace = app.get_app_workspace()
    temp_id = uuid.uuid4()
    temp_dir = os.path.join(app_workspace.path, str(temp_id))
    os.makedirs(temp_dir)
    gbyos_pol_shp = None
    upload_csv = None
    gdf = None
    counties_gdf = get_counties_gdf()

    Session = app.get_persistent_store_database('layers', as_sessionmaker=True)
    session = Session()

    try:

        for f in shapefile:
            f_name = f.name
            f_path = os.path.join(temp_dir, f_name)

            with open(f_path, 'wb') as f_local:
                f_local.write(f.read())

        for file in os.listdir(temp_dir):
            # Reading the shapefile only
            if file.endswith(".shp"):
                f_path = os.path.join(temp_dir, file)
                gbyos_pol_shp = f_path

            if file.endswith(".csv"):
                f_path = os.path.join(temp_dir, file)
                upload_csv = f_path

        if gbyos_pol_shp is not None:
            gdf = gpd.read_file(gbyos_pol_shp)

        if upload_csv is not None:
            df = pd.read_csv(upload_csv)
            gdf = gpd.GeoDataFrame(df, crs={'init': 'epsg:4326'}, geometry=df['geometry'].apply(wkt.loads))

        c_join = gpd.sjoin(gdf, counties_gdf)

        c_join = c_join[attributes + ['CNTY_NM', 'geometry']]

        c_join = c_join.dropna()

        for index, row in c_join.iterrows():
            if type(row.geometry) == Point:
                county = row.get('CNTY_NM')
                latitude = row.geometry.y
                longitude = row.geometry.x
                attribute_info = {attr: row[attr] for attr in attributes}
                point = Points(layer_name=layer_name, latitude=latitude, longitude=longitude, county=county,
                               approved=True, attr_dict=attribute_info, meta_dict={})
                session.add(point)
            else:
                county = row.get('CNTY_NM')
                geometry = row.get('geometry')
                attribute_info = {attr: row[attr] for attr in attributes}
                polygon = Polygons(layer_name=layer_name, county=county, geometry=geometry,
                                   approved=True, attr_dict=attribute_info, meta_dict={})
                session.add(polygon)

        session.commit()
        session.close()

        return {"success": "success"}

    except Exception as e:
        session.close()
        if temp_dir is not None:
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
        return {"error": str(e)}
    finally:
        print(temp_dir)
        # Delete the temporary directory once the shapefile is processed
        if temp_dir is not None:
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)


def get_point_style_xml(point_size, point_symbology, point_fill, point_stroke_fill, point_stroke_size, layer_name, style_exists):

    style_name = layer_name.replace(r' ', '_').lower()
    point_size = str(point_size)
    point_stroke_size = str(point_stroke_size)

    sld_string = '<?xml version="1.0" encoding="ISO-8859-1"?>\n'
    sld_string += '<StyledLayerDescriptor version="1.0.0"\n'
    sld_string += '\txsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd"\n'
    sld_string += '\txmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"\n'
    sld_string += '\txmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n'
    sld_string += '\t\t<NamedLayer>\n'
    sld_string += '\t\t<Name>{}</Name>\n'.format(layer_name)
    sld_string += '\t\t<UserStyle>\n'
    sld_string += '\t\t<Title>{}</Title>\n'.format(layer_name)
    sld_string += '\t\t\t<FeatureTypeStyle>\n'
    sld_string += '\t\t\t\t<Rule>\n'
    sld_string += '\t\t\t\t\t<Title>{}</Title>\n'.format(layer_name)
    sld_string += '\t\t\t\t\t\t<PointSymbolizer>\n'
    sld_string += '\t\t\t\t\t\t\t<Graphic>\n'
    sld_string += '\t\t\t\t\t\t\t\t<Mark>\n'
    sld_string += '\t\t\t\t\t\t\t\t\t<WellKnownName>{}</WellKnownName>\n'.format(point_symbology)
    sld_string += '\t\t\t\t\t\t\t\t\t<Fill>\n'
    sld_string += '\t\t\t\t\t\t\t\t\t\t<CssParameter name="fill">#{}</CssParameter>\n'.format(point_fill)
    sld_string += '\t\t\t\t\t\t\t\t\t</Fill>\n'
    sld_string += '\t\t\t\t\t\t\t\t\t<Stroke>\n'
    sld_string += '\t\t\t\t\t\t\t\t\t\t<CssParameter name="stroke">#{}</CssParameter>\n'.format(point_stroke_fill)
    sld_string += '\t\t\t\t\t\t\t\t\t\t<CssParameter name="stroke-width">{}</CssParameter>\n'.format(point_stroke_size)
    sld_string += '\t\t\t\t\t\t\t\t\t</Stroke>\n'
    sld_string += '\t\t\t\t\t\t\t\t</Mark>\n'
    sld_string += '\t\t\t\t\t\t\t\t<Size>{}</Size>\n'.format(point_size)
    sld_string += '\t\t\t\t\t\t\t</Graphic>\n'
    sld_string += '\t\t\t\t\t\t</PointSymbolizer>\n'
    sld_string += '\t\t\t\t</Rule>\n'
    sld_string += '\t\t\t</FeatureTypeStyle>\n'
    sld_string += '\t\t</UserStyle>\n'
    sld_string += '\t</NamedLayer>\n'
    sld_string += '</StyledLayerDescriptor>\n'

    upload_xml_geoserver(sld_string, style_exists, style_name)

    return sld_string


def get_polygon_style_xml(polygon_fill, polygon_stroke, polygon_opacity, polygon_stroke_width, layer_name, style_exists):

    style_name = layer_name.replace(r' ', '_').lower()
    polygon_stroke_width = str(polygon_stroke_width)
    polygon_opacity = str(polygon_opacity)

    sld_string = '<?xml version="1.0" encoding="ISO-8859-1"?>\n'
    sld_string += '<StyledLayerDescriptor version="1.0.0"\n'
    sld_string += '\txsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd"\n'
    sld_string += '\txmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"\n'
    sld_string += '\txmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n'
    sld_string += '\t\t<NamedLayer>\n'
    sld_string += '\t\t<Name>{}</Name>\n'.format(layer_name)
    sld_string += '\t\t<UserStyle>\n'
    sld_string += '\t\t<Title>{}</Title>\n'.format(layer_name)
    sld_string += '\t\t\t<FeatureTypeStyle>\n'
    sld_string += '\t\t\t\t<Rule>\n'
    sld_string += '\t\t\t\t\t<Title>{}</Title>\n'.format(layer_name)
    sld_string += '\t\t\t\t\t\t<PolygonSymbolizer>\n'
    sld_string += '\t\t\t\t\t\t\t<Fill>\n'
    sld_string += '\t\t\t\t\t\t\t\t<CssParameter name="fill">#{}</CssParameter>\n'.format(polygon_fill)
    sld_string += '\t\t\t\t\t\t\t\t<CssParameter name="fill-opacity">{}</CssParameter>\n'.format(polygon_opacity)
    sld_string += '\t\t\t\t\t\t\t</Fill>\n'
    sld_string += '\t\t\t\t\t\t\t<Stroke>\n'
    sld_string += '\t\t\t\t\t\t\t\t<CssParameter name="stroke">#{}</CssParameter>\n'.format(polygon_stroke)
    sld_string += '\t\t\t\t\t\t\t\t<CssParameter name="stroke-width">{}</CssParameter>\n'.format(polygon_stroke_width)
    sld_string += '\t\t\t\t\t\t\t</Stroke>\n'
    sld_string += '\t\t\t\t\t\t</PolygonSymbolizer>\n'
    sld_string += '\t\t\t\t</Rule>\n'
    sld_string += '\t\t\t</FeatureTypeStyle>\n'
    sld_string += '\t\t</UserStyle>\n'
    sld_string += '\t</NamedLayer>\n'
    sld_string += '</StyledLayerDescriptor>\n'

    upload_xml_geoserver(sld_string, style_exists, style_name)

    return sld_string


def get_line_style_xml(line_stroke, stroke_dash_array, symbol_dash_array, stroke_dash_offset,
                       stroke_width, line_symbology, symbol_size, layer_name, style_exists):
    print()
    style_name = layer_name.replace(r' ', '_').lower()

    if symbol_size is not None:
        symbol_size = str(4)

    sld_string = '<?xml version="1.0" encoding="UTF-8"?>\n'
    sld_string += '<sld:StyledLayerDescriptor xmlns="http://www.opengis.net/sld" \n'
    sld_string += 'xmlns:sld="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc" \n'
    sld_string += 'xmlns:gml="http://www.opengis.net/gml" version="1.0.0"> \n'
    sld_string += '\t<sld:NamedLayer>\n'
    sld_string += '\t\t<sld:Name>Default Styler</sld:Name>\n'
    sld_string += '\t\t\t<sld:UserStyle>\n'
    sld_string += '\t\t\t<sld:Name>{}</sld:Name>\n'.format(layer_name)
    sld_string += '\t\t\t<sld:Title>{}</sld:Title>\n'.format(layer_name)
    sld_string += '\t\t\t<sld:FeatureTypeStyle>\n'
    sld_string += '\t\t\t\t\t<sld:Name>{}</sld:Name>\n'.format(layer_name)
    sld_string += '\t\t\t\t<sld:Rule>\n'
    sld_string += '\t\t\t\t\t<sld:Title>{}</sld:Title>\n'.format(layer_name)

    if line_symbology != 'none':
        sld_string += '\t\t\t\t\t\t<sld:LineSymbolizer>\n'
        sld_string += '\t\t\t\t\t\t\t<sld:Stroke>\n'
        sld_string += '\t\t\t\t\t\t<sld:GraphicStroke>\n'
        sld_string += '\t\t\t\t\t\t\t<sld:Graphic>\n'
        sld_string += '\t\t\t\t\t\t\t\t<sld:Mark>\n'
        sld_string += '\t\t\t\t\t\t\t\t\t<sld:WellKnownName>{}</sld:WellKnownName>\n'.format(line_symbology)
        sld_string += '\t\t\t\t\t\t\t\t\t\t<sld:Fill>\n'
        sld_string += '\t\t\t\t\t\t\t\t\t\t\t<sld:CssParameter name="fill">#{}</sld:CssParameter>\n'.format(line_stroke)
        sld_string += '\t\t\t\t\t\t\t\t\t\t</sld:Fill>\n'
        sld_string += '\t\t\t\t\t\t\t\t</sld:Mark>\n'
        sld_string += '\t\t\t\t\t\t\t\t\t<sld:Size>\n'
        sld_string += '\t\t\t\t\t\t\t\t\t\t<ogc:Literal>{}</ogc:Literal>\n'.format(symbol_size)
        sld_string += '\t\t\t\t\t\t\t\t\t</sld:Size>\n'
        sld_string += '\t\t\t\t\t\t\t</sld:Graphic>\n'
        sld_string += '\t\t\t\t\t\t</sld:GraphicStroke>\n'
        sld_string += '\t\t\t\t\t\t<sld:CssParameter name="stroke-dasharray">{}</sld:CssParameter>\n'.format(symbol_dash_array)
        sld_string += '\t\t\t\t\t\t\t</sld:Stroke>\n'
        sld_string += '\t\t\t\t\t\t</sld:LineSymbolizer>\n'
        sld_string += '\t\t\t\t<sld:LineSymbolizer>\n'

    sld_string += '\t\t\t\t\t<sld:Stroke>\n'
    sld_string += '\t\t\t\t\t\t<sld:CssParameter name="stroke">#{}</sld:CssParameter>\n'.format(line_stroke)

    if stroke_dash_array != '':
        sld_string += '\t\t\t\t\t\t<sld:CssParameter name="stroke-dasharray">{}</sld:CssParameter>\n'.format(stroke_dash_array)
    if stroke_dash_offset != '':
        sld_string += '\t\t\t\t\t\t<sld:CssParameter name="stroke-dashoffset">{}</sld:CssParameter>\n'.format(stroke_dash_offset)
    sld_string += '\t\t\t\t\t\t<sld:CssParameter name="stroke-width">{}</sld:CssParameter>\n'.format(stroke_width)
    sld_string += '\t\t\t\t\t\t</sld:Stroke>\n'
    sld_string += '\t\t\t\t</sld:LineSymbolizer>\n'
    sld_string += '\t\t\t\t</sld:Rule>\n'
    sld_string += '\t\t\t</sld:FeatureTypeStyle>\n'
    sld_string += '\t\t</sld:UserStyle>\n'
    sld_string += '\t</sld:NamedLayer>\n'
    sld_string += '</sld:StyledLayerDescriptor>\n'

    upload_xml_geoserver(sld_string, style_exists, style_name)

    return sld_string


def get_county_layers(county):

    Session = app.get_persistent_store_database('layers', as_sessionmaker=True)
    session = Session()
    points_query = session.query(Points).filter(Points.county == county).statement
    points_gdf = gpd.read_postgis(sql=points_query,
                                  con=session.bind,
                                  geom_col='geometry')
    points_json = points_gdf.to_json()

    polygons_query = session.query(Polygons).filter(Polygons.county == county).statement
    polygons_gdf = gpd.read_postgis(sql=polygons_query,
                                    con=session.bind,
                                    geom_col='geometry')
    polygons_json = polygons_gdf.to_json()

    session.close()
    return points_json, polygons_json


def get_layer_points(layer):

    Session = app.get_persistent_store_database('layers', as_sessionmaker=True)
    session = Session()

    query = session.query(Points).filter(Points.layer_name == layer).statement
    points_gdf = gpd.read_postgis(sql=query,
                                  con=session.bind,
                                  geom_col='geometry')
    points_json = points_gdf.to_json()

    return points_json


def get_layer_polygons(layer):
    Session = app.get_persistent_store_database('layers', as_sessionmaker=True)
    session = Session()

    query = session.query(Polygons).filter(Polygons.layer_name == layer).statement
    polygons_gdf = gpd.read_postgis(sql=query,
                                    con=session.bind,
                                    geom_col='geometry')
    polygons_json = polygons_gdf.to_json()

    return polygons_json


def get_points_geom(geom):

    gdf = gpd.read_file(geom)
    geometry = gdf.geometry.values[0]
    Session = app.get_persistent_store_database('layers', as_sessionmaker=True)
    session = Session()
    int_geom = (wkt.dumps(geometry))
    query = session.query(Points).filter(Points.geometry.intersects(int_geom)).statement

    points_gdf = gpd.read_postgis(sql=query,
                                  con=session.bind,
                                  geom_col='geometry')
    points_json = points_gdf.to_json()

    session.close()
    return points_json


def get_polygons_geom(geom):

    gdf = gpd.read_file(geom)
    geometry = gdf.geometry.values[0]
    Session = app.get_persistent_store_database('layers', as_sessionmaker=True)
    session = Session()
    int_geom = (wkt.dumps(geometry))
    query = session.query(Polygons).filter(Polygons.geometry.intersects(int_geom)).statement

    polygons_gdf = gpd.read_postgis(sql=query,
                                    con=session.bind,
                                    geom_col='geometry')

    polygons_json = polygons_gdf.to_json()

    session.close()
    return polygons_json


def get_polygons_csv():
    Session = app.get_persistent_store_database('layers', as_sessionmaker=True)
    session = Session()
    query = session.query(Polygons).statement

    polygons_gdf = gpd.read_postgis(sql=query,
                                    con=session.bind,
                                    geom_col='geometry')
    session.close()

    return polygons_gdf


def get_points_csv():
    Session = app.get_persistent_store_database('layers', as_sessionmaker=True)
    session = Session()
    query = session.query(Points).statement

    points_gdf = gpd.read_postgis(sql=query,
                                    con=session.bind,
                                    geom_col='geometry')
    session.close()

    return points_gdf


def get_layer_csv(layer_name, layer_type):

    Session = app.get_persistent_store_database('layers', as_sessionmaker=True)
    session = Session()

    if layer_type == 'points':
        query = session.query(Points).filter(Points.layer_name == layer_name).statement
    else:
        query = session.query(Polygons).filter(Polygons.layer_name == layer_name).statement

    layer_gdf = gpd.read_postgis(sql=query,
                                 con=session.bind,
                                 geom_col='geometry')
    layer_df = json_normalize(layer_gdf['attr_dict'])
    final_df = pd.concat([layer_gdf, layer_df], axis=1).drop(['attr_dict', 'id'], axis=1)
    session.close()

    return final_df


def upload_xml_geoserver(sld_string, style_exists, style_name):
    sld_name = style_name + '.sld'

    app_workspace = app.get_app_workspace()
    temp_id = uuid.uuid4()
    temp_dir = os.path.join(app_workspace.path, str(temp_id))
    os.makedirs(temp_dir)
    f_path = os.path.join(temp_dir, sld_name)
    fh = open(f_path, 'w')
    fh.write(sld_string)
    fh.close()

    if style_exists:
        headers = {'content-type': 'application/vnd.ogc.sld+xml'}
        resource = 'styles/{}'.format(sld_name)

        request_url = urljoin(geoserver_rest_url, resource)
        with open(f_path, 'rb') as f:
            r = requests.put(
                request_url,
                data=f,
                headers=headers,
                auth=geoserver_credentials
            )

        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)

    else:
        resource = 'styles'
        payload = \
            '<style><name>{0}</name><filename>{1}</filename></style>'.format(style_name, sld_name)
        headers = {'content-type': 'text/xml'}

        request_url = urljoin(geoserver_rest_url, resource)

        r = requests.post(
            request_url,
            data=payload,
            headers=headers,
            auth=geoserver_credentials
        )

        resource2 = 'styles/{}'.format(sld_name)
        request_url2 = urljoin(geoserver_rest_url, resource2)
        headers2 = {'content-type': 'application/vnd.ogc.sld+xml'}
        with open(f_path, 'rb') as f:
            r = requests.put(
                request_url2,
                data=f,
                headers=headers2,
                auth=geoserver_credentials
            )

        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)

    return sld_string



