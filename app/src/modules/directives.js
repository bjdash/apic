(function () {
    angular
        .module('apic')
        .directive('fileModel', fileModel)
        .directive('onlyAlpnaNum', onlyAlpnaNum)
        .directive('splashScreen', splashScreen)
        .directive('onEnterKey', onEnterKey)
        .directive('ngFocusMe', NgFocusMe)
        .directive('ngAceResize', ngAceResize)
        .directive('namedAcnhor', namedAcnhor)
        .directive('apicWysiwyg', apicWysiwyg)
        .directive('testBuilder', ['$rootScope', testBuilder])
        .directive('gqlSchema', gqlSchema)
        .directive('gqlType', gqlType)
        .directive('tbHelper', ['$rootScope', 'Tester', 'Utils', tbHelper])
        .directive('electronA', electronA);

    fileModel.$inject = ['$parse'];
    function fileModel($parse) {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                var model = $parse(attrs.fileModel);
                var modelSetter = model.assign;
                element.bind('change', function () {
                    scope.$apply(function () {
                        modelSetter(scope, element[0].files[0]);
                        $parse(attrs.fileName).assign(scope, element[0].files[0].name);
                    });
                });
            }
        };
    }

    //onlyAlpnaNum.$inject = ['$parse'];
    function onlyAlpnaNum() {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function (scope, element, attrs, model) {

                element.bind('keyup', function () {
                    var value = model.$viewValue;
                    var re = /^[a-z_]+[a-z0-9_]*$/i;
                    if (re.test(value)) {
                        if (element.hasClass('error')) {
                            scope.$parent.notAlphaNum -= 1;
                            element.removeClass('error');
                        }
                    } else {
                        if (!element.hasClass('error')) {
                            scope.$parent.notAlphaNum += 1;
                            element.addClass('error');
                        }
                    }
                    scope.$parent.$apply();
                });
            }
        };
    }

    splashScreen.$inject = ['$timeout'];
    function splashScreen($timeout) {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                $timeout(function () {
                    angular.element(element).fadeOut();
                }, 500);
            }
        };
    }

    function onEnterKey() {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                element.bind('keydown keypress', function (event) {
                    var keyCode = event.which || event.keyCode;
                    // If enter key is pressed
                    if (keyCode === 13) {
                        scope.$apply(function () {
                            // Evaluate the expression
                            scope.$eval(attrs.onEnterKey);
                        });
                        event.preventDefault();
                    }
                });
            }
        };
    }

    function NgFocusMe() {
        return {
            scope: {
                ngFocusMe: '='
            },
            link: function ($scope, $element) {

                $scope.$watch('ngFocusMe', function (shouldFocus) {
                    if (shouldFocus) {
                        $element[0].focus();
                    }
                });

            }
        };
    }

    function ngAceResize() {
        return {
            link: function (scope, element) {
                var resizeHandle = angular.element('<div  class="ng-drag-handler"></div>');
                resizeHandle.on('mousedown', function (e) {
                    e.preventDefault();
                    scope.dragging = true;
                    scope.topOffset = element.offset().top;
                    element.css({ opacity: 0.5 });

                    angular.element(document).on('mousemove.ngAceResize', function (e) {
                        var actualY = e.pageY;
                        var editorHeight = actualY - scope.topOffset;
                        element.css({ height: editorHeight });
                    });

                    angular.element(document).on('mouseup.ngAceResize', function (e) {
                        if (scope.dragging) {
                            scope.dragging = false;
                            angular.element(document).unbind('mousemove.ngAceResize');
                            angular.element(document).unbind('mouseup.ngAceResize');

                            var actualY = e.pageY;
                            var topOffset = element.offset().top;
                            var editorHeight = actualY - topOffset;

                            element.css({ height: editorHeight, opacity: 1 });
                            ace.edit(element[0]).resize();
                        }
                    });
                });

                element.after(resizeHandle);
            }
        }
    }

    namedAcnhor.$inject = ['$location', '$anchorScroll'];
    function namedAcnhor($location, $anchorScroll) {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                element.on('click', function (event) {
                    var href = element.attr('href');
                    if (href.indexOf('#/') === 0) {
                        return;
                    }
                    event.preventDefault();
                    var fragment = href.slice(1);
                    if (fragment === $location.hash()) {
                        return ($anchorScroll());
                    }
                    $location.hash(fragment);
                    scope.$apply();
                });
            }
        };
    }

    apicWysiwyg.$inject = ['$rootScope']
    function apicWysiwyg($rootScope) {
        return {
            scope: {
                env: '=',
                placeholder: '@',
                ngFocus: '&'
            },
            require: '?ngModel',
            restrict: 'EA',
            //template:'<div contenteditable="true">Hi</div>',
            link: function (scope, element, attrs, ngModel) {
                element.addClass('apic-editor-cont')
                var editor = angular.element('<div></div>').attr({ 'contentEditable': 'true', class: 'apic-editor', placeholder: scope.placeholder });
                editor[0].onkeydown = function (e) {
                    //during key down, char is not yet added to string
                    if (e.key === 'Enter') {
                        e.preventDefault()
                        return;
                    }
                }
                // editor[0].onkeyup = function (e) {
                //     wysiwugOnChangeHandle(editor, scope, ngModel)
                // }
                editor[0].addEventListener("input", function () {
                    wysiwugOnChangeHandle(editor, scope, ngModel)
                }, false);
                if (ngModel) {
                    ngModel.$formatters.push(function (value) {
                        if (angular.isUndefined(value) || value === null) {
                            return '';
                        }
                        else if (angular.isObject(value) || angular.isArray(value)) {
                            throw new Error('model for apic wysiwyg editor dhould be a string');
                        }
                        return value;
                    });

                    ngModel.$render = function () {
                        editor.text(ngModel.$viewValue);
                        wysiwugOnChangeHandle(editor, scope, ngModel);
                    };
                }

                element.append(editor);
                //POPUP
                var popup;
                popup = angular.element('.wysiwug-tooltip');
                if (popup.length === 0) {//add the popup
                    popup = angular.element('<div><div class="wysiwug-tooltip-head">localhost</div><div class="wysiwug-tooltip-tail align-right">Value read from selected environment</div><div class="wysiwug-tooltip-tail">Ctrl/Cmd + Click to copy value</div></div>').attr({ class: 'wysiwug-tooltip', id: 'wysiwug-tooltip' });
                    angular.element(document.body).append(popup);
                }

                element.on('mouseenter', '.env', function () {
                    var resolvedVal = null, type = '';
                    var res = resolveVal(this.innerText);
                    resolvedVal = res.resolvedVal
                    type = res.type;

                    if (type === 'Couldn\'t resolve environment varible') {
                        popup.find('.wysiwug-tooltip-head').text(resolvedVal).addClass('red');
                    } else {
                        popup.find('.wysiwug-tooltip-head').text(resolvedVal || ' ').removeClass('red');
                    }
                    popup.find('.wysiwug-tooltip-tail.align-right').text(type)
                    popup.addClass('show').css({ left: $(this).offset().left + 'px', top: ($(this).offset().top + 22) + 'px' });
                });
                element.on('mouseleave', '.env', function () {
                    popup.removeClass('show');
                });
                element.on('click', '.env', function (event) {
                    if (event.ctrlKey || event.metaKey) {
                        $rootScope.copyToClipboard(resolveVal(this.innerText).resolvedVal)
                    }
                })

                function resolveVal(key) {
                    key = key.substring(2, key.length - 2); // remove {{ & }}
                    if ($rootScope.xtraEnv && $rootScope.xtraEnv.hasOwnProperty(key)) { //giving priority to in-mem vars
                        return {
                            resolvedVal: $rootScope.xtraEnv[key],
                            type: 'Value read from In-memory env. Generated via script "setEnv(key, val)"'
                        }
                    } else if (scope.env && scope.env.vals && scope.env.vals.hasOwnProperty(key)) {
                        return {
                            resolvedVal: scope.env.vals[key],
                            type: 'Value read from selected environment'
                        }
                    } else {
                        return {
                            resolvedVal: 'Undefined variable',
                            type: 'Couldn\'t resolve environment varible'
                        }
                    }
                }

                if (scope.ngFocus) {
                    editor[0].onfocus = function () {
                        scope.$evalAsync(function () {
                            scope.ngFocus();
                        });
                    };
                }
            }
        };
    }

    function wysiwugOnChangeHandle(editor, scope, ngModel) {
        var text = editor.text(), oldHtml = editor.html().replace(/&amp;/g, '&');
        var caret = getCaretPosition(editor[0]);
        var parts = getEnvParts(text);
        var html = '';
        parts.forEach(function (part) {
            if (part.type === 'urlPart') {
                html += '<span class="urlPart">' + part.text + '</span>'
            } else {
                html += '<span class="env">' + part.text + '</span>'
            }
        });
        if (html !== oldHtml) {
            editor.html(html);
            if (caret > 0) {
                setCaretPosition(editor[0], caret);
            }
        }
        var newValue = editor.text();
        if (ngModel && newValue !== ngModel.$viewValue && !scope.$$phase && !scope.$root.$$phase) {
            scope.$evalAsync(function () {
                console.log('setting new value', newValue)
                ngModel.$setViewValue(newValue.replace(/&nbsp;/gi, ' '));
            });
        }
    }

    function getCaretPosition(element) {
        var selection = document.getSelection();
        if (selection.rangeCount > 0) {
            var _range = selection.getRangeAt(0)
            var range = _range.cloneRange()
            range.selectNodeContents(element)
            range.setEnd(_range.endContainer, _range.endOffset)
            return range.toString().length;
        } else {
            return 0
        }
    }

    function setCaretPosition(el, pos) {
        // Loop through all child nodes
        for (var node of el.childNodes) {
            if (node.nodeType == 3) { // we have a text node
                if (node.length >= pos) {
                    // finally add our range
                    var range = document.createRange(),
                        sel = window.getSelection();
                    range.setStart(node, pos);
                    range.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(range);
                    return -1; // we are done
                } else {
                    pos -= node.length;
                }
            } else {
                pos = setCaretPosition(node, pos);
                if (pos == -1) {
                    return -1; // no need to finish the for loop
                }
            }
        }
        return pos; // needed because of recursion stuff
    }

    function getEnvParts(text) {
        var parts = [], foundAt = -1, scannedTill = -1;
        for (var i = 0; i < text.length; i++) {
            if (text.charAt(i) == '{' && text.charAt(i + 1) === '{' && foundAt < 0) {
                foundAt = i;
                var partText = text.substring(scannedTill + 1, foundAt);
                if (partText) {
                    parts.push({
                        text: partText,
                        type: 'urlPart'
                    });
                    scannedTill = foundAt - 1;
                }
                i++;
            } else if (text.charAt(i) === '}' && text.charAt(i + 1) === '}' && foundAt >= 0) {
                parts.push({
                    text: text.substring(foundAt, i + 2),
                    type: 'env'
                });
                foundAt = -1, scannedTill = i + 1;
                i++;
            }
        }
        if (scannedTill < text.length) {
            var part = text.substring(scannedTill + 1, text.length);
            if (part) {
                parts.push({
                    text: part,
                    type: 'urlPart'
                });
            }
        }
        return parts;
    }

    function testBuilder(Tester) {
        return {
            scope: {
                helper: '=helper',
                data: '=data',
                parent: '=parent',
                out: '=out'
            },
            templateUrl: 'testBuilder.html',
            link: function (scope, element) {
                scope.getParent = function (parent, key, index) {
                    if (index !== undefined) {
                        parent = parent + '[' + index + ']';
                    } else {
                        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
                            parent = parent + '.' + key;
                        } else {
                            parent = parent + '["' + key + '"]';
                        }
                    }
                    return parent;
                }
                scope.typeof = function (data) {
                    return typeof data;
                }
                scope.isArray = function (data) {
                    return data instanceof Array;
                }
                scope.showHelper = function (event, data, parent, key, val) {
                    scope.helper.show = true;
                    scope.helper.data = {
                        parent: parent,
                        key: key,
                        val: val
                    }
                    var e = $(event.target);
                    var p = e.parents('.relative');

                    var top = e.offset().top - p.offset().top + 20;
                    setTimeout(function () {
                        $(p[0]).find('div.tbh_cont').css({ top: top + 'px' })
                    })
                }
            }
        }
    }

    function gqlSchema() {
        return {
            templateUrl: 'GQLSchema.html',
            scope: {
                types: '=',
                path: '='
            },
            link: function (scope) {
                scope.select = function (type) {
                    if (scope.path.indexOf(type) < 0) {
                        scope.path.push(type);
                    } else {
                        scope.path = scope.path.slice(0, scope.path.indexOf(type) + 1)
                    }
                }
            }
        }
    }

    function gqlType() {
        return {
            templateUrl: 'GQLType.html',
            scope: {
                f: '=',
                select: '='
            }
        }
    }

    function tbHelper($rootScope, Tester, Utils) {
        return {
            scope: {
                cfg: '=',
            },
            templateUrl: 'tbHelper.html',
            link: function (scope, element) {
                var ops = {
                    val: 'expect(<key>).to.be.eql(<val>)',
                    body: 'expect(<key>).to.be.eql($request.body<val>)',
                    header: 'expect(<key>).to.be.eql($request.headers<val>)',
                    eqenv: 'expect(<key>).to.be.eql(getEnv("<val>"))',
                    ex: ' expect(<key>).not.to.be.undefined',
                    exnot: 'expect(<key>).to.be.undefined',
                    in: 'expect(<val>).to.include(<key>)',
                    cont: 'expect(<key>).to.include("<val>")',
                    contnot: 'expect(<key>).not.to.include("<val>")',
                    gt: 'expect(<key>).to.be.gt(<val>)',
                    gte: 'expect(<key>).to.be.gte(<val>)',
                    lt: 'expect(<key>).to.be.lt(<val>)',
                    lte: 'expect(<key>).to.be.lte(<val>)',
                    env: 'setEnv("<val>", <key>)',
                    is: 'expect(<key>).to.be.a(\'<val>\')',
                    isDate: 'expect(<key>).to.be.a.date'
                }
                scope.flags = {
                    type: 'eq',
                    saved: true
                };
                scope.tests = {};
                scope.testError;
                scope.data = {
                    input: '',
                    radio: {
                        eq: 'val', //val,body,header
                        eqX: 'string', //number, boolean
                        ex: 'ex', //ex, exnot
                        is: 'string', //string, number, boolean, Array, object
                        cont: 'cont', //cont, contnot
                        gt: 'gt', //gt, gte
                        lt: 'lt', //lt, lte
                        in: 'in',
                        env: 'env'
                    }
                }
                if (typeof scope.cfg.data.val != 'object') scope.data.input = scope.cfg.data.val;
                scope.getKey = getKey;
                function getKey(key) {
                    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
                        return '.' + key;
                    } else {
                        return '["' + key + '"]';
                    }
                }
                scope.addTest = function () {
                    scope.flags.saved = false;
                    var fld = scope.cfg.data.parent + getKey(scope.cfg.data.key);
                    var op = ops[scope.data.radio[scope.flags.type]];
                    var test = '';
                    var tStr = '';
                    var inp = scope.data.input;
                    switch (scope.flags.type) {
                        case 'is':
                            if (scope.data.radio.is === 'date') {
                                op = ops.isDate;
                            } else {
                                op = ops.is;
                            }
                            op = op.replace('<key>', fld).replace('<val>', scope.data.radio.is)
                            break;
                        case 'in':
                            inp = JSON.stringify(scope.data.input.split(','));
                            op = op.replace('<key>', fld);
                            op = op.replace('<val>', inp);
                            break;
                        case 'eq':
                            op = op.replace('<key>', fld);
                            inp = scope.data.radio.eqX === 'string' ? ('"' + scope.data.input + '"') : scope.data.input;
                            if (scope.data.radio.eq === 'val') {
                                op = op.replace('<val>', inp);
                            } if (scope.data.radio.eq === 'eqenv') {
                                inp = 'env varaible ' + inp;
                                op = op.replace('<val>', scope.data.input);
                            } else if (scope.data.radio.eq === 'body') {
                                inp = inp + ' field in body';
                                op = op.replace('<val>', getKey(scope.data.input));
                            } else if (scope.data.radio.eq === 'header') {
                                inp = inp + ' field in header';
                                op = op.replace('<val>', getKey(scope.data.input));
                            }
                        default:
                            op = op.replace('<key>', fld);
                            op = op.replace('<val>', scope.data.input);
                    }
                    test = 'apic.test(\'<test>\', function(){\n\t' + op + ';\n})';


                    //set the test String
                    var tInp = (typeof inp === 'string') ? inp.replace(/\n/g, '') : inp;
                    switch (scope.flags.type) {
                        case 'eq':
                            tStr = fld + ' should be equal to ' + tInp;
                            break;
                        case 'ex':
                            tStr = fld + ' should ' + (scope.data.radio['ex'] === 'ex' ? ' ' : 'not ') + 'exist in response';
                            break;
                        case 'is':
                            tStr = fld + ' should be a(n) ' + scope.data.radio['is'];
                            break;
                        case 'cont':
                            tStr = fld + ' should ' + (scope.data.radio['cont'] === 'cont' ? ' ' : 'not ') + 'contain ' + scope.data.input;
                            break;
                        case 'in':
                            tStr = fld + ' should match to any one value from ' + (typeof inp !== 'string' ? JSON.stringify(tInp) : tInp);
                            break
                        case 'gt':
                            tStr = fld + ' should be greater than ' + (scope.data.radio['gt'] === 'gt' ? ' ' : 'or equals to ') + scope.data.input;
                            break;
                        case 'lt':
                            tStr = fld + ' should be lesser than ' + (scope.data.radio['lt'] === 'lt' ? ' ' : 'or equals to ') + scope.data.input;
                            break;
                        case 'env':
                            tStr = 'Store ' + fld + ' in an environment variable named ' + scope.data.input;
                            break;
                    }
                    test = test.replace('<test>', tStr);
                    scope.tests[tStr] = { v: test, status: null };
                }
                scope.copyToClipboard = function (text) {
                    $rootScope.copyToClipboard(text);
                }
                scope.save = function (saveReq) {
                    var tests = '';
                    Object.keys(scope.tests).forEach(function (k) {
                        tests += scope.tests[k].v + '\n';
                    })
                    scope.cfg.save(tests, saveReq);
                    scope.flags.saved = true;
                    scope.tests = {}
                }
                scope.delTest = function (k) {
                    delete scope.tests[k];
                }
                scope.runTests = function (test) {
                    var tests = '';
                    if (test) {
                        tests = test.v;
                    } else {
                        Object.keys(scope.tests).forEach(function (k) {
                            tests += scope.tests[k].v + '\n';
                        })
                    }
                    scope.cfg.req.tempTest = tests;
                    var listener = $rootScope.$on('messageReceived', function (event, args) {
                        listener();
                        args.data.tests.forEach(function (test) {
                            scope.tests[test.name].status = test.success;
                            scope.tests[test.name].error = test.reason;
                        })
                        Utils.updateInMemEnv(args.data.xtraEnv);
                        scope.testError = args.data.testError;
                        scope.$apply();
                    });
                    scope.testError = '';
                    var req = angular.copy(scope.cfg.req);
                    delete req.testError;
                    Tester.run({
                        type: 'tempTest',
                        req: req
                    })
                }
                //console.log(scope)
            }
        }
    }

    electronA.$inject = [];
    function electronA() {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                if (APP.TYPE === 'ELECTRON') {
                    element.on('click', function (event) {
                        event.preventDefault();
                        APP.electron.shell.openExternal(event.target.href);
                    });
                }
            }
        };
    }

})();