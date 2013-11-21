var builderRequest = angular.module('builder-request', ['builder-utils']);

/* Produce an angular JSON request object
   for requesting data from WMS/WFS servers */
builderRequest.service("geoRequest", function() {
  return function (params) {
    var data = {
      service: params.serviceType,
      request: params.requestType,
    };

    if (params.cql_filter) {
      data.cql_filter = params.cql_filter;
    }
    
    if (!$.isEmptyObject(params.bbox) && data.request != "GetCapabilities") {
      if (data.service == "WMS")
        data.bbox = [params.bbox.minx, params.bbox.miny, params.bbox.maxx, params.bbox.maxy].join();
      if (data.service == "WFS" && !params.cql_filter)
        data.bbox = [params.bbox.miny, params.bbox.minx, params.bbox.maxy, params.bbox.maxx].join();
    }

    if (data.service == "WMS" && data.request != "GetCapabilities") {
      data.layers = params.features ? params.features.join() : undefined;
      data.width = params.width;
      data.height = params.height;
      data.format = params.format;
    }
    if (data.service == "WFS" && data.request != "GetCapabilities") {
      data.typeName = params.feature;
      data.maxFeatures = params.featureLimit;
      data.outputFormat = params.format;
    }

    var request = {
      method: "GET",
      headers: {},
      url: params.host + "/ows",
      params: data,
    };

    return request;
  };
});

/* Produce a URI for the source of an image
   This image is produced from a WMS request */
builderRequest.service('geoImage', ['geoRequest', 'imageWidth', function(request, getImageWidth) {
  return function(params, height) {
    // Only map if there are features to map
    if (params.features) {
      $("#preview-image img").attr("src", "images/loading.gif");

      var imageParams = {
        host: params.host,
        serviceType: "WMS",
        requestType: "GetMap",
        outputFormat: "image/png",
        format: "image/png",
        width: getImageWidth(params.bbox, height),
        height: height,
        features: (typeof(params.features) == typeof([]))? params.features : [params.features],
        bbox: params.bbox,
        cql_filter: params.cql_filter,
      };

      var req = request(imageParams);
      var src = req.url + "?" + $.param(req.params);
      $("#preview-image img").attr("src", src);
    } else {
      return "";
    }
  };
}]);

/*Request the properties of a feature set
   This feature set is produced from a WFS request*/
builderRequest.service('geoFeatureInfo', ['$http', 'geoRequest', function($http, request) {
  return function(params) {
    var featureInfoParams = {
      host: params.host,
      serviceType: "WFS",
      requestType: "DescribeFeatureType",
      feature: params.feature,
    };
    var req = request(featureInfoParams);
    return $http(req);
  }
}]);

/* Produce a JSON object encoding the properties of a feature set
   Created from an xml string */
builderRequest.service('processFeatureInfo', [function() {
  return function(xml) {
    var info = {};
    var infoxml = $(xml);
    // Get the list of features
    var features = infoxml.find('xsd\\:complexType');
    
    features.each(function(feature) {
      feature = $(this);
      var f = {};
      var featureName = feature.next().attr("type").replace(/Type$/, '');
      info[featureName] = f;
      
      // Get the list of properties for a feature
      var props = feature.find('xsd\\:element');
      props.each(function(prop) {
        var prop = $(this);
        var name = prop.attr("name");
        var type = prop.attr("type");
        f[name] = {name: name, type: type};
      });
      
    });

    return info;
  };
}]);