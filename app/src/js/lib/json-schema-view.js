/*!
 * json-schema-view
 * https://github.com/mohsen1/json-schema-view
 * Version: 0.4.3 - 2016-03-10T18:34:49.538Z
 * License: MIT
 */


'use strict';

angular.module('mohsen1.json-schema-view', ['RecursionHelper'])

.directive('jsonSchemaView', ["RecursionHelper", function(RecursionHelper) {
  function link($scope) {
    /*
     * Recursively walk the schema and add property 'name' to property objects
    */
    function addPropertyName(schema) {
      if (!schema) {
        return;
      }
      if (angular.isObject(schema.items)) {
        addPropertyName(schema.items);
      }
      else if (angular.isObject(schema.properties)) {
        Object.keys(schema.properties).forEach(function(propertyName) {
          schema.properties[propertyName].name = propertyName;
          addPropertyName(schema.properties[propertyName]);
        });
      }
    }

    /*
     * Toggles the 'collapsed' state
    */
    $scope.toggle = function() {
      $scope.isCollapsed = !$scope.isCollapsed;
    };

    /*
     * Returns true if property is required in given schema
    */
    $scope.isRequired = function(schema) {
      var parent = $scope.$parent.schema;

      if (parent && Array.isArray(parent.required) && schema.name) {
        return parent.required.indexOf(schema.name) > -1;
      }

      return false;
    };

    /*
     * Returns true if the schema is too simple to be collapsible
    */
    $scope.isPrimitiveCollapsible = function() {
      return $scope.schema.description ||
        $scope.schema.title;
    };

    /*
     * Converts anyOf, allOf and oneOf to human readable string
    */
    $scope.convertXOf = function(type) {
      return type.substring(0, 3) + ' of';
    };

    $scope.refresh = function() {
      $scope.isCollapsed = $scope.open < 0;

      addPropertyName($scope.schema);

      // Determine if a schema is an array
      $scope.isArray = $scope.schema && $scope.schema.type === 'array';

      // Determine if a schema is a primitive
      $scope.isPrimitive = $scope.schema &&
        !$scope.schema.properties &&
        !$scope.schema.items &&
        $scope.schema.type !== 'array' &&
        $scope.schema.type !== 'object';
    };

    $scope.$watch('schema', $scope.refresh);
  }

  return {
    restrict: 'E',
    templateUrl: 'json-schema-view.html',
    replace: true,
    scope: {
      'schema': '=',
      'open': '='
    },
    compile: function(element) {

      // Use the compile function from the RecursionHelper,
      // And return the linking function(s) which it returns
      return RecursionHelper.compile(element, link);
    }
  };
}]);

'use strict';

// from http://stackoverflow.com/a/18609594
angular.module('RecursionHelper', []).factory('RecursionHelper', ['$compile', function($compile) {
  return {
    /**
     * Manually compiles the element, fixing the recursion loop.
     * @param {Element} element
     * @param {function} [link] A post-link function, or an object with function(s)
     * registered via pre and post properties.
     * @returns An object containing the linking functions.
     */
    compile: function(element, link) {
      // Normalize the link parameter
      if (angular.isFunction(link)) {
        link = {post: link};
      }

      // Break the recursion loop by removing the contents
      var contents = element.contents().remove();
      var compiledContents;
      return {
        pre: (link && link.pre) ? link.pre : null,
        /**
         * Compiles and re-adds the contents
         */
        post: function(scope, element) {
          // Compile the contents
          if (!compiledContents) {
            compiledContents = $compile(contents);
          }
          // Re-add the compiled contents to the element
          compiledContents(scope, function(clone) {
            element.append(clone);
          });

          // Call the post-linking function, if any
          if (link && link.post) {
            link.post.apply(null, arguments);
          }
        }
      };
    }
  };
}]);

