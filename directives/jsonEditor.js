/*global jsoneditor: false */
angular.module('RealizeApp')
    .directive('jsonEditor', [
        function() {
            'use strict';

            return {
                scope: {
                    json: '=jsonEditor'
                },
                link: function(scope, el) {
                    var editorStamp = new Date().getTime(),
                        editor;
                    var change = function() {
                        scope.$apply(function() {
                            // don't tweak the whole reference, update the obj
                            angular.extend(scope.json, editor.get());
                        });
                    };

                    editor = new jsoneditor.JSONEditor(el[0], {mode: 'form', name: 'Realize Copy', change: change});

                    // this watch purposefully not on property changes
                    scope.$watch('json', function(json) {
                        if (!json || Object.keys(json).length === 0) { return; }

                        // only update the object if it's a 'new' reference
                        if (Object.keys(json).length > 0 && json.$$jsonEditor !== editorStamp) {
                            // need this to not be enumerable so it doesn't end up in editor
                            Object.defineProperty(json, '$$jsonEditor', {value: editorStamp});
                            editor.set(json);
                        }

                    }, true);
                }
            };
        }
    ]);
