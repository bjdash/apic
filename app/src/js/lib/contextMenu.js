(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.ngContextmenu = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
'use strict';

angular.module('io.dennis.contextmenu')
.directive('contextmenuContainer', Container);

function Container() {
  return {
    scope: {
      contextmenu: '=contextmenuContainer'
    },
    restrict: 'A',
    controller: ['$scope', ContainerCtrl]
  };

}

function ContainerCtrl($scope) {
  var pub = this;
  pub.get = get;

  function get() {
    return $scope.contextmenu;
  }
}

},{}],2:[function(_dereq_,module,exports){
'use strict';

angular.module('io.dennis.contextmenu')
  .provider('$contextmenu', ContextmenuProvider)
  .directive('contextmenu', Contextmenu);

var config = {
  DEBOUNCE_BROADCAST_TIME: 200
};
var contextmenuConfig = new ContextmenuConfig();

function ContextmenuConfig() {
  this.set = function(key, value) {
    if (config[key]) {
      config[key] = value;
    }
    return config[key];
  };

  this.get = function(key) {
    return config[key];
  };
}

function ContextmenuProvider() {
  this.$get = function() {
    return contextmenuConfig;
  };
}

Contextmenu.$inject = [
  '$window',
  '$rootScope',
  'ContextmenuService'
];

var canBroadcast = true;
var broadcastClose;

function Contextmenu($window, $rootScope, $contextmenu) {

  broadcastClose = (function($rootScope) {
    return function _broadcastClose() {
      if (canBroadcast) {
        $rootScope.$broadcast('contextmenu.close');
        canBroadcast = false;
        setTimeout(function() {
          canBroadcast = true;
        }, config.DEBOUNCE_BROADCAST_TIME);
      }
    }
  })($rootScope);

  var $windowElement = angular.element($window);
  $windowElement.on('contextmenu scroll click', broadcastClose);

  return {
    scope: {
      contextmenu: '='
    },
    restrict: 'A',
    controller: ['$scope', '$window', '$rootScope', CotextmenuCtrl],
    link: link,
    priority: 100
  };


  function link(scope, element, attrs, ctrl) {
    scope.contextmenu = $contextmenu.$get();
    scope.contextmenu.setMenu(ctrl);
    ctrl.setElement(element);
  }
}

function CotextmenuCtrl($scope, $window, $rootScope) {
  console.log('init contextmenu ctrl');

  var pub = this;
  var $element;
  $scope.$on('contextmenu.close', close);

  pub.open = open;
  pub.close = close;
  pub.setElement = setElement;

  function open(item, x, y) {
    broadcastClose();
    $element.css({top: y, left: x})
      .toggleClass('dropup', isDropup(y))
      .toggleClass('open', true)
      .toggleClass('ng-hide', false);
  }

  function close() {
    $element.toggleClass('ng-hide', true);
  }

  function setElement(element) {
    $element = element;
  }

  function isDropup(y) {
    var mid = $window.innerHeight / 2;
    return (y > mid);
  }
}

},{}],3:[function(_dereq_,module,exports){
'use strict';

angular.module('io.dennis.contextmenu')
    .directive('contextmenuItem', Item);

Item.$inject = [];

function Item() {

  /*global DocumentTouch:false */
  var isTouch = !!(('ontouchstart' in window) ||
      window.DocumentTouch && document instanceof DocumentTouch);

  return {
    scope: {
      item: '=contextmenuItem'
    },
    require: '^contextmenuContainer',
    restrict: 'A',
    link: link
  };

  function link(scope, element, attrs, ctrl) {
    var iam = mk(scope.item, element);

    return (isTouch) ?
      registerTouch(iam, scope, ctrl) :
      registerMouse(iam, scope, ctrl);
  }

  function registerTouch(iam, scope, ctrl) {
    iam.element.on('click', function(ev) {
      ev.preventDefault();
      ev.stopPropagation();
      ctrl.get().open(iam, ev.clientX, ev.clientY);
      scope.$apply();
      return false;
    });
  }

  function registerMouse(iam, scope, ctrl) {
    iam.element.on('click', function(ev) {
      var multi = ev.ctrlKey || ev.metaKey;
      ev.preventDefault();
      ev.stopPropagation();

      ctrl.get().toggle(iam, multi);
      scope.$apply();
    });

    iam.element.on('contextmenu', function(ev) {
      // don't show context menu if user holds down ctrl || cmd key
      if (ev.ctrlKey || ev.metaKey) { return; }

      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();

      ctrl.get().open(iam, ev.clientX, ev.clientY);
      scope.$apply();

      return false;
    });
  }

  function mk(item, element) {
    return {item: item, element: element};
  }

}

},{}],4:[function(_dereq_,module,exports){
'use strict';

angular.module('io.dennis.contextmenu', []);

_dereq_('./service/service');

_dereq_('./directive/contextmenu');
_dereq_('./directive/container');
_dereq_('./directive/item');

},{"./directive/container":1,"./directive/contextmenu":2,"./directive/item":3,"./service/service":5}],5:[function(_dereq_,module,exports){
'use strict';

angular.module('io.dennis.contextmenu')
    .service('ContextmenuService', ContextmenuProvider);

function ContextmenuProvider() {
  var self = this;

  self.$get = function() {
    return new Contextmenu();
  };
}

function Contextmenu() {
  var pub = this;

  var selected = [];
  var menu;

  init();

  function init() {
    pub.menu = menu;
    pub.selected = selected;

    pub.setMenu = setMenu;
    pub.add = add;
    pub.remove = remove;
    pub.isSelected = isSelected;
    pub.get = get;
    pub.num = getNumberOf;
    pub.open = open;
    pub.close = close;
    pub.toggle = toggle;
    pub.clear = clear;
    pub.listOfIds = getListOfIds;
  }

  function setMenu(ctrl) {
    menu = ctrl;
  }

  function add(entry) {
    if (!isSelected(entry)) {
      selected.unshift(entry);
      toggleSelected(entry.element, true);
    }
    pub.item = selected[0].item;
  }

  function remove(entry) {
    var index = selected.indexOf(entry);
    if (index > -1) {
      selected.splice(index, 1);
    }
    toggleSelected(entry.element, false);
  }

  function isSelected(entry) {
    return (selected.indexOf(entry) > -1);
  }

  function get() {
    return selected[0];
  }

  function getNumberOf() {
    return selected.length || 0;
  }

  function open(entry, x, y) {
    x = x || 0;
    y = y || 0;

    if (!isSelected(entry)) {
      clear();
    }
    add(entry);
    menu.open.apply(null, arguments);
  }

  function close() {
    menu.close.apply(null, arguments);
  }

  function toggle(entry, multi) {
    multi = multi || false;
    var isEntrySelected = isSelected(entry);

    if (isEntrySelected) {
      remove(entry);

    } else {

      if (!multi) { clear(); }
      add(entry);
    }
  }

  function clear() {
    angular.forEach(selected, function(entry) {
      toggleSelected(entry.element, false);
    });
    selected = [];
  }

  function getListOfIds(limit, path) {
    path = path || 'item.id';
    limit = Math.min(limit || selected.length, selected.length);
    var list = selected.slice(0, limit).map(function(entry) {
      return safeGet(entry, path, '');
    });
    var asString = list.join(', ');
    return (limit < selected.length) ? asString + '..' : asString;
  }

  function toggleSelected(element, forceState) {
    element.toggleClass('selected', forceState);
  }

  function safeGet(obj, path, _default) {

    if (!obj) {
      return _default;
    }

    if (!path || !String(path).length) {
      return obj;
    }

    var keys = (angular.isArray(path)) ? path : path.split('.');
    var next = keys.shift();
    return get(obj[next], keys, _default);
  }
}

},{}]},{},[4])(4)
});