angular.module("mohsen1.json-schema-view").run(["$templateCache", function($templateCache) {$templateCache.put("enum.html","<div class=\"inner enums\" ng-if=\"!isCollapsed && schema.enum\"><b>Enum:</b><json-formatter class=\"inner\" json=\"schema.enum\" open=\"open\"></json-formatter></div>");
$templateCache.put("json-schema-view.html","<div class=\"json-schema-view\" ng-class=\"{collapsed: isCollapsed}\"><div class=\"primitive\" ng-if=\"isPrimitive\"><a class=\"title\" ng-click=\"toggle()\" ng-class=\"{open:isCollapsed}\"><span class=\"toggle-handle\" ng-if=\"isPrimitiveCollapsible()\"></span>{{schema.title}}</a> <span class=\"type\">{{schema.type}}</span> <span class=\"required\" ng-if=\"isRequired(schema)\">*</span> <span class=\"format\" ng-if=\"!isCollapsed && schema.format\">({{schema.format}})</span> <span class=\"range minimum\" ng-if=\"!isCollapsed && schema.minimum\">minimum:{{schema.minimum}}</span> <span class=\"range exclusiveMinimum\" ng-if=\"!isCollapsed && schema.exclusiveMinimum\">(ex)minimum:{{schema.exclusiveMinimum}}</span> <span class=\"range maximum\" ng-if=\"!isCollapsed && schema.maximum\">maximum:{{schema.maximum}}</span> <span class=\"range exclusiveMaximum\" ng-if=\"!isCollapsed && schema.exclusiveMaximum\">(ex)maximum:{{schema.exclusiveMaximum}}</span> <span class=\"range minLength\" ng-if=\"!isCollapsed && schema.minLength\">minLength:{{schema.minLength}}</span> <span class=\"range maxLength\" ng-if=\"!isCollapsed && schema.maxLength\">maxLength:{{schema.maxLength}}</span><div class=\"inner description\">{{schema.description}}</div><div ng-include=\"\'enum.html\'\" ng-if=\"!isCollapsed && schema.enum\"></div><div ng-include=\"\'x_of.html\'\" ng-if=\"schema.allOf\" onload=\"type = \'allOf\'\"></div><div ng-include=\"\'x_of.html\'\" ng-if=\"schema.anyOf\" onload=\"type = \'anyOf\'\"></div><div ng-include=\"\'x_of.html\'\" ng-if=\"schema.oneOf\" onload=\"type = \'oneOf\'\"></div></div><div ng-if=\"isArray\" class=\"array\"><a class=\"title\" ng-click=\"toggle()\" ng-class=\"{open:isCollapsed}\"><span class=\"toggle-handle\"></span>{{schema.title}} <span class=\"opening bracket\">[</span><span class=\"closing bracket\" ng-if=\"isCollapsed\">]</span></a> <span ng-if=\"!isCollapsed && (schema.uniqueItems || schema.minItems || schema.maxItems)\"><span title=\"items range\">({{schema.minItems || 0}}..{{schema.maxItems || \'∞\'}})</span> <span title=\"unique\" class=\"uniqueItems\" ng-if=\"!isCollapsed && schema.uniqueItems\">♦</span></span><div class=\"inner\"><div class=\"description\">{{schema.description}}</div><json-schema-view ng-if=\"!isCollapsed\" schema=\"schema.items\" open=\"open - 1\"></json-schema-view></div><div ng-include=\"\'enum.html\'\" ng-if=\"!isCollapsed && schema.enum\"></div><div ng-include=\"\'x_of.html\'\" ng-if=\"schema.allOf\" onload=\"type = \'allOf\'\"></div><div ng-include=\"\'x_of.html\'\" ng-if=\"schema.anyOf\" onload=\"type = \'anyOf\'\"></div><div ng-include=\"\'x_of.html\'\" ng-if=\"schema.oneOf\" onload=\"type = \'oneOf\'\"></div><span class=\"closing bracket\" ng-if=\"!isCollapsed\">]</span></div><div ng-if=\"!isPrimitive && !isArray\" class=\"object\"><a class=\"title\" ng-click=\"toggle()\" ng-class=\"{open:isCollapsed}\"><span class=\"toggle-handle\"></span>{{schema.title}} <span class=\"opening brace\">{</span><span class=\"closing brace\" ng-if=\"isCollapsed\">}</span></a><div class=\"inner\"><div class=\"description\">{{schema.description}}</div><div class=\"property\" ng-repeat=\"(propertyName, property) in schema.properties\"><span class=\"name\">{{propertyName}}:</span><json-schema-view schema=\"property\" open=\"open - 1\"></json-schema-view></div></div><div ng-include=\"\'enum.html\'\" ng-if=\"!isCollapsed && schema.enum\"></div><div ng-include=\"\'x_of.html\'\" ng-if=\"schema.allOf\" onload=\"type = \'allOf\'\"></div><div ng-include=\"\'x_of.html\'\" ng-if=\"schema.anyOf\" onload=\"type = \'anyOf\'\"></div><div ng-include=\"\'x_of.html\'\" ng-if=\"schema.oneOf\" onload=\"type = \'oneOf\'\"></div><span class=\"closeing brace\" ng-if=\"!isCollapsed\">}</span></div></div>");
$templateCache.put("x_of.html","<div class=\"inner\"><b>{{convertXOf(type)}}:</b><div class=\"inner\" ng-repeat=\"schema in schema[type]\"><json-schema-view schema=\"schema\"></json-schema-view></div></div>");}]);