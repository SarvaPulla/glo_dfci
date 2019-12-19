from os import path

data_dir = path.join(path.dirname(path.realpath(__file__)), 'public/data/')
geoserver_rest_url = 'http://hydropad.org:8181/geoserver/rest/'
geoserver_wfs_url = 'http://hydropad.org:8181/geoserver/wfs'
geoserver_wms_url = 'http://hydropad.org:8181/geoserver/wms'
geoserver_credentials = ('admin', 'geoserver')
