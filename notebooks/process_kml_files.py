# imports #
from bs4 import BeautifulSoup as Soup
import json
import os
import re
from tqdm import tqdm


# function definitions #
def parse_kml_files(src_directory):
    places = {}
    for file in tqdm(os.listdir(src_directory)):
        if file.endswith(".kml"):
            f_path = os.path.join(src_directory, file)
            with open(f_path) as data:
                kml_soup = Soup(data, 'lxml-xml')  # Parse as XML
                placemarks = kml_soup.find_all('Placemark')
                for p in placemarks:
                    name, attributes = extract_location(p)
                    places[name] = attributes

    return places


def extract_location(bs4_object):
    t = str(bs4_object)

    attributes = {}
    name = re.findall('<SimpleData name="NAME">(.*?)</SimpleData>', t)[0]
    attirbutes_to_extract = ['STATEFP', 'PLACEFP', 'PLACENS', 'ADDGEOID', 'GEOID', 'LSAD', 'ALAND', 'AWATER',
                             'AIANNHCE', 'AIANNHNS', 'AFFGEOID']

    for al in attirbutes_to_extract:
        try:
            query = '<SimpleData name="%s">(.*?)</SimpleData>'
            attributes[al.lower()] = re.findall(query, t)[0]
        except IndexError:
            pass

    # there may be more than one set of polygons for coordinates
    coordinates = re.findall('<coordinates>(.*?)</coordinates>', t)
    coordinates_arr = []
    for c in coordinates:
        coordinates_list = []
        coordinate_splits = c.split(' ')
        for cs in coordinate_splits:
            coordinates_list.append([float(csx) for csx in cs.split(',')])
        # coordinates_arr.append(coordinates_list)
        [coordinates_arr.append(cords) for cords in coordinates_list]
    attributes['coordinates'] = coordinates_arr

    return name, attributes

 
with open('../data/geo.json', 'w') as f:
    json.dump(parse_kml_files('../data'), f)
    
    
    
    